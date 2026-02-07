
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePurchase } from '../context/PurchaseContext';

const SupplierLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { suppliers, getSupplierLedger, getSupplierBalance } = usePurchase();
  
  const supplier = suppliers.find(s => s.id === id);
  const ledger = id ? getSupplierLedger(id) : [];
  const currentBalance = id ? getSupplierBalance(id) : 0;

  if (!supplier) {
    return <div className="p-8 text-center text-slate-500">Supplier not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/suppliers')} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supplier Ledger</h1>
          <p className="text-sm text-slate-500">{supplier.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Transaction History</h3>
            <button className="text-xs text-indigo-600 font-bold hover:underline">Download PDF</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Ref No</th>
                  <th className="px-6 py-3 text-right">Debit</th>
                  <th className="px-6 py-3 text-right">Credit</th>
                  <th className="px-6 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{row.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        row.type === 'Purchase' ? 'bg-indigo-50 text-indigo-600' : 
                        row.type === 'Payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{row.ref}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">{row.debit > 0 ? `$${row.debit.toFixed(2)}` : '-'}</td>
                    <td className="px-6 py-4 text-right text-indigo-600 font-medium">{row.credit > 0 ? `$${row.credit.toFixed(2)}` : '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">${row.balance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Account Summary</h4>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                <p className={`text-3xl font-black ${currentBalance > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                  ${currentBalance.toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-2 px-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Opening Balance</span>
                  <span className="font-semibold text-slate-700">${supplier.openingBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">GST Registration</span>
                  <span className="font-semibold text-slate-700">{supplier.gstNo}</span>
                </div>
              </div>

              <button className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-50 mt-4">
                Record Quick Payment
              </button>
            </div>
          </div>
          
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-200">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Details</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="p-2 bg-slate-800 rounded-lg mr-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{supplier.address}</p>
              </div>
              <div className="flex items-center">
                <div className="p-2 bg-slate-800 rounded-lg mr-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <p className="text-xs font-bold">{supplier.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierLedgerPage;
