
import React, { useMemo } from 'react';
import { useSales } from '../context/SalesContext';

const SalesLogsPage: React.FC = () => {
  const { salesLogs } = useSales();

  const stats = useMemo(() => {
    return {
      totalChanges: salesLogs.length,
      netValueShift: salesLogs.reduce((sum, log) => sum + log.delta, 0)
    };
  }, [salesLogs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-none">Financial Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-black text-[10px]">Real-time Ledger of Value Modifications</p>
        </div>
        
        <div className="flex gap-3">
           <div className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Value Shift</p>
              <p className={`text-sm font-black ${stats.netValueShift >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stats.netValueShift >= 0 ? '+' : ''}₹{stats.netValueShift.toLocaleString()}
              </p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-5">Event Time</th>
                <th className="px-6 py-5">Document / Client</th>
                <th className="px-6 py-5">Action Performed</th>
                <th className="px-6 py-5 text-right">Value Transition</th>
                <th className="px-6 py-5 text-right">Impact (Delta)</th>
                <th className="px-6 py-5 text-right">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20">
                       <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                       <p className="text-xl font-black uppercase tracking-tighter">No Modifications Recorded Yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                salesLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{new Date(log.timestamp).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-indigo-600 uppercase tracking-tighter leading-none">{log.orderNo}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 truncate w-40">{log.customerName}</p>
                    </td>
                    <td className="px-6 py-4">
                       <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight">
                        {log.action}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-slate-400 line-through">₹{log.oldTotal.toLocaleString()}</span>
                          <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                          <span className="text-sm font-black text-slate-900">₹{log.newTotal.toLocaleString()}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                         log.delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                       }`}>
                          {log.delta >= 0 ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                          )}
                          {log.delta >= 0 ? '+' : ''}₹{Math.abs(log.delta).toLocaleString()}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{log.performedBy}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
         <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div>
               <h3 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-2">Audit Compliance</h3>
               <p className="text-2xl font-black">100% Traceability</p>
               <p className="text-slate-400 text-xs mt-1">Every price change is signed by the active session user.</p>
            </div>
            <div className="md:col-span-2 flex justify-end gap-4">
               <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Modifications</p>
                  <p className="text-3xl font-black">{stats.totalChanges}</p>
               </div>
            </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
      </div>
    </div>
  );
};

export default SalesLogsPage;
