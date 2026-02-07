
import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useContacts } from '../context/ContactContext';
import { useCompany } from '../context/CompanyContext';
import { TransactionType, AccountType, ContactType, LedgerEntry } from '../types';
import * as XLSX from 'xlsx';

const AccountingPage: React.FC = () => {
  const { 
    accounts, getAccountLedger, transferFunds, 
    recordCustomerAdvance, recordVendorAdvance, 
    ledger: globalLedger, getDayWiseCashBook, toggleReconciliation,
    getCustomerNetLedger, getSupplierNetLedger
  } = useAccounting();
  
  const { contacts } = useContacts();
  const { activeCompany } = useCompany();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accounts[0]?.id || null);
  const [activeView, setActiveView] = useState<'ledger' | 'history' | 'cashbook' | 'ledger_reports' | 'reconciliation'>('ledger');
  const [dateFilter, setDateFilter] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });

  // Report States
  const [reportType, setReportType] = useState<'customer' | 'supplier' | 'cash' | 'bank'>('customer');
  const [reportEntityId, setReportEntityId] = useState<string>('');

  // Form States
  const [showVoucherModal, setShowVoucherModal] = useState<'customer' | 'vendor' | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  const [advData, setAdvData] = useState({ partyId: '', amount: 0, accountId: accounts[0]?.id || '', reference: '' });
  const [trfData, setTrfData] = useState({ from: '', to: '', amount: 0, reference: '' });

  const currentLedger = useMemo(() => {
    if (!selectedAccountId) return [];
    return getAccountLedger(selectedAccountId);
  }, [selectedAccountId, getAccountLedger]);

  const transactionHistory = useMemo(() => {
    const list = globalLedger
      .filter(e => e.accountId !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let running = 0;
    return list.map(entry => {
      running += (entry.debit - entry.credit);
      return { ...entry, runningBalance: running };
    }).reverse();
  }, [globalLedger]);

  const cashBookData = useMemo(() => getDayWiseCashBook(dateFilter.start, dateFilter.end), [getDayWiseCashBook, dateFilter]);

  const customers = useMemo(() => contacts.filter(c => c.contactTypes.includes('Customer')), [contacts]);
  const suppliers = useMemo(() => contacts.filter(c => c.contactTypes.includes('Supplier')), [contacts]);

  // Dynamic entities for Ledger Report tab
  const reportEntities = useMemo(() => {
    if (reportType === 'customer') return customers;
    if (reportType === 'supplier') return suppliers;
    if (reportType === 'cash') return accounts.filter(a => a.type === AccountType.CASH);
    if (reportType === 'bank') return accounts.filter(a => a.type === AccountType.BANK);
    return [];
  }, [reportType, customers, suppliers, accounts]);

  const generatedReportData = useMemo(() => {
    if (!reportEntityId) return [];
    let data: (LedgerEntry & { runningBalance: number })[] = [];
    if (reportType === 'customer') data = getCustomerNetLedger(reportEntityId);
    else if (reportType === 'supplier') data = getSupplierNetLedger(reportEntityId);
    else data = getAccountLedger(reportEntityId);
    return data.filter(e => (!dateFilter.start || e.date >= dateFilter.start) && (!dateFilter.end || e.date <= dateFilter.end));
  }, [reportType, reportEntityId, dateFilter, getCustomerNetLedger, getSupplierNetLedger, getAccountLedger]);

  const handleVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (advData.amount <= 0 || !advData.partyId) return alert('Invalid input');
    if (showVoucherModal === 'customer') {
      const c = contacts.find(x => x.id === advData.partyId);
      if (c) recordCustomerAdvance(c.id, c.name, advData.amount, advData.accountId, advData.reference);
    } else {
      const s = contacts.find(x => x.id === advData.partyId);
      if (s) recordVendorAdvance(s.id, s.name, advData.amount, advData.accountId, advData.reference);
    }
    setShowVoucherModal(null);
    setAdvData({ partyId: '', amount: 0, accountId: accounts[0]?.id || '', reference: '' });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trfData.from || !trfData.to || trfData.amount <= 0) return alert('Select source, destination and valid amount.');
    if (transferFunds(trfData.from, trfData.to, trfData.amount, trfData.reference || 'INTERNAL TRANSFER')) {
      setShowTransferModal(false);
      setTrfData({ from: '', to: '', amount: 0, reference: '' });
      alert('Internal Funds Transfer Authorized.');
    } else {
      alert('Insufficient balance in source account.');
    }
  };

  const handlePrintReport = () => {
    const reportName = reportType.toUpperCase() + ' LEDGER';
    const entityName = reportEntities.find(e => e.id === reportEntityId)?.name || 'Unknown';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${reportName}</title><style>
        body { font-family: sans-serif; padding: 40px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
        th { background: #f8fafc; text-transform: uppercase; }
        .header { margin-bottom: 30px; text-align: center; }
        .header h1 { margin: 0; text-transform: uppercase; letter-spacing: -1px; }
      </style></head><body>
        <div class="header">
          <h1>${activeCompany?.name}</h1>
          <p>${reportName} - ${entityName}</p>
          <p>${dateFilter.start} TO ${dateFilter.end}</p>
        </div>
        <table><thead><tr><th>DATE</th><th>DETAILS</th><th>REF</th><th>DEBIT</th><th>CREDIT</th><th>BALANCE</th></tr></thead><tbody>
          ${generatedReportData.map(r => `<tr><td>${r.date}</td><td>${r.description}</td><td>${r.reference}</td><td>${r.debit || '-'}</td><td>${r.credit || '-'}</td><td>${r.runningBalance}</td></tr>`).join('')}
        </tbody></table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 pb-20 px-1 md:px-0">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">Accounting & Treasury</h1>
          <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black italic">Net Mode Accounting Operations</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={() => setShowTransferModal(true)} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-black transition-all shadow-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              Internal Transfer
           </button>
           <button onClick={() => setShowVoucherModal('customer')} className="px-6 py-2.5 bg-indigo-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              Record Receipt
           </button>
           <button onClick={() => setShowVoucherModal('vendor')} className="px-6 py-2.5 bg-rose-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
              Record Payment
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        {/* Left Treasury Sidebar */}
        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Treasury Master</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {accounts.map(acc => (
                <button 
                  key={acc.id} 
                  onClick={() => { setSelectedAccountId(acc.id); if(activeView==='ledger_reports') setActiveView('ledger'); }}
                  className={`w-full text-left p-5 rounded-3xl border transition-all relative overflow-hidden group ${selectedAccountId === acc.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${selectedAccountId === acc.id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{acc.type}</span>
                  </div>
                  <p className="font-black text-[10px] md:text-xs uppercase opacity-70 truncate">{acc.name}</p>
                  <p className="text-xl md:text-2xl font-black mt-1 tracking-tight">₹{acc.balance.toLocaleString()}</p>
                </button>
              ))}
           </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
           <div className="flex p-1 bg-slate-200 rounded-2xl w-full overflow-x-auto scrollbar-hide whitespace-nowrap">
              <button onClick={() => setActiveView('ledger')} className={`flex-1 px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all ${activeView === 'ledger' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Account Detail</button>
              <button onClick={() => setActiveView('history')} className={`flex-1 px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all ${activeView === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Unified History</button>
              <button onClick={() => setActiveView('cashbook')} className={`flex-1 px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all ${activeView === 'cashbook' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Daywise Cashbook</button>
              <button onClick={() => setActiveView('ledger_reports')} className={`flex-1 px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all ${activeView === 'ledger_reports' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ledger Reports</button>
              <button onClick={() => setActiveView('reconciliation')} className={`flex-1 px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all ${activeView === 'reconciliation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Reconciliation</button>
           </div>

           {/* View: Account Detail */}
           {activeView === 'ledger' && selectedAccountId && (
              <div className="bg-white rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                 <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{accounts.find(a => a.id === selectedAccountId)?.name} Ledger</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Primary Treasury Audit</p>
                    </div>
                    <button onClick={() => {
                      const ws = XLSX.utils.json_to_sheet(currentLedger);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Ledger");
                      XLSX.writeFile(wb, "Account_Ledger.xlsx");
                    }} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg uppercase tracking-widest hover:bg-emerald-100">Export XLS</button>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                       <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr><th className="px-6 md:px-8 py-4">Date</th><th className="px-6 md:px-8 py-4">Details</th><th className="px-6 md:px-8 py-4 text-right">Debit (+)</th><th className="px-6 md:px-8 py-4 text-right">Credit (-)</th><th className="px-6 md:px-8 py-4 text-right">Running</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {currentLedger.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 md:px-8 py-4 text-[10px] md:text-xs font-bold text-slate-500">{row.date}</td>
                              <td className="px-6 md:px-8 py-4"><p className="font-black text-slate-800 uppercase text-[10px] md:text-xs truncate max-w-xs">{row.description}</p><p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Ref: {row.reference}</p></td>
                              <td className="px-6 md:px-8 py-4 text-right font-black text-emerald-600">₹{row.debit > 0 ? row.debit.toLocaleString() : '-'}</td>
                              <td className="px-6 md:px-8 py-4 text-right font-black text-rose-600">₹{row.credit > 0 ? row.credit.toLocaleString() : '-'}</td>
                              <td className="px-6 md:px-8 py-4 text-right font-black text-slate-900">₹{row.runningBalance.toLocaleString()}</td>
                            </tr>
                          ))}
                          {currentLedger.length === 0 && (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-black uppercase text-xs">No entries in this account</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {/* View: Unified History */}
           {activeView === 'history' && (
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                 <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Unified Transaction History</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Global Treasury Movement</p>
                    </div>
                    <button onClick={() => {
                      const ws = XLSX.utils.json_to_sheet(transactionHistory);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "History");
                      XLSX.writeFile(wb, "Unified_History.xlsx");
                    }} className="px-5 py-2 bg-emerald-600 text-white text-[9px] font-black rounded-lg uppercase tracking-widest hover:bg-emerald-700 shadow-lg">Export XLS</button>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                       <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                          <tr><th className="px-8 py-4">Date</th><th className="px-8 py-4">Account</th><th className="px-8 py-4">Details</th><th className="px-8 py-4 text-right">Debit</th><th className="px-8 py-4 text-right">Credit</th><th className="px-8 py-4 text-right">Running</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {transactionHistory.map((h, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-4 font-bold text-slate-500">{h.date}</td>
                              <td className="px-8 py-4 font-black text-indigo-600 uppercase tracking-tighter">{accounts.find(a=>a.id===h.accountId)?.name || 'N/A'}</td>
                              <td className="px-8 py-4"><p className="font-bold text-slate-800 uppercase truncate max-w-[150px]">{h.description}</p></td>
                              <td className="px-8 py-4 text-right font-black text-emerald-600">{h.debit > 0 ? `₹${h.debit.toLocaleString()}` : '-'}</td>
                              <td className="px-8 py-4 text-right font-black text-rose-600">{h.credit > 0 ? `₹${h.credit.toLocaleString()}` : '-'}</td>
                              <td className="px-8 py-4 text-right font-black text-slate-900">₹{h.runningBalance.toLocaleString()}</td>
                            </tr>
                          ))}
                          {transactionHistory.length === 0 && (
                             <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase text-xs italic">No historical data available.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {/* View: Daywise Cashbook */}
           {activeView === 'cashbook' && (
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                 <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Day-wise Cash Book</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Aggregate Daily Treasury Flows</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="px-3 py-1.5 border rounded-xl text-[10px] font-black" />
                       <span className="text-[10px] text-slate-400">to</span>
                       <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="px-3 py-1.5 border rounded-xl text-[10px] font-black" />
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr><th className="px-8 py-4">Date</th><th className="px-8 py-4 text-right">Opening Balance</th><th className="px-8 py-4 text-right text-emerald-600">Total Receipts (+)</th><th className="px-8 py-4 text-right text-rose-600">Total Payments (-)</th><th className="px-8 py-4 text-right bg-slate-100/50">Closing Balance</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 font-medium">
                          {cashBookData.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-5 font-black text-slate-900">{d.date}</td>
                              <td className="px-8 py-5 text-right text-slate-500">₹{d.opening.toLocaleString()}</td>
                              <td className="px-8 py-5 text-right font-black text-emerald-600">₹{d.receipts.toLocaleString()}</td>
                              <td className="px-8 py-5 text-right font-black text-rose-600">₹{d.payments.toLocaleString()}</td>
                              <td className="px-8 py-5 text-right font-black bg-slate-50/50">₹{d.closing.toLocaleString()}</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {/* View: Ledger Reports */}
           {activeView === 'ledger_reports' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 items-end gap-6">
                    <div className="space-y-1.5">
                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Type</label>
                       <select value={reportType} onChange={e => {setReportType(e.target.value as any); setReportEntityId('');}} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="customer">Customer Ledger</option>
                          <option value="supplier">Supplier Ledger</option>
                          <option value="cash">Cash Account</option>
                          <option value="bank">Bank Account</option>
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Entity</label>
                       <select value={reportEntityId} onChange={e => setReportEntityId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="">-- Choose --</option>
                          {reportEntities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                       </select>
                    </div>
                    <button onClick={() => {
                      const ws = XLSX.utils.json_to_sheet(generatedReportData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Ledger");
                      XLSX.writeFile(wb, "Custom_Ledger_Report.xlsx");
                    }} className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg hover:bg-emerald-700">XLSX</button>
                    <button onClick={handlePrintReport} className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg hover:bg-indigo-700">Print</button>
                 </div>

                 <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b bg-slate-50/50">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unified Net Ledger (Debit - Credit)</h3>
                    </div>
                    <div className="overflow-x-auto min-h-[300px]">
                       <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                             <tr><th className="px-8 py-4">Date</th><th className="px-8 py-4">Details / Reference</th><th className="px-6 py-4 text-right">Debit (+)</th><th className="px-6 py-4 text-right">Credit (-)</th><th className="px-8 py-4 text-right">Running Balance</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {generatedReportData.map((r, i) => (
                               <tr key={i} className="hover:bg-slate-50">
                                  <td className="px-8 py-5 font-bold text-slate-500">{r.date}</td>
                                  <td className="px-8 py-5 font-black text-slate-800 uppercase leading-none">{r.description}<br/><span className="text-[9px] text-slate-400 font-mono mt-1 block">Ref: {r.reference}</span></td>
                                  <td className="px-6 py-5 text-right font-black text-emerald-600">₹{r.debit > 0 ? r.debit.toLocaleString() : '-'}</td>
                                  <td className="px-6 py-5 text-right font-black text-rose-600">₹{r.credit > 0 ? r.credit.toLocaleString() : '-'}</td>
                                  <td className="px-8 py-5 text-right font-black text-slate-900">₹{r.runningBalance.toLocaleString()}</td>
                               </tr>
                             ))}
                             {generatedReportData.length === 0 && (
                               <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black uppercase text-xs italic tracking-widest">No records found for selection</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           )}

           {/* View: Reconciliation */}
           {activeView === 'reconciliation' && (
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                 <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Account Reconciliation</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Verify Ledger against bank statements</p>
                    </div>
                    <div className="px-4 py-1.5 bg-amber-50 border border-amber-100 rounded-xl">
                       <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{globalLedger.filter(l=>!l.reconciled && l.accountId !== undefined).length} Unreconciled</span>
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                       <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                          <tr><th className="px-8 py-4">Status</th><th className="px-8 py-4">Date / Account</th><th className="px-8 py-4">Transaction Details</th><th className="px-8 py-4 text-right">Amount</th><th className="px-8 py-4 text-right">Action</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {globalLedger.filter(l => l.accountId !== undefined).map((l, i) => (
                             <tr key={i} className={`hover:bg-slate-50 transition-colors ${l.reconciled ? 'opacity-60 bg-emerald-50/20' : ''}`}>
                                <td className="px-8 py-4">
                                   {l.reconciled ? (
                                      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg></div>
                                   ) : (
                                      <div className="w-5 h-5 border-2 border-slate-200 rounded-full" />
                                   )}
                                </td>
                                <td className="px-8 py-4"><p className="font-bold text-slate-500">{l.date}</p><p className="text-[9px] font-black text-indigo-600 uppercase mt-0.5">{accounts.find(a=>a.id===l.accountId)?.name}</p></td>
                                <td className="px-8 py-4"><p className="font-black text-slate-800 uppercase tracking-tight truncate max-w-xs">{l.description}</p><p className="text-[9px] text-slate-400 font-mono">ID: {l.id}</p></td>
                                <td className={`px-8 py-4 text-right font-black ${l.debit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹{(l.debit || l.credit).toLocaleString()}</td>
                                <td className="px-8 py-4 text-right">
                                   <button onClick={() => toggleReconciliation(l.id)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${l.reconciled ? 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                      {l.reconciled ? 'Undo' : 'Verify'}
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Internal Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-8 py-6 bg-slate-800 text-white flex items-center justify-between">
                 <h2 className="text-xl font-black uppercase tracking-tight">Internal Stock Movement</h2>
                 <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleTransfer} className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">From Account</label><select value={trfData.from} onChange={e => setTrfData({...trfData, from: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500"><option value="">-- From --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">To Account</label><select value={trfData.to} onChange={e => setTrfData({...trfData, to: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500"><option value="">-- To --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                    <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transfer Amount (₹)</label><input required type="number" value={trfData.amount || ''} onChange={e => setTrfData({...trfData, amount: Number(e.target.value)})} className="w-full px-5 py-3 bg-slate-50 border rounded-2xl text-lg font-black outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" /></div>
                    <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Narration / Reference</label><input type="text" value={trfData.reference} onChange={e => setTrfData({...trfData, reference: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="Reason for transfer..." /></div>
                 </div>
                 <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-[11px] shadow-xl hover:bg-indigo-700 transition-all active:scale-95">Authorize Transfer</button>
              </form>
           </div>
        </div>
      )}

      {/* Advance/Manual Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className={`px-8 py-6 text-white flex items-center justify-between ${showVoucherModal === 'customer' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                 <h2 className="text-xl font-black uppercase tracking-tight">{showVoucherModal === 'customer' ? 'Record Receipt' : 'Record Payment'}</h2>
                 <button onClick={() => setShowVoucherModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleVoucherSubmit} className="p-10 space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{showVoucherModal === 'customer' ? 'Customer Profile' : 'Vendor Profile'}</label>
                    <select required value={advData.partyId} onChange={e => setAdvData({...advData, partyId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                       <option value="">-- Search Party --</option>
                       {(showVoucherModal === 'customer' ? customers : suppliers).map(p => <option key={p.id} value={p.id}>{p.name} ({p.mobile})</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Target Account</label>
                       <select value={advData.accountId} onChange={e => setAdvData({...advData, accountId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Reference No</label>
                       <input required type="text" value={advData.reference} onChange={e => setAdvData({...advData, reference: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-xs font-black outline-none" placeholder="REF000" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Voucher Amount (₹)</label>
                    <input required type="number" value={advData.amount || ''} onChange={e => setAdvData({...advData, amount: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 border rounded-3xl text-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
                 </div>
                 <button type="submit" className={`w-full py-5 text-white font-black rounded-3xl uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 ${showVoucherModal === 'customer' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}>Post Ledger Entry</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPage;
