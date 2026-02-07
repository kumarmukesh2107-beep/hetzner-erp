
import React, { useState, useMemo } from 'react';
import { usePurchase } from '../context/PurchaseContext';
import { useCompany } from '../context/CompanyContext';
import { useAccounting } from '../context/AccountingContext';
import { useContacts } from '../context/ContactContext';
import { PurchaseStatus, PaymentStatus, PurchaseTransaction, WarehouseType } from '../types';
import NewPurchasePage from './NewPurchasePage';
import StandardDocument from '../components/Print/StandardDocument';
import { triggerStandalonePrint } from '../utils/printService';

const StatusBadge: React.FC<{ status: PurchaseStatus }> = ({ status }) => {
  const config = {
    [PurchaseStatus.RFQ]: 'bg-slate-100 text-slate-600',
    [PurchaseStatus.PO]: 'bg-indigo-100 text-indigo-700',
    [PurchaseStatus.GRN_PARTIAL]: 'bg-orange-100 text-orange-700',
    [PurchaseStatus.GRN_COMPLETED]: 'bg-emerald-100 text-emerald-700',
    [PurchaseStatus.BILLED]: 'bg-slate-900 text-white',
    [PurchaseStatus.CANCELLED]: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${config[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const PurchaseDetailModal: React.FC<{ 
  purchase: PurchaseTransaction; 
  onClose: () => void; 
  onEdit: (p: PurchaseTransaction) => void;
}> = ({ purchase, onClose, onEdit }) => {
  const { confirmPO, recordGRN, createVendorBill, recordPurchasePayment, reconcileVendorAdvance, suppliers } = usePurchase();
  const { activeCompany } = useCompany();
  const { accounts } = useAccounting();
  const { getContactById } = useContacts();
  
  const [grnInputs, setGrnInputs] = useState<Record<string, number>>({});
  const [grnRef, setGrnRef] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billInputs, setBillInputs] = useState<Record<string, number>>({});
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [advanceAdjustAmount, setAdvanceAdjustAmount] = useState(0);

  const supplier = useMemo(() => {
    return suppliers.find(s => s.id === purchase.contactId) || getContactById(purchase.contactId);
  }, [purchase, suppliers, getContactById]);

  const executePrint = () => {
    triggerStandalonePrint('printable-erp-doc', `Procurement_${purchase.purchaseNo}`);
  };

  const handleGRN = () => {
    const items = (Object.entries(grnInputs) as [string, number][]).map(([pid, q]) => ({ productId: pid, qty: q })).filter(i => i.qty > 0);
    if (items.length === 0) return alert("Enter quantities");
    if (recordGRN(purchase.id, items, grnRef || 'Manual', purchase.warehouse)) {
      setGrnInputs({});
      alert("Inventory Inbound Complete.");
    }
  };


  const handlePayment = () => {
    if (!paymentAmount || paymentAmount <= 0) return alert('Enter payment amount');
    if (!paymentAccountId) return alert('Select payment account');
    recordPurchasePayment(purchase.id, paymentAmount, paymentAccountId, paymentRef || `PAY-${Date.now().toString().slice(-6)}`);
    alert('Vendor payment recorded.');
    setPaymentAmount(0);
    setPaymentRef('');
  };

  const handleMapAdvance = () => {
    if (!advanceAdjustAmount || advanceAdjustAmount <= 0) return alert('Enter advance amount');
    reconcileVendorAdvance(purchase.id, advanceAdjustAmount);
    alert('Vendor advance mapped.');
    setAdvanceAdjustAmount(0);
  };

  const handleBill = () => {
    if (!billNo.trim()) return alert("Enter Vendor Bill No");
    const billedItems = (Object.entries(billInputs) as [string, number][]).map(([pid, q]) => {
      const it = purchase.items.find(i => i.productId === pid);
      return { productId: pid, qty: q, unitPrice: it?.unitPrice || 0, total: q * (it?.unitPrice || 0) * 1.18 };
    }).filter(i => i.qty > 0);
    if (billedItems.length === 0) return alert("Select quantities");
    if (createVendorBill(purchase.id, billedItems, billNo)) {
      setBillInputs({});
      alert("Vendor Bill Posted.");
    }
  };

  return (
    <div id="print-modal-container" className="fixed inset-0 z-[100] flex flex-col items-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-sm no-print">
      <div className="w-full max-w-5xl bg-slate-900 text-white rounded-t-[32px] px-6 py-4 flex items-center justify-between border-b border-white/10 shadow-2xl shrink-0">
         <div className="flex items-center gap-4">
            <h2 className="text-xs md:text-sm font-black tracking-widest uppercase text-slate-400">Procurement View</h2>
            <div className="h-4 w-px bg-slate-700 hidden md:block" />
            <h3 className="text-sm md:text-lg font-black tracking-tight uppercase truncate max-w-[200px] md:max-w-none">{purchase.purchaseNo}</h3>
            <StatusBadge status={purchase.status} />
         </div>
         
         <div className="flex items-center gap-3">
            <button onClick={executePrint} className="px-5 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-95">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
               Print
            </button>
            <button onClick={() => onEdit(purchase)} className="px-5 py-2 bg-slate-800 text-slate-300 text-[10px] font-black uppercase rounded-xl hover:text-white border border-slate-700 transition-all">Edit</button>
            <button onClick={onClose} className="p-2 md:p-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-lg active:scale-95">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
         </div>
      </div>

      <div id="printable-purchase-content" className="w-full max-w-5xl bg-white shadow-2xl overflow-y-auto flex-1 relative scrollbar-hide">
        <div className="min-h-full">
           <StandardDocument 
             company={activeCompany}
             type={purchase.status === PurchaseStatus.RFQ ? 'Request for Quotation' : 'Purchase Order'}
             referenceNo={purchase.purchaseNo}
             date={purchase.date}
             party={{
               name: supplier?.name || 'Unknown Vendor',
               address: supplier?.address || '',
               mobile: supplier?.mobile || '',
               gstNo: supplier?.gstNo
             }}
             warehouse={purchase.warehouse}
             items={purchase.items.map(it => ({
               name: it.productName,
               model: it.modelNo,
               image: it.productImage,
               qty: it.orderedQty,
               rate: it.unitPrice,
               total: it.total
             }))}
             summary={{
               subtotal: purchase.subtotal,
               tax: purchase.totalGst,
               grandTotal: purchase.grandTotal
             }}
           />

           <div className="p-10 bg-slate-50 border-t border-slate-100 space-y-10 no-print">
              {purchase.status === PurchaseStatus.RFQ && (
                 <div className="flex items-center justify-between p-8 bg-indigo-600 rounded-[32px] text-white shadow-xl">
                    <div>
                       <h4 className="text-xl font-black uppercase tracking-tight">Convert to Purchase Order</h4>
                       <p className="text-xs opacity-70">Confirm prices and authorize supply inbound.</p>
                    </div>
                    <button onClick={() => confirmPO(purchase.id)} className="px-8 py-3 bg-white text-indigo-600 font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all">Confirm Order</button>
                 </div>
              )}

              {(purchase.status === PurchaseStatus.PO || purchase.status === PurchaseStatus.GRN_PARTIAL) && (
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-4">Goods Receipt Note (GRN)</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                       <input type="text" placeholder="Gate Pass / Ref" value={grnRef} onChange={e => setGrnRef(e.target.value)} className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                    <div className="space-y-4">
                       {purchase.items.map(it => (
                          <div key={it.productId} className="flex items-center justify-between">
                             <div className="flex-1"><p className="text-xs font-black uppercase text-slate-700">{it.productName}</p><p className="text-[10px] text-slate-400 font-mono">Pending: {it.orderedQty - it.receivedQty}</p></div>
                             <input type="number" max={it.orderedQty - it.receivedQty} value={grnInputs[it.productId] || 0} onChange={e => setGrnInputs({...grnInputs, [it.productId]: Number(e.target.value)})} className="w-24 px-3 py-2 bg-slate-50 border rounded-xl text-xs font-black" />
                          </div>
                       ))}
                    </div>
                    <button onClick={handleGRN} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100">Record Stock Receipt</button>
                 </div>
              )}

              {(purchase.status === PurchaseStatus.GRN_COMPLETED || purchase.status === PurchaseStatus.GRN_PARTIAL) && (
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-4">Vendor Bill Posting</h4>
                    <input type="text" placeholder="Supplier Bill Number" value={billNo} onChange={e => setBillNo(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    <div className="space-y-4">
                       {purchase.items.map(it => (
                          <div key={it.productId} className="flex items-center justify-between">
                             <div className="flex-1"><p className="text-xs font-black uppercase text-slate-700">{it.productName}</p><p className="text-[10px] text-slate-400 font-mono">Received: {it.receivedQty} | Billed: {it.billedQty}</p></div>
                             <input type="number" max={it.receivedQty - it.billedQty} value={billInputs[it.productId] || 0} onChange={e => setBillInputs({...billInputs, [it.productId]: Number(e.target.value)})} className="w-24 px-3 py-2 bg-slate-50 border rounded-xl text-xs font-black" />
                          </div>
                       ))}
                    </div>
                    <button onClick={handleBill} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100">Register Purchase Bill</button>
                 </div>
              )}

              {(purchase.status === PurchaseStatus.BILLED || purchase.paymentStatus === PaymentStatus.PARTIAL) && (
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-4">Vendor Payment & Advance Mapping</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input type="number" value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} placeholder="Payment Amount" className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                      <select value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-black"><option value="">Select Account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                      <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Reference" className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                    </div>
                    <button onClick={handlePayment} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-[10px]">Record Vendor Payment</button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="number" value={advanceAdjustAmount || ''} onChange={e => setAdvanceAdjustAmount(Number(e.target.value))} placeholder="Adjust Vendor Advance" className="px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold" />
                      <button onClick={handleMapAdvance} className="py-2 bg-amber-600 text-white font-black rounded-xl uppercase tracking-widest text-[10px]">Map Existing Advance</button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 cursor-pointer" onClick={onClose} />
    </div>
  );
};

const PurchasesPage: React.FC = () => {
  const { purchases, suppliers } = usePurchase();
  const { getContactById } = useContacts();
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseTransaction | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseTransaction | null>(null);
  
  // List View State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof PurchaseTransaction | 'orderedQty' | 'receivedQty' | 'billedQty', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const filteredPurchases = useMemo(() => {
    let result = [...purchases];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => p.purchaseNo.toLowerCase().includes(term));
    }

    if (filterSupplier) {
      result = result.filter(p => p.contactId === filterSupplier);
    }

    if (filterWarehouse) {
      result = result.filter(p => p.warehouse === filterWarehouse);
    }

    if (filterStatus) {
      result = result.filter(p => p.status === filterStatus);
    }

    if (filterDate.start) {
      result = result.filter(p => new Date(p.date) >= new Date(filterDate.start));
    }
    if (filterDate.end) {
      result = result.filter(p => new Date(p.date) <= new Date(filterDate.end));
    }

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      
      if (sortConfig.key === 'orderedQty') {
        aVal = a.items.reduce((sum, i) => sum + i.orderedQty, 0);
        bVal = b.items.reduce((sum, i) => sum + i.orderedQty, 0);
      } else if (sortConfig.key === 'receivedQty') {
        aVal = a.items.reduce((sum, i) => sum + i.receivedQty, 0);
        bVal = b.items.reduce((sum, i) => sum + i.receivedQty, 0);
      } else if (sortConfig.key === 'billedQty') {
        aVal = a.items.reduce((sum, i) => sum + i.billedQty, 0);
        bVal = b.items.reduce((sum, i) => sum + i.billedQty, 0);
      } else {
        aVal = a[sortConfig.key as keyof PurchaseTransaction];
        bVal = b[sortConfig.key as keyof PurchaseTransaction];
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [purchases, searchTerm, filterSupplier, filterWarehouse, filterStatus, filterDate, sortConfig]);

  const handleEdit = (p: PurchaseTransaction) => {
    setEditingPurchase(p);
    setShowNewForm(true);
    setSelectedPurchase(null);
  };

  const toggleSort = (key: any) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  if (showNewForm) return <NewPurchasePage onBack={() => { setShowNewForm(false); setEditingPurchase(null); }} editTransaction={editingPurchase} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Procurement Ledger</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage Supply Chain & Quantity Verification</p>
        </div>
        <button onClick={() => { setEditingPurchase(null); setShowNewForm(true); }} className="px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-lg hover:bg-indigo-700 transition-all">Create New RFQ</button>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex flex-wrap items-end gap-4 no-print">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Search Ref</label>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="PUR-XXXX" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
        </div>
        <div className="w-48">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Supplier</label>
          <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
            <option value="">All Statuses</option>
            {Object.values(PurchaseStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">From</label>
            <input type="date" value={filterDate.start} onChange={e => setFilterDate({...filterDate, start: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold" />
          </div>
          <div className="w-32">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">To</label>
            <input type="date" value={filterDate.end} onChange={e => setFilterDate({...filterDate, end: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold" />
          </div>
        </div>
        <button onClick={() => {setFilterSupplier(''); setFilterStatus(''); setSearchTerm(''); setFilterDate({start:'', end:''});}} className="px-4 py-2 text-[10px] font-black text-indigo-600 uppercase">Reset</button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
            <tr>
              <th className="px-6 py-5 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('purchaseNo')}>PO No {sortConfig.key === 'purchaseNo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-6 py-5">Supplier</th>
              <th className="px-6 py-5 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('date')}>Issue Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-4 py-5 text-center cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('orderedQty')}>Qty (O/R/B)</th>
              <th className="px-6 py-5 text-right cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('grandTotal')}>Total Value {sortConfig.key === 'grandTotal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-6 py-5 text-center cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('status')}>PO Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPurchases.map(p => {
              const oQty = p.items.reduce((s, i) => s + i.orderedQty, 0);
              const rQty = p.items.reduce((s, i) => s + i.receivedQty, 0);
              const bQty = p.items.reduce((s, i) => s + i.billedQty, 0);
              const supplier = suppliers.find(s => s.id === p.contactId) || getContactById(p.contactId);

              return (
                <tr key={p.id} onClick={() => setSelectedPurchase(p)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 font-black text-indigo-600">{p.purchaseNo}</td>
                  <td className="px-6 py-4 font-bold text-slate-700 uppercase text-xs truncate max-w-[150px]">{supplier?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">{p.date}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="inline-flex items-center bg-slate-100 rounded-lg px-2 py-1 gap-2 text-[10px] font-black">
                      <span className="text-slate-500" title="Ordered">{oQty}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-indigo-600" title="Received">{rQty}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-emerald-600" title="Billed">{bQty}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">₹{p.grandTotal.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedPurchase(p); }} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredPurchases.length === 0 && (
              <tr><td colSpan={7} className="py-20 text-center text-slate-300 font-black uppercase text-xs">No records found matching filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPurchase && (
        <PurchaseDetailModal 
          purchase={selectedPurchase} 
          onClose={() => setSelectedPurchase(null)} 
          onEdit={handleEdit} 
        />
      )}
    </div>
  );
};

export default PurchasesPage;
