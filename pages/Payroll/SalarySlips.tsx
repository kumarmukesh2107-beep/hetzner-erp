
import React, { useState } from 'react';
import { usePayroll } from '../../context/PayrollContext';
import { PayrollRecord } from '../../types';

const SalarySlips: React.FC = () => {
  const { payrollHistory } = usePayroll();
  const [selectedSlip, setSelectedSlip] = useState<PayrollRecord | null>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
              background: white !important;
            }
            #slip-content, #slip-content * {
              visibility: visible !important;
            }
            #slip-content {
              display: block !important;
              position: absolute;
              left: 0; top: 0;
              width: 100%;
              margin: 0;
              padding: 40px !important;
              border: none !important;
              background: white !important;
            }
            .print-hidden, header, aside, button, .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Generated Slips</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Verified payroll records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Employee Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Month/Year</th>
                <th className="px-4 py-4 text-center">Net Absent</th>
                <th className="px-6 py-4 text-right">Net Salary</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No salary slips generated yet. Process payroll first.</td>
                </tr>
              ) : (
                payrollHistory.map(rec => {
                  const netAbsent = Math.max(0, rec.absent - rec.weekOff);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500">{rec.empCode}</td>
                      <td className="px-6 py-4 font-black text-slate-900 uppercase">{rec.name}</td>
                      <td className="px-6 py-4 font-bold text-slate-500 uppercase">{rec.month} {rec.year}</td>
                      <td className="px-4 py-4 text-center font-bold text-red-500">{netAbsent}</td>
                      <td className="px-6 py-4 text-right font-black text-indigo-600 tracking-tighter">₹{rec.netSalary.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedSlip(rec)} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-xl uppercase hover:bg-indigo-100 transition-colors">View Slip</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden max-h-[95vh] flex flex-col scale-in">
            <div className="px-8 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Salary Slip Preview</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrint} 
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Print / PDF
                </button>
                <button 
                  onClick={() => setSelectedSlip(null)} 
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            <div className="p-12 overflow-y-auto bg-white flex-1" id="slip-content">
              <div className="text-center border-b-2 border-indigo-600 pb-8 mb-10">
                <h1 className="text-3xl font-black text-indigo-600 tracking-tighter uppercase leading-none">NEXUS ENTERPRISE</h1>
                <p className="text-[10px] text-slate-500 font-black mt-2 tracking-[0.2em] uppercase">SALARY SLIP - {selectedSlip.month.toUpperCase()} {selectedSlip.year}</p>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="grid grid-cols-2 gap-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Code</p>
                    <p className="text-sm font-black text-slate-800 font-mono">{selectedSlip.empCode}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Name</p>
                    <p className="text-sm font-black text-slate-800 uppercase">{selectedSlip.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Present Days</p>
                    <p className="text-sm font-black text-emerald-600">{selectedSlip.present}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Week Off</p>
                    <p className="text-sm font-black text-slate-600">{selectedSlip.weekOff}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leave Balance</p>
                    <p className="text-sm font-black text-indigo-600">{selectedSlip.leaveBalance}</p>
                  </div>
                </div>
                <div className="space-y-4 text-right">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 inline-block text-left min-w-[180px]">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pay Period</p>
                      <p className="text-lg font-black text-slate-800 uppercase leading-none">{selectedSlip.month} {selectedSlip.year}</p>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-16">
                 <div>
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b-2 border-indigo-50 mb-6 pb-2">Earnings Structure</h4>
                    <div className="space-y-4">
                       <div className="flex justify-between text-xs font-bold text-slate-700"><span>Basic Salary</span><span className="font-black">₹{selectedSlip.basicSalary.toLocaleString()}</span></div>
                       <div className="flex justify-between text-xs font-bold text-slate-700"><span>Extra Paid Days ({selectedSlip.extraPaidDays} days)</span><span className="text-indigo-600">+₹{Math.round(selectedSlip.extraPaidDays * (selectedSlip.basicSalary/30)).toLocaleString()}</span></div>
                       <div className="flex justify-between text-xs font-bold text-slate-700"><span>Performance Incentives</span><span>₹{selectedSlip.incentive.toLocaleString()}</span></div>
                       <div className="flex justify-between text-xs font-bold text-slate-700"><span>Conveyance Allowance</span><span>₹{selectedSlip.conveyance.toLocaleString()}</span></div>
                       <div className="pt-4 border-t border-slate-100 flex justify-between text-sm font-black text-slate-900"><span>Gross Earnings</span><span>₹{selectedSlip.grossSalary.toLocaleString()}</span></div>
                    </div>
                 </div>

                 <div>
                    <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest border-b-2 border-rose-50 mb-6 pb-2">Deductions & Penalties</h4>
                    <div className="space-y-4">
                       <div className="flex justify-between text-xs font-bold text-slate-700">
                         <span>Absent Deduction ({Math.max(0, selectedSlip.absent - selectedSlip.weekOff)} days)</span>
                         <span className="text-rose-600">-₹{Math.round(Math.max(0, selectedSlip.absent - selectedSlip.weekOff) * (selectedSlip.basicSalary/30)).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold text-slate-700"><span>Late Deduction ({selectedSlip.lateDeductionDays} days)</span><span className="text-rose-600">-₹{Math.round(selectedSlip.lateDeductionDays * (selectedSlip.basicSalary/30)).toLocaleString()}</span></div>
                       
                       <div className="pt-4 border-t border-slate-100 mt-2 space-y-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Compliance Fines</p>
                          <div className="flex justify-between text-xs font-bold text-slate-700"><span>CRM Penalty</span><span>-₹{selectedSlip.penaltyCRM.toLocaleString()}</span></div>
                          <div className="flex justify-between text-xs font-bold text-slate-700"><span>Superfone Penalty</span><span>-₹{selectedSlip.penaltySuperfone.toLocaleString()}</span></div>
                          <div className="flex justify-between text-xs font-bold text-slate-700"><span>Without Dress Penalty</span><span>-₹{selectedSlip.penaltyDress.toLocaleString()}</span></div>
                          <div className="flex justify-between text-xs font-bold text-slate-700"><span>Adjustment Adj. (+/-)</span><span>₹{selectedSlip.manualAdjustment.toLocaleString()}</span></div>
                       </div>
                       
                       <div className="pt-4 border-t border-slate-100 flex justify-between text-sm font-black text-rose-600"><span>Total Reductions</span><span>-₹{selectedSlip.totalDeduction.toLocaleString()}</span></div>
                    </div>
                 </div>
              </div>

              <div className="mt-16 bg-slate-950 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Net Disbursal Amount</span>
                  <span className="text-5xl font-black tracking-tighter">₹{selectedSlip.netSalary.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/10 relative z-10">
                  <div className="flex justify-between text-[11px] font-black text-indigo-300 uppercase tracking-widest"><span>Bank Transfer</span><span>₹{selectedSlip.bankAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[11px] font-black text-indigo-300 uppercase tracking-widest"><span>Other / PDC</span><span>₹{selectedSlip.pdcAmount.toLocaleString()}</span></div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              </div>

              {selectedSlip.remarks && (
                <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Audit Remarks</p>
                   <p className="text-xs text-slate-700 font-medium italic">"{selectedSlip.remarks}"</p>
                </div>
              )}

              <div className="mt-20 flex justify-between">
                <div className="text-center w-64 pt-6 border-t-2 border-slate-100">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Authorized Signatory</p>
                  <p className="text-[8px] text-slate-300 mt-1 uppercase">Nexus Enterprise HQ</p>
                </div>
                <div className="text-center w-64 pt-6 border-t-2 border-slate-100">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee Acknowledgement</p>
                  <p className="text-[8px] text-slate-300 mt-1 uppercase">{selectedSlip.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalarySlips;
