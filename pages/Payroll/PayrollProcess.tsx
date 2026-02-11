
import React, { useState, useRef, useMemo } from 'react';
import { usePayroll } from '../../context/PayrollContext';
import { GoogleGenAI, Type } from '@google/genai';
import { Employee, PayrollRecord } from '../../types';
import * as XLSX from 'xlsx';

const PayrollProcess: React.FC = () => {
  const { payrollHistory, processBiometricData, employees, savePayrollRecord, getEmployeeByCodeOrName } = usePayroll();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedMonth, setSelectedMonth] = useState('January');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [isUploading, setIsUploading] = useState(false);
  const [showManualModal, setShowManualModal] = useState<Employee | null>(null);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const geminiApiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_API_KEY ||
    '';

  const mapMonthName = (extracted: string): string => {
    const monthMap: Record<string, string> = {
      'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April', 'MAY': 'May', 'JUN': 'June',
      'JUL': 'July', 'AUG': 'August', 'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
    };
    const clean = extracted.toUpperCase().substring(0, 3);
    return monthMap[clean] || extracted;
  };

  const getWeekOffCount = (monthName: string, year: number, dayName: string) => {
    const monthIndex = months.indexOf(monthName);
    const dayIndexMap: Record<string, number> = {
      'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
    };
    const targetDay = dayIndexMap[dayName.toUpperCase()];
    if (targetDay === undefined) return 4;
    
    let count = 0;
    const date = new Date(year, monthIndex, 1);
    while (date.getMonth() === monthIndex) {
      if (date.getDay() === targetDay) count++;
      date.setDate(date.getDate() + 1);
    }
    return count;
  };

  const displayRecords = useMemo(() => {
    return employees.filter(e => e.status === 'ACTIVE').map(emp => {
      const existing = payrollHistory.find(p => p.empCode === emp.id && p.month === selectedMonth && p.year === selectedYear);
      return {
        employee: emp,
        record: existing || null
      };
    });
  }, [employees, payrollHistory, selectedMonth, selectedYear]);

  const [manualData, setManualData] = useState({
    present: 26,
    totalAbsent: 0,
    lateCount: 0,
    weekOff: 4,
    extraPaidDays: 0,
    incentive: 0,
    conveyance: 0,
    penaltySuperfone: 0,
    penaltyDress: 0,
    penaltyCRM: 0,
    manualAdjustment: 0,
    leaveBalance: 0,
    remarks: ''
  });

  const handleExportLedger = () => {
    const exportData = displayRecords.map(({ employee, record }) => ({
      'Employee Code': employee.id,
      'Name': employee.name,
      'Month': selectedMonth,
      'Year': selectedYear,
      'Present': record?.present || 0,
      'Absent': record?.absent || 0,
      'Late Count': record?.lateCount || 0,
      'Extra Days': record?.extraPaidDays || 0,
      'Leave Balance': record?.leaveBalance || 0,
      'Gross Salary': record?.grossSalary || 0,
      'Total Deductions': record?.totalDeduction || 0,
      'Net Payable': record?.netSalary || 0,
      'Bank Disbursal': record?.bankAmount || 0,
      'PDC / Other': record?.pdcAmount || 0,
      'Source': record?.isManualOverride ? 'Manual' : 'Biometric',
      'Remarks': record?.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll_Ledger");
    XLSX.writeFile(workbook, `Payroll_Ledger_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const resolveMimeType = () => {
      if (file.type) return file.type;
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.pdf')) return 'application/pdf';
      if (lowerName.endsWith('.png')) return 'image/png';
      if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
      if (lowerName.endsWith('.webp')) return 'image/webp';
      return 'application/pdf';
    };

    try {
      const mimeType = resolveMimeType();
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => {
          const bytes = new Uint8Array(reader.result as ArrayBuffer);
          let binary = '';
          bytes.forEach(byte => {
            binary += String.fromCharCode(byte);
          });
          resolve(btoa(binary));
        };
        reader.onerror = () => reject(new Error('Failed to read uploaded file.'));
      });

      if (!geminiApiKey) {
        throw new Error('Missing Gemini API key. Configure GEMINI_API_KEY (or API_KEY / VITE_GEMINI_API_KEY) in deployment environment.');
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: `CRITICAL EXTRACTION RULES:
              1. Identify the Report Month and Year.
              2. Extract ALL employees. For each, identify Code, Name, Total Present, Total Absent.
              3. Extract DAY-WISE Logs. IMPORTANT: The "date" field in dailyEntries MUST be in "YYYY-MM-DD" format based on the report period.
              4. For each daily log, extract Status (P/A/WO/H) and In Time (HH:mm).
              5. This input can be PDF or image; extract from tabular attendance/biometric data exactly.` }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedMonth: { type: Type.STRING },
              detectedYear: { type: Type.NUMBER },
              employees: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    empCode: { type: Type.STRING },
                    name: { type: Type.STRING },
                    present: { type: Type.NUMBER },
                    absent: { type: Type.NUMBER },
                    dailyEntries: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          date: { type: Type.STRING, description: "Formatted as YYYY-MM-DD" },
                          status: { type: Type.STRING },
                          inTime: { type: Type.STRING }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (!Array.isArray(result.employees)) {
        throw new Error('No employee records could be extracted from the uploaded report.');
      }

      const finalMonth = mapMonthName(result.detectedMonth || selectedMonth);
      const finalYear = result.detectedYear || selectedYear;

      setSelectedMonth(finalMonth);
      setSelectedYear(finalYear);

      processBiometricData(finalMonth, finalYear, result.employees || []);
      alert(`Successfully scanned ${result.employees?.length || 0} employee records for ${finalMonth} ${finalYear}.`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'AI processing failed.';
      alert(`Biometric report processing failed: ${message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showManualModal) return;

    const emp = showManualModal;
    const workingDaysInMonth = 30;
    const perDaySalary = emp.monthlySalary / workingDaysInMonth;

    const lateDeductionDays = manualData.lateCount <= 2 ? 0 : (manualData.lateCount - 2) * 0.5;
    const netAbsentDays = Math.max(0, manualData.totalAbsent - manualData.weekOff);
    const totalDeductionDays = netAbsentDays + lateDeductionDays;
    const attendanceDeduction = Math.round(totalDeductionDays * perDaySalary);
    
    const extraDaysEarnings = Math.round(manualData.extraPaidDays * perDaySalary);
    const grossSalary = Math.round(emp.monthlySalary + manualData.incentive + manualData.conveyance + extraDaysEarnings);
    const totalDeduction = attendanceDeduction + manualData.penaltyCRM + manualData.penaltySuperfone + manualData.penaltyDress + manualData.manualAdjustment;
    const netSalary = grossSalary - totalDeduction;

    const bankCap = emp.bankLimit || 0;
    const bankAmount = Math.min(netSalary, Math.max(0, bankCap));
    const pdcAmount = netSalary - bankAmount;

    const record: PayrollRecord = {
      id: `PR-${emp.id}-${selectedMonth}-${selectedYear}`,
      companyId: emp.companyId,
      empCode: emp.id,
      name: emp.name,
      month: selectedMonth,
      year: selectedYear,
      present: manualData.present,
      absent: manualData.totalAbsent,
      halfDays: 0,
      lateCount: manualData.lateCount,
      lateDeductionDays,
      holidays: 0,
      weekOff: manualData.weekOff,
      sandwichLeave: 0,
      extraPaidDays: manualData.extraPaidDays,
      basicSalary: emp.monthlySalary,
      incentive: manualData.incentive,
      conveyance: manualData.conveyance,
      grossSalary,
      attendanceDeduction,
      penaltySuperfone: manualData.penaltySuperfone,
      penaltyDress: manualData.penaltyDress,
      penaltyCRM: manualData.penaltyCRM,
      manualAdjustment: manualData.manualAdjustment,
      totalDeduction,
      netSalary,
      bankAmount,
      pdcAmount,
      status: 'UNPAID',
      processedAt: new Date().toISOString(),
      isManualOverride: true,
      leaveBalance: manualData.leaveBalance,
      remarks: manualData.remarks
    };

    savePayrollRecord(record);
    setShowManualModal(null);
  };

  const startManualEntry = (emp: Employee, existing: PayrollRecord | null) => {
    const calculatedWeekOff = getWeekOffCount(selectedMonth, selectedYear, emp.weekOffDay);
    if (existing) {
      setManualData({
        present: existing.present,
        totalAbsent: existing.absent,
        lateCount: existing.lateCount,
        weekOff: existing.weekOff || calculatedWeekOff,
        extraPaidDays: existing.extraPaidDays || 0,
        incentive: existing.incentive,
        conveyance: existing.conveyance || 0,
        penaltySuperfone: existing.penaltySuperfone,
        penaltyDress: existing.penaltyDress,
        penaltyCRM: existing.penaltyCRM,
        manualAdjustment: existing.manualAdjustment,
        leaveBalance: existing.leaveBalance || 0,
        remarks: existing.remarks || ''
      });
    } else {
      setManualData({ present: 26, totalAbsent: 0, lateCount: 0, weekOff: calculatedWeekOff, extraPaidDays: 0, incentive: 0, conveyance: 0, penaltySuperfone: 0, penaltyDress: 0, penaltyCRM: 0, manualAdjustment: 0, leaveBalance: 0, remarks: '' });
    }
    setShowManualModal(emp);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-wrap items-end justify-between gap-6">
        <div className="flex gap-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Period</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={handleExportLedger}
             className="px-6 py-3 bg-white text-emerald-600 border border-emerald-100 font-black text-[10px] uppercase rounded-xl hover:bg-emerald-50 transition-all flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
             Export Ledger
           </button>
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" className="hidden" />
           <button 
             onClick={() => fileInputRef.current?.click()}
             disabled={isUploading}
             className={`px-6 py-3 font-black text-[10px] uppercase rounded-xl shadow-lg flex items-center gap-3 transition-all ${
               isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
             }`}
           >
             {isUploading ? 'SCANNING...' : 'UPLOAD BIOMETRIC PDF'}
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
           <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Attendance & Salary Ledger</h3>
           <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-[9px] font-black rounded-full uppercase">
             {displayRecords.filter(r => r.record).length} / {displayRecords.length} PROCESSED
           </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest border-b">
              <tr>
                <th className="px-8 py-5">Employee</th>
                <th className="px-4 py-5 text-center">Week Off</th>
                <th className="px-4 py-5 text-center">P / A</th>
                <th className="px-4 py-5 text-center">Late</th>
                <th className="px-4 py-5 text-right">Gross</th>
                <th className="px-4 py-5 text-right">Deductions</th>
                <th className="px-4 py-5 text-right text-indigo-600">Bank Trf.</th>
                <th className="px-4 py-5 text-right text-amber-600">PDC / Other</th>
                <th className="px-6 py-5 text-right bg-slate-100/50">Net Payable</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRecords.map(({ employee, record }) => {
                const calculatedWeekOff = record?.weekOff || getWeekOffCount(selectedMonth, selectedYear, employee.weekOffDay);
                const displayAbsent = record ? Math.max(0, record.absent - calculatedWeekOff) : '-';
                
                return (
                  <tr key={employee.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-4">
                       <p className="font-black text-slate-800 uppercase leading-none">{employee.name}</p>
                       <p className="text-[9px] text-slate-400 font-mono mt-1 uppercase">ID: {employee.id}</p>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-slate-500">{calculatedWeekOff}</td>
                    <td className="px-4 py-4 text-center">
                       <span className="font-bold text-emerald-600">{record?.present ?? '-'}</span>
                       <span className="text-slate-300 mx-1">/</span>
                       <span className="font-bold text-rose-500">{displayAbsent}</span>
                    </td>
                    <td className="px-4 py-4 text-center font-black text-orange-500">{record?.lateCount ?? '-'}</td>
                    <td className="px-4 py-4 text-right font-bold text-slate-900">₹{record?.grossSalary.toLocaleString() ?? '-'}</td>
                    <td className="px-4 py-4 text-right font-bold text-rose-500">{record ? `₹${record.totalDeduction.toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-4 text-right font-black text-indigo-600">₹{record?.bankAmount.toLocaleString() ?? '-'}</td>
                    <td className="px-4 py-4 text-right font-black text-amber-600">₹{record?.pdcAmount.toLocaleString() ?? '-'}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 text-[13px] bg-slate-100/30">
                      {record ? `₹${record.netSalary.toLocaleString()}` : '₹' + employee.monthlySalary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => startManualEntry(employee, record)} className="text-indigo-600 font-black text-[10px] uppercase hover:underline">
                         {record ? 'Edit' : 'Add Data'}
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-10 py-6 border-b bg-indigo-600 text-white flex items-center justify-between">
                 <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Manual Attendance Entry</h2>
                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">{showManualModal.name} • {selectedMonth} {selectedYear}</p>
                 </div>
                 <button onClick={() => setShowManualModal(null)} className="text-white/50 hover:text-white transition-colors">
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <form onSubmit={handleManualSave} className="p-10 space-y-8">
                 <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-1"><label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Present</label><input required type="number" value={manualData.present} onChange={e => setManualData({...manualData, present: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-black text-xs" /></div>
                    <div className="col-span-1"><label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Absent</label><input required type="number" value={manualData.totalAbsent} onChange={e => setManualData({...manualData, totalAbsent: Number(e.target.value)})} className="w-full px-3 py-2 bg-rose-50 border rounded-xl font-black text-xs text-rose-600" /></div>
                    <div className="col-span-1"><label className="block text-[9px] font-black text-slate-400 uppercase mb-1">WO</label><input required type="number" value={manualData.weekOff} onChange={e => setManualData({...manualData, weekOff: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-black text-xs" /></div>
                    <div className="col-span-1"><label className="block text-[9px] font-black text-indigo-500 uppercase mb-1">Extra</label><input required type="number" value={manualData.extraPaidDays} onChange={e => setManualData({...manualData, extraPaidDays: Number(e.target.value)})} className="w-full px-3 py-2 bg-indigo-50 border rounded-xl font-black text-xs text-indigo-600" /></div>
                    <div className="col-span-1"><label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Late</label><input required type="number" value={manualData.lateCount} onChange={e => setManualData({...manualData, lateCount: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-black text-xs text-orange-500" /></div>
                    <div className="col-span-1"><label className="block text-[9px] font-black text-indigo-500 uppercase mb-1">Leaves</label><input type="number" value={manualData.leaveBalance} onChange={e => setManualData({...manualData, leaveBalance: Number(e.target.value)})} className="w-full px-3 py-2 bg-indigo-50/50 border rounded-xl font-black text-xs" /></div>
                 </div>

                 <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-50 pb-1">Adjustments</h4>
                       <div className="grid grid-cols-2 gap-3">
                          <div><label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase">Incentive</label><input type="number" value={manualData.incentive} onChange={e => setManualData({...manualData, incentive: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs" /></div>
                          <div><label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase">Conveyance</label><input type="number" value={manualData.conveyance} onChange={e => setManualData({...manualData, conveyance: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs" /></div>
                          <div className="col-span-2"><label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase">Other (+/-)</label><input type="number" value={manualData.manualAdjustment} onChange={e => setManualData({...manualData, manualAdjustment: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs" /></div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest border-b border-rose-50 pb-1">Penalties</h4>
                       <div className="grid grid-cols-2 gap-3">
                          <div><label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase">CRM</label><input type="number" value={manualData.penaltyCRM} onChange={e => setManualData({...manualData, penaltyCRM: Number(e.target.value)})} className="w-full px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold" /></div>
                          <div><label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase">Phone</label><input type="number" value={manualData.penaltySuperfone} onChange={e => setManualData({...manualData, penaltySuperfone: Number(e.target.value)})} className="w-full px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold" /></div>
                          <div className="col-span-2"><label className="block text-[8px] font-bold text-rose-500 mb-1 uppercase">Dress Penalty</label><input type="number" value={manualData.penaltyDress} onChange={e => setManualData({...manualData, penaltyDress: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-rose-50 border-2 border-rose-100 rounded-xl font-black text-xs text-rose-600" /></div>
                       </div>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Manual Audit Remarks</label>
                    <textarea value={manualData.remarks} onChange={e => setManualData({...manualData, remarks: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl text-xs font-bold h-16 resize-none outline-none focus:ring-2 focus:ring-indigo-500" />
                 </div>

                 <div className="pt-8 border-t flex items-center justify-between">
                    <div className="text-left">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disbursal Breakup</p>
                       <div className="flex gap-4">
                          <div className="text-[11px] font-black text-indigo-600">BANK: ₹{Math.min(
                            Math.max(0, (showManualModal.bankLimit || 0)),
                            Math.max(0, showManualModal.monthlySalary + manualData.incentive + manualData.conveyance - manualData.penaltyCRM - manualData.penaltySuperfone - manualData.penaltyDress - manualData.manualAdjustment)
                          ).toLocaleString()}</div>
                          <div className="text-[11px] font-black text-amber-600">PDC: ₹{Math.max(0, Math.max(0, showManualModal.monthlySalary + manualData.incentive + manualData.conveyance - manualData.penaltyCRM - manualData.penaltySuperfone - manualData.penaltyDress - manualData.manualAdjustment) - Math.min(
                            Math.max(0, (showManualModal.bankLimit || 0)),
                            Math.max(0, showManualModal.monthlySalary + manualData.incentive + manualData.conveyance - manualData.penaltyCRM - manualData.penaltySuperfone - manualData.penaltyDress - manualData.manualAdjustment)
                          )).toLocaleString()}</div>
                       </div>
                    </div>
                    <button type="submit" className="px-12 py-4 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Save Payroll Entry</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default PayrollProcess;
