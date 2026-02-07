
import React, { useState, useMemo } from 'react';
import { usePayroll } from '../../context/PayrollContext';
import { useCompany } from '../../context/CompanyContext';
import { DailyAttendance, AttendanceStatus, Employee } from '../../types';
import { triggerStandalonePrint } from '../../utils/printService';
import * as XLSX from 'xlsx';

const DetailedAttendance: React.FC = () => {
  const { employees, dailyAttendance, updateDailyAttendance, holidays } = usePayroll();
  const { activeCompany } = useCompany();
  
  const [selectedMonth, setSelectedMonth] = useState('January');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ empCode: string; date: string } | null>(null);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const daysInMonth = useMemo(() => {
    const monthIndex = months.indexOf(selectedMonth);
    return new Date(selectedYear, monthIndex + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const [editData, setEditData] = useState<Partial<DailyAttendance>>({});

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      e.status === 'ACTIVE' && 
      (!employeeSearch || e.name.toLowerCase().includes(employeeSearch.toLowerCase()))
    );
  }, [employees, employeeSearch]);

  const getAttendanceStatus = (emp: Employee, day: number) => {
    const monthIndex = months.indexOf(selectedMonth) + 1;
    const dateStr = `${selectedYear}-${monthIndex.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const att = dailyAttendance.find(a => a.empCode === emp.id && a.date === dateStr);
    const isHoliday = holidays.some(h => h.date === dateStr);
    
    let char = '-';
    let isLate = false;

    if (att) {
      char = att.status === AttendanceStatus.PRESENT ? 'P' : 
             att.status === AttendanceStatus.ABSENT ? 'A' : 
             att.status === AttendanceStatus.WEEK_OFF ? 'W' : 
             att.status === AttendanceStatus.HOLIDAY ? 'H' : 
             att.status === AttendanceStatus.HALF_DAY ? '½' : '-';
      
      if (att.status === AttendanceStatus.PRESENT && att.inTime && att.inTime !== '00:00' && att.inTime !== 'NS' && emp.markLateTime) {
        const [inH, inM] = att.inTime.split(':').map(Number);
        const [limH, limM] = emp.markLateTime.split(':').map(Number);
        if ((inH * 60 + inM) > (limH * 60 + limM)) {
          isLate = true;
        }
      }
    } else if (isHoliday) {
      char = 'H';
    }

    return { char, isLate, dateStr, att, isHoliday };
  };

  const handleExportExcel = () => {
    const exportData = filteredEmployees.map(emp => {
      const row: any = { 'Employee Name': emp.name, 'Emp ID': emp.id };
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      daysArray.forEach(day => {
        const { char, isLate } = getAttendanceStatus(emp, day);
        row[day.toString()] = char;
        if (char === 'P') presentCount++;
        if (char === 'A') absentCount++;
        if (isLate) lateCount++;
      });

      row['Total Present'] = presentCount;
      row['Total Absent'] = absentCount;
      row['Total Late'] = lateCount;
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance_Log");
    XLSX.writeFile(workbook, `Attendance_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const handlePrint = () => {
    triggerStandalonePrint('attendance-printable-area', `Attendance_Report_${selectedMonth}_${selectedYear}`, 'landscape');
  };

  const handleCellClick = (empCode: string, day: number) => {
    if (!activeCompany) return;
    const monthIndex = months.indexOf(selectedMonth) + 1;
    const dateStr = `${selectedYear}-${monthIndex.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const existing = dailyAttendance.find(a => a.empCode === empCode && a.date === dateStr);
    
    setEditData(existing || {
      id: `ATT-${empCode}-${dateStr}`,
      companyId: activeCompany.id,
      empCode,
      date: dateStr,
      month: selectedMonth,
      year: selectedYear,
      inTime: '00:00',
      outTime: '00:00',
      lateBy: '00:00',
      status: AttendanceStatus.ABSENT,
      manualOverride: true
    });
    setEditingCell({ empCode, date: dateStr });
  };

  const handleSaveEdit = () => {
    if (editingCell && editData) {
      updateDailyAttendance(editData as DailyAttendance);
      setEditingCell(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-6 no-print">
        <div className="flex flex-wrap gap-4 flex-1">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">View Period</label>
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
          <div className="space-y-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filter Employee</label>
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={employeeSearch} 
              onChange={e => setEmployeeSearch(e.target.value)}
              className="w-full bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={handleExportExcel}
             className="px-5 py-3 bg-white text-emerald-600 border border-emerald-100 font-black text-[10px] uppercase rounded-xl hover:bg-emerald-50 transition-all flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
             Export XLS
           </button>
           <button 
             onClick={handlePrint}
             className="px-5 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
             Print Report
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
          <table className="w-full text-[11px] border-collapse min-w-[1400px]">
            <thead className="bg-slate-50 font-black text-slate-500 uppercase tracking-tighter border-b border-slate-200">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 px-6 py-4 border-r w-48 shadow-[2px_0_5_rgba(0,0,0,0.05)] text-left">Employee</th>
                {daysArray.map(day => (
                  <th key={day} className="px-1 py-4 border-r border-slate-100 text-center min-w-[38px]">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest">
                    No active employees found matching filters
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-6 py-3 border-r border-slate-200 font-black text-slate-700 uppercase truncate shadow-[2px_0_5_rgba(0,0,0,0.02)] min-w-[192px]">
                      {emp.name}
                    </td>
                    {daysArray.map(day => {
                      const { char, isLate, att, isHoliday } = getAttendanceStatus(emp, day);
                      
                      // Visual styling application
                      let cellStyle = 'text-slate-300';
                      if (char === 'P') {
                        if (isLate) {
                          cellStyle = 'bg-yellow-400 font-black shadow-inner ring-1 ring-inset ring-yellow-500/20 text-rose-700';
                        } else {
                          cellStyle = 'text-emerald-600 font-bold';
                        }
                      } else if (char === 'A') {
                        cellStyle = 'bg-rose-500 text-white font-black';
                      } else if (char === 'W') {
                        cellStyle = 'bg-indigo-50 text-indigo-700 font-black';
                      } else if (char === 'H') {
                        cellStyle = 'bg-amber-100 text-amber-700 font-black';
                      } else if (char === '½') {
                        cellStyle = 'bg-orange-400 text-white font-black';
                      }

                      return (
                        <td 
                          key={day} 
                          onClick={() => handleCellClick(emp.id, day)}
                          className={`border-r border-slate-100 text-center cursor-pointer transition-all hover:opacity-80 relative ${cellStyle} text-[11px] h-10 w-10 min-w-[38px]`}
                          title={isLate ? `Late (In: ${att?.inTime}, Rule: ${emp.markLateTime})` : isHoliday ? 'Holiday' : ''}
                        >
                          <span className="relative z-10">{char}</span>
                          {att?.manualOverride && (
                            <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full shadow-sm bg-indigo-600" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Printable Area */}
      <div id="attendance-printable-area" className="hidden">
         <div className="p-4" style={{ width: '100%' }}>
            <div style={{ borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', margin: '0' }}>Detailed Attendance Registry</h1>
              <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', margin: '5px 0 0 0' }}>Period: {selectedMonth} {selectedYear}</p>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
               <thead>
                  <tr style={{ background: '#f8fafc', fontWeight: '900', textTransform: 'uppercase' }}>
                     <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'left', width: '100px' }}>Employee</th>
                     {daysArray.map(day => (
                        <th key={day} style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{day}</th>
                     ))}
                     <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center', background: '#ecfdf5', color: '#059669', width: '20px' }}>P</th>
                     <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center', background: '#fef2f2', color: '#dc2626', width: '20px' }}>A</th>
                     <th style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center', background: '#fffbeb', color: '#d97706', width: '20px' }}>L</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredEmployees.map(emp => {
                     let p = 0, a = 0, l = 0;
                     return (
                        <tr key={emp.id}>
                           <td style={{ padding: '4px', border: '1px solid #cbd5e1', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</td>
                           {daysArray.map(day => {
                              const { char, isLate } = getAttendanceStatus(emp, day);
                              if (char === 'P') p++;
                              if (char === 'A') a++;
                              if (isLate) l++;
                              
                              let bg = 'transparent';
                              let color = '#475569';
                              if (isLate) { bg = '#fef9c3'; color = '#b45309'; }
                              else if (char === 'A') { bg = '#fee2e2'; color = '#b91c1c'; }
                              else if (char === 'W') { bg = '#eef2ff'; color = '#4338ca'; }
                              else if (char === 'H') { bg = '#fff7ed'; color = '#c2410c'; }
                              else if (char === 'P') { color = '#059669'; }

                              return (
                                 <td key={day} style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '800', backgroundColor: bg, color: color }}>
                                    {char}
                                 </td>
                              );
                           })}
                           <td style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '900', color: '#059669', background: '#f0fdf4' }}>{p}</td>
                           <td style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '900', color: '#dc2626', background: '#fef2f2' }}>{a}</td>
                           <td style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '900', color: '#d97706', background: '#fffbeb' }}>{l}</td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>

            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
               <div style={{ textAlign: 'center', width: '200px', paddingTop: '10px', borderTop: '1px solid #000' }}>
                  <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', margin: '0' }}>Registry Auditor</p>
               </div>
               <div style={{ textAlign: 'center', width: '200px', paddingTop: '10px', borderTop: '1px solid #000' }}>
                  <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', margin: '0' }}>HR Signatory</p>
               </div>
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'center', opacity: '0.5' }}>
               <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px' }}>Generated via NexusERP Intelligence Platform</p>
            </div>
         </div>
      </div>

      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-8 py-5 border-b bg-indigo-600 text-white flex items-center justify-between">
                 <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Modify Attendance</h2>
                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Date: {editingCell.date}</p>
                 </div>
                 <button onClick={() => setEditingCell(null)} className="text-white/50 hover:text-white transition-colors">
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</label>
                       <select 
                         value={editData.status} 
                         onChange={e => setEditData({...editData, status: e.target.value as AttendanceStatus})}
                         className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                       >
                         {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">In Time</label>
                       <input 
                         type="time" 
                         value={editData.inTime} 
                         onChange={e => setEditData({...editData, inTime: e.target.value})}
                         className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Out Time</label>
                       <input 
                         type="time" 
                         value={editData.outTime} 
                         onChange={e => setEditData({...editData, outTime: e.target.value})}
                         className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                       />
                    </div>
                 </div>
                 <button 
                   onClick={handleSaveEdit}
                   className="w-full py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
                 >
                   Apply Manual Override
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DetailedAttendance;
