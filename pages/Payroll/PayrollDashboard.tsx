
import React, { useMemo } from 'react';
import { usePayroll } from '../../context/PayrollContext';

const PayrollDashboard: React.FC = () => {
  const { employees, payrollHistory } = usePayroll();

  const data = useMemo(() => {
    const activeStaff = employees.filter(e => e.status === 'ACTIVE').length;
    const totalDisbursed = payrollHistory.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.netSalary, 0);
    const pendingAmount = payrollHistory.filter(p => p.status === 'UNPAID').reduce((sum, p) => sum + p.netSalary, 0);

    const periods = payrollHistory.map(p => `${p.month} ${p.year}`);
    const latestPeriod = periods.length > 0 ? periods[0] : 'No Data';
    
    const latestMonthRecords = latestPeriod !== 'No Data' 
      ? payrollHistory.filter(p => `${p.month} ${p.year}` === latestPeriod)
      : [];

    const lateComers = latestMonthRecords.filter(r => r.lateCount > 0).sort((a, b) => b.lateCount - a.lateCount);
    
    // REVISED ABSENT FILTER: Only show in dashboard if Net Absent (Report - WeekOff) > 0
    const absentees = latestMonthRecords
      .filter(r => Math.max(0, r.absent - r.weekOff) > 0)
      .sort((a, b) => (b.absent - b.weekOff) - (a.absent - a.weekOff));

    const crmViolators = latestMonthRecords.filter(r => r.penaltyCRM > 0).sort((a, b) => b.penaltyCRM - a.penaltyCRM);
    const superfoneViolators = latestMonthRecords.filter(r => r.penaltySuperfone > 0).sort((a, b) => b.penaltySuperfone - a.penaltySuperfone);
    const dressViolators = latestMonthRecords.filter(r => r.penaltyDress > 0).sort((a, b) => b.penaltyDress - a.penaltyDress);

    return { 
      activeStaff, 
      totalDisbursed, 
      pendingAmount, 
      latestPeriod, 
      lateComers, 
      absentees, 
      crmViolators, 
      superfoneViolators, 
      dressViolators 
    };
  }, [employees, payrollHistory]);

  const deduplicatedAttendance = useMemo(() => {
    const combined = [...data.lateComers, ...data.absentees];
    const seen = new Set<string>();
    return combined.filter(rec => {
      if (seen.has(rec.id)) return false;
      seen.add(rec.id);
      return true;
    });
  }, [data.lateComers, data.absentees]);

  const deduplicatedViolations = useMemo(() => {
    const combined = [...data.crmViolators, ...data.superfoneViolators, ...data.dressViolators];
    const seen = new Set<string>();
    return combined.filter(rec => {
      if (seen.has(rec.id)) return false;
      seen.add(rec.id);
      return true;
    });
  }, [data.crmViolators, data.superfoneViolators, data.dressViolators]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Staff</h4>
          <p className="text-3xl font-black text-slate-900 mt-1">{data.activeStaff}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Disbursed (₹)</h4>
          <p className="text-3xl font-black text-slate-900 mt-1">{data.totalDisbursed.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending (₹)</h4>
          <p className="text-3xl font-black text-orange-600 mt-1">{data.pendingAmount.toLocaleString()}</p>
        </div>

        <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-100 text-white">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <h4 className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Current Audit</h4>
          <p className="text-xl font-black mt-1 uppercase">{data.latestPeriod}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Attendance Infringements</h3>
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">Exceptions</span>
          </div>
          <div className="p-0 overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase sticky top-0">
                <tr>
                  <th className="px-6 py-3">Employee Name</th>
                  <th className="px-6 py-3 text-center">Late Count</th>
                  <th className="px-6 py-3 text-center">Absent Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deduplicatedAttendance.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">No attendance exceptions found in {data.latestPeriod}.</td></tr>
                ) : (
                  deduplicatedAttendance.map(r => {
                    // COMPUTE NET ABSENT FOR DASHBOARD DISPLAY
                    const netAbsent = Math.max(0, r.absent - r.weekOff);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-bold text-slate-700">{r.name}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`font-bold ${r.lateCount > 2 ? 'text-red-500' : 'text-orange-500'}`}>
                            {r.lateCount}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center font-bold text-red-600">{netAbsent}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Compliance Penalties</h3>
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase">Fines</span>
          </div>
          <div className="p-0 overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase sticky top-0">
                <tr>
                  <th className="px-6 py-3">Employee Name</th>
                  <th className="px-6 py-3 text-right">CRM</th>
                  <th className="px-6 py-3 text-right">Superfone</th>
                  <th className="px-6 py-3 text-right">Dress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deduplicatedViolations.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Excellent compliance! No penalties recorded.</td></tr>
                ) : (
                   deduplicatedViolations.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-bold text-slate-700">{r.name}</td>
                      <td className="px-6 py-3 text-right text-red-500 font-bold">{r.penaltyCRM > 0 ? `₹${r.penaltyCRM}` : '-'}</td>
                      <td className="px-6 py-3 text-right text-red-500 font-bold">{r.penaltySuperfone > 0 ? `₹${r.penaltySuperfone}` : '-'}</td>
                      <td className="px-6 py-3 text-right text-red-500 font-bold">{r.penaltyDress > 0 ? `₹${r.penaltyDress}` : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-2xl text-white shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold flex items-center">
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
            Performance Insights ({data.latestPeriod})
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HR Intelligence Engine</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="space-y-2">
              <p className="text-xs text-slate-400">Punctuality Score</p>
              <div className="flex items-end gap-2">
                 <p className="text-4xl font-black">{Math.max(0, 100 - (data.lateComers.length * 5))}%</p>
                 <span className="text-[10px] text-emerald-400 mb-1 font-bold">+2% from last month</span>
              </div>
           </div>
           <div className="space-y-2">
              <p className="text-xs text-slate-400">Total Infringement Cost</p>
              <p className="text-4xl font-black text-red-400">₹{payrollHistory.reduce((sum, r) => sum + r.penaltyCRM + r.penaltyDress + r.penaltySuperfone, 0).toLocaleString()}</p>
           </div>
           <div className="space-y-2">
              <p className="text-xs text-slate-400">Most Reliable Period</p>
              <p className="text-xl font-bold uppercase tracking-tight">Week 3 of {data.latestPeriod}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
