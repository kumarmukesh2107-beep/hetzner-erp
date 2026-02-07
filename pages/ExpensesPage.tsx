
import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useContacts } from '../context/ContactContext';
import * as XLSX from 'xlsx';

const ExpensesPage: React.FC = () => {
  const { expenses, addExpense, accounts, expenseCategories, addExpenseCategory } = useAccounting();
  const { contacts } = useContacts();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expenses;
    const term = searchTerm.toLowerCase();
    return expenses.filter(e => e.category.toLowerCase().includes(term) || e.description.toLowerCase().includes(term));
  }, [expenses, searchTerm]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: expenseCategories[0] || 'MISC EXPENSES',
    description: '',
    amount: 0,
    accountId: 'cash-main',
    partyId: ''
  });

  const handleExportExcel = () => {
    const exportData = filteredExpenses.map(e => ({
      'Date': e.date,
      'Category': e.category,
      'Description': e.description,
      'Account': accounts.find(a => a.id === e.accountId)?.name,
      'Party': e.partyName || 'N/A',
      'Amount': e.amount
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, `Overhead_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0 || !formData.description.trim()) return alert('Please enter amount and description');
    
    const party = contacts.find(c => c.id === formData.partyId);
    
    addExpense({
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: formData.amount,
      accountId: formData.accountId,
      partyId: formData.partyId || undefined,
      partyName: party?.name
    });
    
    setShowForm(false);
    setFormData({ 
      date: new Date().toISOString().split('T')[0], 
      category: expenseCategories[0], 
      description: '', 
      amount: 0, 
      accountId: 'cash-main',
      partyId: ''
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #expenses-list, #expenses-list * { visibility: visible !important; }
          #expenses-list { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-none uppercase">Overhead Audit</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">Non-inventory operational expenditures.</p>
          </div>
          <div className="px-3 py-1 bg-rose-50 border border-rose-100 rounded-full">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{filteredExpenses.length} Records</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input type="text" placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block py-2 pl-9 pr-3 text-xs border border-slate-200 rounded-lg w-40 lg:w-56" />
          </div>

          <button onClick={handleExportExcel} className="p-2.5 bg-white border border-slate-200 text-emerald-600 rounded-lg hover:bg-emerald-50" title="Export Excel">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
          
          <button onClick={handlePrint} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50" title="Print/PDF">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>

          <button onClick={() => setShowForm(true)} className="px-6 py-2.5 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-700 shadow-lg">Record Expense</button>
        </div>
      </div>

      <div id="expenses-list" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
              <tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Head</th><th className="px-8 py-5">Party</th><th className="px-8 py-5">Narrative</th><th className="px-8 py-5">Account</th><th className="px-8 py-5 text-right">Value</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="px-8 py-5 text-slate-500 font-bold">{exp.date}</td>
                  <td className="px-8 py-5"><span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight">{exp.category}</span></td>
                  <td className="px-8 py-5 font-bold text-indigo-600 text-xs uppercase">{exp.partyName || '-'}</td>
                  <td className="px-8 py-5 font-black text-slate-800 text-xs uppercase">{exp.description}</td>
                  <td className="px-8 py-5 text-slate-400 font-bold text-[10px] uppercase">{accounts.find(a => a.id === exp.accountId)?.name}</td>
                  <td className="px-8 py-5 text-right font-black text-sm text-red-600">-₹{exp.amount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-5 border-b bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">New Expense Entry</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Date</label><input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold" /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Category</label>
                   <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-[11px] uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                      {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                   </select>
                </div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Account</label><select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
              </div>

              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Associated Party (Supplier/Customer)</label>
                 <select value={formData.partyId} onChange={e => setFormData({...formData, partyId: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">-- No Specific Party --</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                 </select>
              </div>

              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Narrative / Description</label>
                 <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What was this expense for?" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none" />
              </div>

              <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Amount (₹)</label><input required type="number" step="0.01" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-lg outline-none focus:ring-2 focus:ring-red-500" placeholder="0.00" /></div>
              
              <button type="submit" className="w-full py-4 bg-red-600 text-white font-black text-xs uppercase rounded-2xl shadow-xl hover:bg-red-700 active:scale-[0.98] transition-all tracking-widest">Save Expense</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
