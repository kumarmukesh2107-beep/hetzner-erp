
import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { usePurchase } from '../context/PurchaseContext';
import { useContacts } from '../context/ContactContext';
import { useCompany } from '../context/CompanyContext';
import { PurchaseItem, WarehouseType, PurchaseTransaction, ContactType, Contact } from '../types';
import SearchableProductSelect from '../components/Shared/SearchableProductSelect';

interface NewPurchasePageProps {
  onBack: () => void;
  editTransaction?: PurchaseTransaction | null;
}

const NewPurchasePage: React.FC<NewPurchasePageProps> = ({ onBack, editTransaction }) => {
  const { products } = useInventory();
  const { createRFQ, updatePurchase } = usePurchase();
  const { searchContacts, getContactById } = useContacts();
  const { activeCompany } = useCompany();

  const [contactId, setContactId] = useState('');
  const [warehouse, setWarehouse] = useState<WarehouseType>(WarehouseType.GODOWN);
  const [rfqNo, setRfqNo] = useState(`RFQ-${Date.now().toString().slice(-6)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);

  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorResults, setVendorResults] = useState<Contact[]>([]);

  const [selProductId, setSelProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);

  useEffect(() => {
    if (editTransaction) {
      setContactId(editTransaction.contactId);
      const c = getContactById(editTransaction.contactId);
      if (c) setVendorSearch(c.name);
      setWarehouse(editTransaction.warehouse);
      setRfqNo(editTransaction.rfqNo);
      setDate(editTransaction.date);
      setExpectedDeliveryDate(editTransaction.expectedDeliveryDate || '');
      setItems(editTransaction.items);
    }
  }, [editTransaction, getContactById]);

  const handleVendorSearch = (val: string) => {
    setVendorSearch(val);
    if (val.length > 1) {
      setVendorResults(searchContacts(val, ContactType.SUPPLIER));
    } else {
      setVendorResults([]);
    }
  };

  const addItem = () => {
    const selProduct = products.find(p => p.id === selProductId);
    if (!selProduct) return;
    setItems(prev => [...prev, {
      productId: selProduct.id,
      productName: selProduct.name,
      modelNo: selProduct.modelNo,
      orderedQty: qty,
      receivedQty: 0,
      billedQty: 0,
      unitPrice: cost,
      gst: 18,
      total: (qty * cost) * 1.18
    }]);
    setSelProductId('');
    setQty(1);
    setCost(0);
  };

  const totals = useMemo(() => {
    return items.reduce((acc, it) => ({
      subtotal: acc.subtotal + (it.orderedQty * it.unitPrice),
      grand: acc.grand + it.total
    }), { subtotal: 0, grand: 0 });
  }, [items]);

  const handleSubmit = () => {
    if (!contactId || items.length === 0) return alert('Select vendor and add items');
    const payload = { 
      rfqNo, 
      purchaseNo: rfqNo,
      date, 
      expectedDeliveryDate, 
      contactId, 
      supplierId: contactId,
      warehouse, 
      items, 
      subtotal: totals.subtotal, 
      totalGst: totals.grand - totals.subtotal, 
      grandTotal: totals.grand 
    };
    if (editTransaction) updatePurchase(editTransaction.id, payload);
    else createRFQ(payload);
    onBack();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 bg-white border rounded-lg shadow-sm text-slate-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{editTransaction ? 'Edit Procurement Record' : 'Purchase Builder (RFQ/PO)'}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b pb-4">Vendor & Delivery Context</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Supplier Selection</label>
                <input type="text" value={vendorSearch} onChange={e => handleVendorSearch(e.target.value)} placeholder="Search vendor name..." className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600" />
                {vendorResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                    {vendorResults.map(v => <button key={v.id} type="button" onClick={() => { setContactId(v.id); setVendorSearch(v.name); setVendorResults([]); }} className="w-full px-5 py-3 text-left text-xs hover:bg-indigo-50 font-bold uppercase border-b border-slate-50">{v.name} ({v.mobile})</button>)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Issue Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Expect By</label><input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs" /></div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Target Warehouse</label>
                <select value={warehouse} onChange={e => setWarehouse(e.target.value as WarehouseType)} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase">
                   {Object.values(WarehouseType).map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Document Reference</label>
                <input type="text" value={rfqNo} onChange={e => setRfqNo(e.target.value)} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-indigo-600 outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b pb-4">Line Items Procurement</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6"><SearchableProductSelect products={products} selectedProductId={selProductId} onSelect={(id) => { setSelProductId(id); const p = products.find(prod => prod.id === id); if(p) setCost(p.cost); }} /></div>
              <div className="md:col-span-2"><label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Unit Cost</label><input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-black" /></div>
              <div className="md:col-span-2"><label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Req. Qty</label><input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-black" /></div>
              <button type="button" onClick={addItem} className="md:col-span-2 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-lg">Append</button>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-xs">
                 <thead className="bg-slate-50 font-black text-slate-400 uppercase border-b">
                   <tr><th className="px-6 py-4 text-left">Product Descriptor</th><th className="px-2 py-4 text-center">Quantity</th><th className="px-6 py-4 text-right">Extended Value</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {items.map((it, i) => (
                     <tr key={i} className="hover:bg-slate-50">
                       <td className="px-6 py-4 font-black uppercase text-slate-700">{it.productName}<span className="text-[9px] text-slate-400 block font-mono mt-0.5">{it.modelNo}</span></td>
                       <td className="px-2 py-4 text-center font-bold text-slate-900">{it.orderedQty}</td>
                       <td className="px-6 py-4 text-right font-black text-slate-900">₹{it.total.toLocaleString()}</td>
                     </tr>
                   ))}
                   {items.length === 0 && (
                     <tr><td colSpan={3} className="py-20 text-center text-slate-300 font-black uppercase text-[10px]">Empty Procurement Draft</td></tr>
                   )}
                 </tbody>
               </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 p-10 rounded-[40px] text-white shadow-2xl sticky top-6">
            <h3 className="text-[10px] font-black uppercase text-indigo-400 border-b border-white/5 pb-4 mb-8 tracking-widest text-center">Order Capitalization</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest"><span className="text-slate-500">Capital Outlay</span><span className="text-slate-200">₹{totals.subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest"><span className="text-slate-500">Tax Liabilities</span><span className="text-slate-200">₹{(totals.grand - totals.subtotal).toLocaleString()}</span></div>
              <div className="pt-8 border-t border-white/10 flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter leading-none">Global<br/>Valuation</span>
                <span className="text-4xl font-black text-white tracking-tighter">₹{totals.grand.toLocaleString()}</span>
              </div>
            </div>
            <button type="button" onClick={handleSubmit} className="w-full mt-10 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-xs hover:bg-indigo-700 active:scale-95 transition-all">Publish Order</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPurchasePage;
