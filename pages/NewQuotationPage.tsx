
import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useSales } from '../context/SalesContext';
import { useContacts } from '../context/ContactContext';
import { useCompany } from '../context/CompanyContext';
import { useAccounting } from '../context/AccountingContext';
import { WarehouseType, SalesItem, SalesTransaction, Contact, ContactType, SalesStatus } from '../types';
import SearchableProductSelect from '../components/Shared/SearchableProductSelect';

interface NewQuotationPageProps {
  onBack: () => void;
  editTransaction?: SalesTransaction | null;
}

const NewQuotationPage: React.FC<NewQuotationPageProps> = ({ onBack, editTransaction }) => {
  const { products } = useInventory();
  const { createQuotation, updateQuotation, confirmOrder, recordDelivery, createInvoice, reconcileAdvance } = useSales();
  const { getContactByMobile, addContact, searchContacts, getContactBalance } = useContacts();
  const { activeCompany } = useCompany();

  const [mobile, setMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isNewContact, setIsNewContact] = useState(false);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<'name' | 'mobile' | null>(null);
  const [currentContactId, setCurrentContactId] = useState<string | null>(null);

  const [warehouse, setWarehouse] = useState<WarehouseType>(WarehouseType.GODOWN);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [salesPerson, setSalesPerson] = useState('');
  const [cordName, setCordName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [storeName, setStoreName] = useState('');
  const [salesType, setSalesType] = useState('');
  const [docType, setDocType] = useState(''); // Used as Type in UI
  
  const [architectIncentive, setArchitectIncentive] = useState(0);
  const [architectIncentivePercent, setArchitectIncentivePercent] = useState(0);
  const [fittingCharges, setFittingCharges] = useState(0);
  const [fittingPercent, setFittingPercent] = useState(0);

  const [selectedItems, setSelectedItems] = useState<SalesItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [priceInput, setPriceInput] = useState(0);
  const [applyGst, setApplyGst] = useState(false);
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState(0);
  const [salesPeople, setSalesPeople] = useState<string[]>([]);
  const [newSalesPerson, setNewSalesPerson] = useState('');

  const customerLedgerBalance = useMemo(() => {
    if (!currentContactId) return 0;
    return getContactBalance(currentContactId);
  }, [currentContactId, getContactBalance]);

  useEffect(() => {
    if (editTransaction) {
      setMobile(editTransaction.contactId.includes('-') ? editTransaction.contactId.split('-').pop() || '' : editTransaction.contactId);
      setCustomerName(editTransaction.customerName);
      setBillingAddress(editTransaction.customerAddress);
      setShippingAddress(editTransaction.shippingAddress || '');
      setWarehouse(editTransaction.warehouse);
      setBookingDate(editTransaction.bookingDate);
      setExpectedDeliveryDate(editTransaction.expectedDeliveryDate || '');
      setSalesPerson(editTransaction.salesPerson);
      setCordName(editTransaction.cordName || '');
      setRemarks(editTransaction.remarks);
      setInternalNotes(editTransaction.internalNotes || '');
      setStoreName(editTransaction.storeName || '');
      setSalesType(editTransaction.salesType || '');
      setDocType(editTransaction.type || '');
      setSelectedItems(editTransaction.items);
      setArchitectIncentive(editTransaction.architectIncentive || 0);
      setArchitectIncentivePercent(editTransaction.architectIncentivePercent || 0);
      setFittingCharges(editTransaction.fittingCharges || 0);
      setFittingPercent(editTransaction.fittingPercent || 0);
      setCurrentContactId(editTransaction.contactId);
      
      const found = getContactByMobile(editTransaction.contactId.split('-').pop() || '');
      if (found) {
        setEmail(found.email || ''); 
        setCity(found.city); 
        setState(found.state); 
      }
    }
  }, [editTransaction, getContactByMobile]);


  useEffect(() => {
    const defaults = ['SELF', 'MUKESH KUMAR'];
    const stored = JSON.parse(localStorage.getItem('nexus_sales_people') || '[]') as string[];
    const merged = [...new Set([...defaults, ...stored.map(v => String(v || '').trim().toUpperCase()).filter(Boolean)])].sort();
    setSalesPeople(merged);
  }, []);

  const handleMobileSearch = (val: string) => {
    setMobile(val);
    setActiveSearchField('mobile');

    if (val.length >= 3) {
      setSearchResults(searchContacts(val, ContactType.CUSTOMER));
    } else {
      setSearchResults([]);
    }

    if (val.length === 10) {
      const found = getContactByMobile(val);
      if (found) {
        selectContact(found);
      } else {
        setIsNewContact(true);
        setCurrentContactId(null);
      }
    } else {
      setIsNewContact(false);
      setCurrentContactId(null);
    }
  };

  const handleNameSearch = (val: string) => {
    setCustomerName(val);
    setActiveSearchField('name');
    if (val.length > 2) setSearchResults(searchContacts(val, ContactType.CUSTOMER));
    else setSearchResults([]);
  };

  const selectContact = (c: Contact) => {
    setMobile(c.mobile);
    setCustomerName(c.name);
    setEmail(c.email || '');
    setBillingAddress(c.billingAddress);
    setShippingAddress(c.shippingAddress || '');
    setCity(c.city);
    setState(c.state);
    setIsNewContact(false);
    setSearchResults([]);
    setActiveSearchField(null);
    setCurrentContactId(c.id);
  };


  const recalcLine = (item: SalesItem, overrides?: Partial<SalesItem>): SalesItem => {
    const next = { ...item, ...overrides };
    const lineBase = (Number(next.orderedQty) || 0) * (Number(next.price) || 0);
    const discountPercent = Math.max(0, Number(next.discountPercent) || 0);
    const discount = Number(((lineBase * discountPercent) / 100).toFixed(2));
    const taxable = Math.max(0, lineBase - discount);
    const gstAmount = next.isGstEnabled ? (taxable * ((Number(next.gstRate) || 0) / 100)) : 0;
    return { ...next, discount, discountPercent, total: Number((taxable + gstAmount).toFixed(2)) };
  };

  const updateLineItem = (idx: number, updates: Partial<SalesItem>) => {
    setSelectedItems(prev => prev.map((item, i) => i === idx ? recalcLine(item, updates) : item));
  };

  const applyBulkDiscountToAllLines = () => {
    const pct = Math.max(0, Number(bulkDiscountPercent) || 0);
    setSelectedItems(prev => prev.map(item => recalcLine(item, { discountPercent: pct })));
  };

  const addSalesPersonOption = () => {
    const normalized = newSalesPerson.trim().toUpperCase();
    if (!normalized) return;
    setSalesPeople(prev => {
      if (prev.includes(normalized)) return prev;
      const next = [...prev, normalized].sort();
      localStorage.setItem('nexus_sales_people', JSON.stringify(next));
      return next;
    });
    setSalesPerson(normalized);
    setNewSalesPerson('');
  };

  const totals = useMemo(() => {
    const lines = selectedItems.reduce((acc, item) => ({
      subtotal: acc.subtotal + (item.orderedQty * item.price),
      discount: acc.discount + item.discount,
      gst: acc.gst + (item.isGstEnabled ? (item.orderedQty * item.price - item.discount) * (item.gstRate / 100) : 0),
    }), { subtotal: 0, discount: 0, gst: 0 });
    
    const grand = lines.subtotal - lines.discount + lines.gst;
    return { ...lines, grand };
  }, [selectedItems]);

  const addItem = () => {
    const currentProduct = products.find(p => p.id === selectedProductId);
    if (!currentProduct) return;
    const currentQty = Math.max(1, Number(qty) || 1);
    const line = recalcLine({
      productId: currentProduct.id,
      productName: currentProduct.name,
      modelNo: currentProduct.modelNo,
      productImage: currentProduct.image,
      orderedQty: currentQty,
      deliveredQty: 0,
      invoicedQty: 0,
      price: Number(priceInput) || 0,
      discount: 0,
      discountPercent: 0,
      gstRate: 18,
      isGstEnabled: applyGst,
      total: 0
    });
    setSelectedItems(prev => [...prev, line]);
    setSelectedProductId('');
    setQty(1);
    setPriceInput(0);
  };

  const removeItem = (idx: number) => setSelectedItems(prev => prev.filter((_, i) => i !== idx));

  const handleFinalSubmit = () => {
    if (!customerName.trim() || selectedItems.length === 0) return alert('Fill required fields');
    
    let finalContactId = currentContactId;
    if (isNewContact) {
      const newContact = addContact({ 
        name: customerName.trim(), 
        type: ContactType.CUSTOMER, 
        contactTypes: ['Customer'],
        mobile, 
        email, 
        billingAddress, 
        city, 
        state, 
        openingBalance: 0, 
        shippingAddress, 
        gstNo: '',
        status: 'Active'
      });
      finalContactId = newContact.id;
    }

    const payload = {
      orderNo: editTransaction ? editTransaction.orderNo : `QT-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      bookingDate,
      expectedDeliveryDate,
      contactId: finalContactId || 'WALK-IN',
      customerName: customerName.trim(),
      customerAddress: billingAddress,
      shippingAddress,
      warehouse,
      salesPerson,
      cordName,
      remarks,
      internalNotes,
      items: selectedItems,
      subtotal: totals.subtotal,
      totalGst: totals.gst,
      totalDiscount: totals.discount,
      grandTotal: totals.grand,
      salesType,
      type: docType,
      storeName,
      architectIncentive,
      architectIncentivePercent,
      fittingCharges,
      fittingPercent
    };
    
    if (editTransaction) updateQuotation(editTransaction.id, payload);
    else createQuotation(payload as any);
    onBack();
  };

  return (
    <div className="space-y-6 pb-20 px-1 md:px-0 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 bg-white border rounded-lg text-slate-500 hover:bg-slate-50 transition-all shadow-sm"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase truncate max-w-[200px] md:max-w-none">{editTransaction ? 'Modify Doc' : 'New Quotation Builder'}</h1>
        </div>
        <p className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nexus ERP v2.0 • Pricing Model: Excl. GST</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        <div className="lg:col-span-3 space-y-6 md:space-y-8">
          {/* CLIENT & HEADER INFO - Matched to SS3 */}
          <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-6">
               <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Client & Header Info</h3>
               <div className="grid grid-cols-2 md:flex gap-6">
                  <div className="min-w-[180px]"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sales Person</p><select value={salesPerson} onChange={e => setSalesPerson(e.target.value)} className="text-[10px] md:text-xs font-black uppercase text-slate-800 outline-none border-b border-dashed border-slate-200 w-full pb-1 bg-transparent"><option value="">-- SELECT --</option>{salesPeople.map(sp => <option key={sp} value={sp}>{sp}</option>)}</select><div className="flex items-center gap-1 mt-1"><input type="text" value={newSalesPerson} onChange={e => setNewSalesPerson(e.target.value.toUpperCase())} className="text-[9px] font-black uppercase text-slate-700 outline-none border-b border-dashed border-slate-200 w-full pb-0.5" placeholder="ADD NEW" /><button type="button" onClick={addSalesPersonOption} className="px-2 py-1 text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 rounded">Add</button></div></div>
                  <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cord Name</p><input type="text" value={cordName} onChange={e => setCordName(e.target.value.toUpperCase())} className="text-[10px] md:text-xs font-black uppercase text-slate-800 outline-none border-b border-dashed border-slate-200 w-full pb-1" placeholder="ENTER CORD" /></div>
                  <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Booking Date</p><input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="text-[10px] md:text-xs font-black text-slate-800 outline-none w-full border-b border-dashed border-slate-200 pb-1" /></div>
                  <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected Delivery</p><input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} className="text-[10px] md:text-xs font-black text-slate-800 outline-none w-full border-b border-dashed border-slate-200 pb-1" /></div>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
               <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Customer Name</label>
                  <input type="text" value={customerName} onChange={e => handleNameSearch(e.target.value)} placeholder="Search by name / mobile" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600 uppercase text-xs shadow-sm" />
                  {activeSearchField === 'name' && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                       {searchResults.map(c => <button key={c.id} onClick={() => selectContact(c)} className="w-full px-5 py-3 text-left text-[10px] hover:bg-indigo-50 font-bold uppercase border-b border-slate-50">{c.name} ({c.mobile})</button>)}
                    </div>
                  )}
               </div>
               <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mobile</label>
                  <input type="text" maxLength={10} value={mobile} onChange={e => handleMobileSearch(e.target.value.replace(/\D/g, ''))} placeholder="Search by mobile / name" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-indigo-600 outline-none text-xs shadow-sm" />
                  {activeSearchField === 'mobile' && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                       {searchResults.map(c => <button key={`mob-${c.id}`} onClick={() => selectContact(c)} className="w-full px-5 py-3 text-left text-[10px] hover:bg-indigo-50 font-bold uppercase border-b border-slate-50">{c.name} ({c.mobile})</button>)}
                    </div>
                  )}
               </div>
               
               <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-center shadow-sm min-h-[76px]">
                  <p className="text-[8px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Net Balance (Negative = Excess Payment)</p>
                  <p className="text-xl md:text-2xl font-black text-indigo-700 leading-none">₹{Math.abs(customerLedgerBalance).toLocaleString()} {customerLedgerBalance >= 0 ? 'DR' : 'CR'}</p>
               </div>

               <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Billing Address</label>
                  <input type="text" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs shadow-sm" />
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Shipping Address</label>
                  <input type="text" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} placeholder="Leave blank if same as billing" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs shadow-sm placeholder:italic" />
               </div>
            </div>
          </div>

          {/* LOGISTICS & DOCUMENT TYPE - Matched to SS4 */}
          <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[40px] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b pb-4">Logistics & Document Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Source Store</label>
                  <input type="text" value={storeName} onChange={e => setStoreName(e.target.value.toUpperCase())} placeholder="ENTER STORE" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs shadow-sm" />
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Sales Type</label>
                  <input type="text" value={salesType} onChange={e => setSalesType(e.target.value.toUpperCase())} placeholder="ENTER TYPE" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs shadow-sm" />
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Type</label>
                  <input type="text" value={docType} onChange={e => setDocType(e.target.value.toUpperCase())} placeholder="ENTER TYPE" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs shadow-sm" />
               </div>
            </div>
          </div>

          {/* INTERNAL DETAILS - Matched to SS4 */}
          <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[40px] border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b pb-4">Internal Details (Non-Billed)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
               <div className="lg:col-span-2 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Incentives</p>
                  <div className="grid grid-cols-2 gap-3">
                     <div><label className="block text-[8px] font-black text-slate-300 uppercase mb-1">Arch. Amt (₹)</label><input type="number" value={architectIncentive || 0} onChange={e => {const v = Number(e.target.value); setArchitectIncentive(v); if(totals.subtotal > 0) setArchitectIncentivePercent(Number(((v/totals.subtotal)*100).toFixed(2)));}} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs" /></div>
                     <div><label className="block text-[8px] font-black text-slate-300 uppercase mb-1">Arch. %</label><input type="number" value={architectIncentivePercent || 0} onChange={e => {const v = Number(e.target.value); setArchitectIncentivePercent(v); if(totals.subtotal > 0) setArchitectIncentive(Number(((v*totals.subtotal)/100).toFixed(0)));}} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs" /></div>
                  </div>
               </div>
               <div className="lg:col-span-2 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Logistic Adjustments</p>
                  <div className="grid grid-cols-2 gap-3">
                     <div><label className="block text-[8px] font-black text-slate-300 uppercase mb-1">Fitting Amt (₹)</label><input type="number" value={fittingCharges || 0} onChange={e => {const v = Number(e.target.value); setFittingCharges(v); if(totals.subtotal > 0) setFittingPercent(Number(((v/totals.subtotal)*100).toFixed(2)));}} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs" /></div>
                     <div><label className="block text-[8px] font-black text-slate-300 uppercase mb-1">Fitting %</label><input type="number" value={fittingPercent || 0} onChange={e => {const v = Number(e.target.value); setFittingPercent(v); if(totals.subtotal > 0) setFittingCharges(Number(((v*totals.subtotal)/100).toFixed(0)));}} className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs" /></div>
                  </div>
               </div>
               <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Remarks</p>
                  <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Type remarks..." className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-[11px] font-bold h-12 resize-none outline-none focus:border-indigo-600" />
               </div>
            </div>
          </div>

          {/* ORDER ITEMS LEDGER */}
          <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[40px] border border-slate-200 shadow-sm space-y-6 md:space-y-8">
            <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b pb-4">Order Items Ledger</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6"><SearchableProductSelect products={products} selectedProductId={selectedProductId} onSelect={(id) => { setSelectedProductId(id); const p = products.find(prod => prod.id === id); if(p) setPriceInput(p.salesPrice); }} /></div>
              <div className="grid grid-cols-3 md:contents gap-3">
                <div className="md:col-span-2"><label className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Rate</label><input type="number" value={priceInput} onChange={e => setPriceInput(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-[10px] font-black" /></div>
                <div className="md:col-span-1"><label className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Qty</label><input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-[10px] font-black" /></div>
                <div className="md:col-span-1 flex items-center justify-center pb-2.5"><input type="checkbox" checked={applyGst} onChange={e => setApplyGst(e.target.checked)} className="w-5 h-5 rounded text-indigo-600" /></div>
              </div>
              <button type="button" onClick={addItem} className="w-full md:col-span-2 py-3 md:py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] md:text-xs uppercase shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Append</button>
            </div>

            <div className="flex items-end gap-3 no-print">
              <div>
                <label className="block text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Bulk Discount % (All Lines)</label>
                <input type="number" value={bulkDiscountPercent || ''} onChange={e => setBulkDiscountPercent(Number(e.target.value))} className="w-44 px-3 py-2.5 bg-slate-50 border rounded-xl text-[10px] font-black" />
              </div>
              <button type="button" onClick={applyBulkDiscountToAllLines} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase">Apply to All</button>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-[10px] md:text-xs border-collapse">
                 <thead className="bg-slate-50 text-[8px] md:text-[10px] font-black text-slate-400 uppercase border-b">
                   <tr><th className="py-4 text-left px-4">Detail</th><th className="py-4 text-center">Qty</th><th className="py-4 text-center">Unit Rate</th><th className="py-4 text-center">Discount %</th><th className="py-4 text-center">Tax</th><th className="py-4 text-right px-4">Total</th><th className="py-4"></th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {selectedItems.length === 0 ? (
                     <tr><td colSpan={7} className="py-12 text-center text-slate-300 uppercase font-black italic">No items added to this quotation yet</td></tr>
                   ) : (
                     selectedItems.map((item, idx) => (
                       <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                         <td className="py-4 px-4 font-black uppercase text-slate-700">{item.productName} <span className="text-[8px] text-slate-400 block font-mono mt-0.5">{item.modelNo}</span></td>
                         <td className="py-4 text-center"><input type="number" min={1} value={item.orderedQty} onChange={e => updateLineItem(idx, { orderedQty: Number(e.target.value) || 1 })} className="w-16 text-center px-2 py-1.5 bg-white border rounded-lg font-black text-[10px]" /></td>
                         <td className="py-4 text-center"><input type="number" min={0} value={item.price} onChange={e => updateLineItem(idx, { price: Number(e.target.value) || 0 })} className="w-24 text-center px-2 py-1.5 bg-white border rounded-lg font-black text-[10px]" /></td>
                         <td className="py-4 text-center"><input type="number" min={0} value={item.discountPercent || 0} onChange={e => updateLineItem(idx, { discountPercent: Number(e.target.value) || 0 })} className="w-20 text-center px-2 py-1.5 bg-white border rounded-lg font-black text-[10px]" /></td>
                         <td className="py-4 text-center text-[8px] md:text-[10px] font-black text-slate-400">{item.isGstEnabled ? `${item.gstRate}%` : 'N/A'}</td>
                         <td className="py-4 px-4 text-right font-black text-slate-900">₹{item.total.toLocaleString()}</td>
                         <td className="py-4 text-center"><button onClick={() => removeItem(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
            </div>
          </div>
        </div>

        {/* DOCUMENT SUMMARY CARD - Matched to SS3/SS4 */}
        <div className="lg:block">
           <div className="p-8 md:p-10 bg-slate-950 rounded-2xl md:rounded-[40px] text-white shadow-2xl space-y-6 md:space-y-8 sticky top-6">
              <h3 className="text-[10px] md:text-[11px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-4 text-center">Document Summary</h3>
              <div className="space-y-4">
                 <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest"><span>Gross Base</span><span>₹{totals.subtotal.toLocaleString()}</span></div>
                 <div className="flex justify-between text-[10px] md:text-xs font-bold text-rose-400 uppercase tracking-widest"><span>Net Discount</span><span>-₹{totals.discount.toLocaleString()}</span></div>
                 <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest"><span>Output GST Sum</span><span className="text-indigo-400">+₹{totals.gst.toLocaleString()}</span></div>
                 
                 <div className="pt-8 md:pt-10 border-t border-white/10 flex justify-between items-end">
                    <div className="space-y-1">
                       <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest">Grand Net</p>
                       <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest leading-none">Payable</p>
                    </div>
                    <span className="text-3xl md:text-5xl font-black tracking-tighter">₹{totals.grand.toLocaleString()}</span>
                 </div>
              </div>
              <button type="button" onClick={handleFinalSubmit} className="w-full py-4 md:py-5 bg-indigo-600 text-white font-black rounded-2xl md:rounded-3xl shadow-xl uppercase tracking-widest text-[10px] md:text-xs hover:bg-indigo-700 transition-all active:scale-95 shadow-indigo-600/20">Save All Changes</button>
              
              {editTransaction && (
                <div className="pt-4 border-t border-white/5">
                   <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Ref: {editTransaction.orderNo}</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default NewQuotationPage;
