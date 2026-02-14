
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSales } from '../context/SalesContext';
import { useInventory } from '../context/InventoryContext';
import { useAccounting } from '../context/AccountingContext';
import { useCompany } from '../context/CompanyContext';
import { useSettings } from '../context/SettingsContext';
import { SalesStatus, SalesTransaction, WarehouseType } from '../types';
import { formatDisplayDate } from '../utils/formatters';
import NewQuotationPage from './NewQuotationPage';
import SalesReportsHub from './SalesReportsHub';
import StandardDocument from '../components/Print/StandardDocument';
import { triggerStandalonePrint } from '../utils/printService';
import * as XLSX from 'xlsx';

const StatusBadge: React.FC<{ status: SalesStatus, isHistorical?: boolean }> = ({ status, isHistorical }) => {
  if (isHistorical) {
    return (
      <span className="bg-slate-900 text-white px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
        <svg className="w-2.5 h-2.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        MIGRATED (ARCHIVE)
      </span>
    );
  }
  
  const config = {
    [SalesStatus.QUOTATION]: 'bg-slate-100 text-slate-600',
    [SalesStatus.QUOTATION_SENT]: 'bg-indigo-50 text-indigo-500',
    [SalesStatus.SALES_ORDER]: 'bg-indigo-100 text-indigo-600',
    [SalesStatus.PARTIALLY_DELIVERED]: 'bg-orange-50 text-orange-500',
    [SalesStatus.FULLY_DELIVERED]: 'bg-orange-100 text-orange-600',
    [SalesStatus.PARTIALLY_BILLED]: 'bg-emerald-50 text-emerald-600',
    [SalesStatus.FULLY_BILLED]: 'bg-slate-900 text-white',
    [SalesStatus.CANCELLED]: 'bg-red-100 text-red-600',
    [SalesStatus.MIGRATED]: 'bg-slate-200 text-slate-500',
  };
  return (
    <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-widest ${config[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const SalesPage: React.FC = () => {
  const { sales, markQuotationSent, confirmOrder, recordDelivery, createInvoice, addSalePayment, reconcileAdvance } = useSales();
  const { activeCompany } = useCompany();
  const { accounts } = useAccounting();
  const { templates } = useSettings();
  const location = useLocation();
  
  const queryTab = new URLSearchParams(location.search).get('tab') as 'quotations' | 'orders' | 'intelligence' | null;
  const [activeTab, setActiveTab] = useState<'quotations' | 'orders' | 'intelligence'>(queryTab || 'quotations');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterRep, setFilterRep] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterDate, setFilterDate] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesTransaction, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<SalesTransaction | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('std-doc');

  const [deliveryInputs, setDeliveryInputs] = useState<Record<string, number>>({});
  const [deliveryWarehouse, setDeliveryWarehouse] = useState<WarehouseType>(WarehouseType.GODOWN);
  const [invoiceInputs, setInvoiceInputs] = useState<Record<string, number>>({});
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [advanceAdjustAmount, setAdvanceAdjustAmount] = useState(0);

  const selectedTx = useMemo<SalesTransaction | null>(() => sales.find(s => s.id === selectedTxId) || null, [sales, selectedTxId]);

  useEffect(() => {
    if (!selectedTx) {
      setDeliveryInputs({});
      setInvoiceInputs({});
      setPaymentAmount(0);
      setPaymentRef('');
      setAdvanceAdjustAmount(0);
      return;
    }
    setDeliveryWarehouse(selectedTx.warehouse);
  }, [selectedTx]);

  const processedData = useMemo(() => {
    let result = activeTab === 'quotations' 
      ? sales.filter(s => s.status === SalesStatus.QUOTATION || s.status === SalesStatus.QUOTATION_SENT)
      : sales.filter(s => s.status !== SalesStatus.QUOTATION && s.status !== SalesStatus.QUOTATION_SENT);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => s.orderNo.toLowerCase().includes(term) || s.customerName.toLowerCase().includes(term));
    }

    if (filterCustomer) {
      result = result.filter(s => s.customerName.toLowerCase().includes(filterCustomer.toLowerCase()));
    }

    if (filterRep) {
      result = result.filter(s => s.salesPerson?.toLowerCase().includes(filterRep.toLowerCase()));
    }

    if (filterStatus) {
      result = result.filter(s => s.status === filterStatus);
    }

    if (filterWarehouse) {
      result = result.filter(s => s.warehouse === filterWarehouse);
    }

    if (filterDate.start) {
      result = result.filter(s => new Date(s.date) >= new Date(filterDate.start));
    }
    if (filterDate.end) {
      result = result.filter(s => new Date(s.date) <= new Date(filterDate.end));
    }

    result.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [sales, activeTab, searchTerm, filterCustomer, filterRep, filterStatus, filterWarehouse, filterDate, sortConfig]);

  const handleEdit = (tx: SalesTransaction) => {
    if (tx.isHistorical) {
      alert("Historical records are read-only and cannot be modified.");
      return;
    }
    setEditingTx(tx);
    setShowNewForm(true);
    setSelectedTxId(null);
  };


  const handleConfirmQuotation = () => {
    if (!selectedTx) return;
    const ok = confirmOrder(selectedTx.id);
    if (ok) alert('Quotation confirmed. Sales order created.');
  };

  const handleRecordDelivery = () => {
    if (!selectedTx) return;
    const deliveries = Object.entries(deliveryInputs)
      .map(([productId, qty]) => ({ productId, qty: Number(qty) || 0 }))
      .filter(d => d.qty > 0);
    if (deliveries.length === 0) return alert('Enter delivery quantities.');
    if (recordDelivery(selectedTx.id, deliveries, deliveryWarehouse)) {
      alert('Delivery order recorded.');
      setDeliveryInputs({});
    }
  };

  const handleCreateInvoice = () => {
    if (!selectedTx) return;
    const invoiceLines = Object.entries(invoiceInputs)
      .map(([productId, qty]) => ({ productId, qty: Number(qty) || 0 }))
      .filter(i => i.qty > 0);
    if (invoiceLines.length === 0) return alert('Enter invoice quantities.');
    if (createInvoice(selectedTx.id, invoiceLines)) {
      alert('Invoice generated successfully.');
      setInvoiceInputs({});
    }
  };

  const handleCollectPayment = () => {
    if (!selectedTx) return;
    if (!paymentAmount || paymentAmount <= 0) return alert('Enter payment amount.');
    if (!paymentAccountId) return alert('Select account.');
    addSalePayment(selectedTx.id, paymentAmount, paymentAccountId, paymentRef || `RCPT-${Date.now().toString().slice(-6)}`);
    alert('Payment collected and mapped to invoice.');
    setPaymentAmount(0);
    setPaymentRef('');
  };

  const handleMapAdvance = () => {
    if (!selectedTx) return;
    if (!advanceAdjustAmount || advanceAdjustAmount <= 0) return alert('Enter advance amount to map.');
    reconcileAdvance(selectedTx.id, advanceAdjustAmount);
    alert('Advance mapped against invoice.');
    setAdvanceAdjustAmount(0);
  };

  const executePrint = () => {
    if (!selectedTx) return;
    triggerStandalonePrint('printable-erp-doc', `Document_${selectedTx.orderNo}`);
  };

  const toggleSort = (key: keyof SalesTransaction) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };


  const handleExportSales = () => {
    if (processedData.length === 0) {
      alert('No sales records available to export.');
      return;
    }

    const rows = processedData.map((tx) => {
      const deliveredQty = tx.items.reduce((acc, item) => acc + (item.deliveredQty || 0), 0);
      const invoicedQty = tx.items.reduce((acc, item) => acc + (item.invoicedQty || 0), 0);
      const orderedQty = tx.items.reduce((acc, item) => acc + (item.orderedQty || 0), 0);

      return {
        'Order No': tx.orderNo,
        'Booking Date': tx.bookingDate || tx.date,
        'Customer': tx.customerName,
        'Customer Address': tx.customerAddress || '',
        'Sales Person': tx.salesPerson || '',
        'Warehouse': tx.warehouse,
        'Status': tx.status,
        'Ordered Qty': orderedQty,
        'Delivered Qty': deliveredQty,
        'Invoiced Qty': invoicedQty,
        'Subtotal': tx.subtotal,
        'Discount': tx.totalDiscount,
        'GST': tx.totalGst,
        'Grand Total': tx.grandTotal,
        'Amount Paid': tx.amountPaid,
        'Pending Amount': Number((tx.grandTotal - tx.amountPaid).toFixed(2)),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    const tabLabel = activeTab === 'quotations' ? 'quotations' : 'orders';
    XLSX.writeFile(workbook, `sales_${tabLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (showNewForm) return <NewQuotationPage onBack={() => { setShowNewForm(false); setEditingTx(null); }} editTransaction={editingTx} />;

  return (
    <div className="space-y-6 px-1 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
           <h1 className="text-xl md:text-2xl font-bold text-slate-800 uppercase tracking-tight">Sales Operations</h1>
           <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Quotations & Active Sales Orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportSales} className="w-full md:w-auto px-4 py-2.5 bg-white text-slate-700 border border-slate-200 font-black rounded-xl uppercase tracking-widest text-[10px] shadow-sm hover:bg-slate-50 transition-all">Export</button>
          <button onClick={() => { setEditingTx(null); setShowNewForm(true); }} className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-lg hover:bg-indigo-700 transition-all">Create Quotation</button>
        </div>
      </div>

      <div className="flex items-center space-x-1 p-1 bg-slate-200 rounded-2xl w-full md:w-fit tabs-row no-print overflow-x-auto scrollbar-hide">
        {(['quotations', 'orders', 'intelligence'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'intelligence' ? <SalesReportsHub /> : (
        <>
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 p-4 md:p-5 rounded-2xl md:rounded-[24px] border border-slate-200 shadow-sm flex flex-col md:flex-row flex-wrap items-stretch md:items-end gap-3 md:gap-4 no-print">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Ref / Customer</label>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="QT-XXXX or Name..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="w-full md:w-40">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Rep</label>
              <input type="text" value={filterRep} onChange={e => setFilterRep(e.target.value)} placeholder="Sales Person" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
            </div>
            <div className="w-full md:w-40">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none uppercase">
                <option value="">All Statuses</option>
                {Object.values(SalesStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Warehouse</label>
              <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none uppercase">
                <option value="">All Storage</option>
                {Object.values(WarehouseType).map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="w-full md:w-32">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Start</label>
              <input type="date" value={filterDate.start} onChange={e => setFilterDate({...filterDate, start: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold" />
            </div>
            <div className="w-full md:w-32">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">End</label>
              <input type="date" value={filterDate.end} onChange={e => setFilterDate({...filterDate, end: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold" />
            </div>
            <button onClick={() => {setFilterStatus(''); setFilterRep(''); setFilterWarehouse(''); setSearchTerm(''); setFilterDate({start:'', end:''});}} className="px-4 py-2 text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 rounded-xl shrink-0">Reset</button>
          </div>

          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[1000px]">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                  <tr>
                    <th className="px-6 py-5 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('orderNo')}>Order No</th>
                    <th className="px-6 py-5 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('customerName')}>Customer</th>
                    <th className="px-6 py-5 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('date')}>Booking Date ↓</th>
                    <th className="px-6 py-5">Personnel</th>
                    <th className="px-6 py-5 text-right">Amount</th>
                    <th className="px-6 py-5 text-center">QTY (D/I)</th>
                    <th className="px-4 py-5 text-center">Status</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-slate-300 font-black uppercase text-xs italic tracking-widest">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    processedData.map(tx => {
                      const totalDelivered = tx.items.reduce((acc, i) => acc + (i.deliveredQty || 0), 0);
                      const totalInvoiced = tx.items.reduce((acc, i) => acc + (i.invoicedQty || 0), 0);
                      
                      return (
                        <tr key={tx.id} onClick={() => setSelectedTxId(tx.id)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                          <td className="px-6 py-4">
                             <p className="font-black text-indigo-600 text-xs md:text-sm leading-none">{tx.orderNo}</p>
                             {tx.isHistorical && <p className="text-[7px] text-slate-400 font-black uppercase tracking-tighter mt-1.5">Legacy Data</p>}
                          </td>
                          <td className="px-6 py-4 font-bold uppercase text-slate-700 text-[11px] md:text-xs truncate max-w-[140px]">{tx.customerName}</td>
                          <td className="px-6 py-4 text-[10px] md:text-xs font-bold text-slate-500">{formatDisplayDate(tx.bookingDate || tx.date)}</td>
                          <td className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-tighter">{tx.salesPerson || '-'}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 text-xs md:text-sm">₹{tx.grandTotal.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                             <div className="flex items-center justify-center gap-1.5">
                                <span className="text-orange-600 font-black text-[10px]">{totalDelivered}</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-emerald-600 font-black text-[10px]">{totalInvoiced}</span>
                             </div>
                          </td>
                          <td className="px-4 py-4 text-center"><StatusBadge status={tx.status} isHistorical={tx.isHistorical} /></td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {!tx.isHistorical && (
                               <button onClick={(e) => { e.stopPropagation(); handleEdit(tx); }} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:text-indigo-600">
                                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                               </button>
                            )}
                            <button className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:text-indigo-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedTx && (
        <div id="print-modal-container" className="fixed inset-0 z-[100] flex flex-col items-center p-2 md:p-8 bg-slate-950/90 backdrop-blur-sm no-print">
           <div className="w-full max-w-5xl bg-slate-900 text-white rounded-t-2xl md:rounded-t-[32px] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-white/10 shadow-2xl shrink-0">
              <div className="flex items-center gap-2 md:gap-4">
                 <h2 className="text-[9px] md:text-sm font-black tracking-widest uppercase text-slate-400">Preview</h2>
                 <h3 className="text-xs md:text-lg font-black tracking-tight uppercase truncate max-w-[100px] md:max-w-none">{selectedTx.orderNo}</h3>
                 {selectedTx.isHistorical && <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-lg">READ ONLY ARCHIVE</span>}
              </div>
              
              <div className="flex items-center gap-2">
                 <button onClick={executePrint} className="px-4 md:px-6 py-2 bg-indigo-600 text-white text-[9px] md:text-[10px] font-black uppercase rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-1 md:gap-2 shadow-xl shadow-indigo-500/20 active:scale-95">
                    Print
                 </button>
                 <button onClick={() => setSelectedTxId(null)} className="p-1.5 md:p-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-lg active:scale-95">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
           </div>

           <div id="printable-sales-content" className="w-full max-w-5xl bg-white shadow-2xl overflow-y-auto flex-1 relative scrollbar-hide rounded-b-2xl md:rounded-b-[32px]">
              {selectedTx.isHistorical && (
                <div className="p-3 bg-amber-50 border-b border-amber-100 flex items-center justify-center gap-2 text-amber-800 font-bold text-[10px] uppercase">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   This record is imported from legacy system for reporting only.
                </div>
              )}
              <div className="min-h-full">
                 <StandardDocument 
                   company={activeCompany}
                   templateId={selectedTemplateId}
                   type={selectedTx.status === SalesStatus.QUOTATION || selectedTx.status === SalesStatus.QUOTATION_SENT ? 'Quotation' : 'Sales Invoice'}
                   referenceNo={selectedTx.orderNo}
                   date={formatDisplayDate(selectedTx.date)}
                   party={{
                     name: selectedTx.customerName,
                     address: selectedTx.customerAddress,
                     mobile: selectedTx.contactId
                   }}
                   salesPerson={selectedTx.salesPerson}
                   cordName={selectedTx.cordName}
                   bookingDate={formatDisplayDate(selectedTx.bookingDate || selectedTx.date)}
                   expectedDeliveryDate={formatDisplayDate(selectedTx.expectedDeliveryDate || '')}
                   salesType={selectedTx.salesType}
                   storeName={selectedTx.storeName}
                   warehouse={selectedTx.warehouse}
                   items={selectedTx.items.map(it => ({
                     name: it.productName,
                     model: it.modelNo,
                     image: it.productImage,
                     qty: it.orderedQty,
                     rate: it.price,
                     total: it.total
                   }))}
                   summary={{
                     subtotal: selectedTx.subtotal,
                     tax: selectedTx.totalGst,
                     discount: selectedTx.totalDiscount,
                     grandTotal: selectedTx.grandTotal
                   }}
                   remarks={selectedTx.remarks}
                 />
              </div>

              {!selectedTx.isHistorical && (
                <div className="p-6 md:p-10 bg-slate-50 border-t border-slate-100 space-y-6 no-print">
                  {(selectedTx.status === SalesStatus.QUOTATION || selectedTx.status === SalesStatus.QUOTATION_SENT) && (
                    <div className="bg-indigo-600 text-white rounded-3xl p-6 flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-black uppercase">Confirm Quotation</h4>
                        <p className="text-xs opacity-80">On confirmation, quote becomes sales order and quantities move to booked stock.</p>
                      </div>
                      <button onClick={handleConfirmQuotation} className="px-6 py-3 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase">Confirm Quote</button>
                    </div>
                  )}

                  {(selectedTx.status === SalesStatus.SALES_ORDER || selectedTx.status === SalesStatus.PARTIALLY_DELIVERED) && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-700">Delivery Order Generation (Partial Supported)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <select value={deliveryWarehouse} onChange={e => setDeliveryWarehouse(e.target.value as WarehouseType)} className="px-3 py-2 border rounded-xl text-xs font-black uppercase">{Object.values(WarehouseType).map(w => <option key={w} value={w}>{w}</option>)}</select>
                      </div>
                      <div className="space-y-2">{selectedTx.items.map(it => {
                        const pending = it.orderedQty - it.deliveredQty;
                        return <div key={it.productId} className="flex items-center justify-between"><p className="text-xs font-bold uppercase">{it.productName} <span className="text-slate-400">(Pending: {pending})</span></p><input type="number" min={0} max={pending} value={deliveryInputs[it.productId] || 0} onChange={e => setDeliveryInputs(prev => ({...prev, [it.productId]: Number(e.target.value)}))} className="w-24 px-2 py-1.5 border rounded-lg text-xs font-black" /></div>
                      })}</div>
                      <button onClick={handleRecordDelivery} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">Record Delivery</button>
                    </div>
                  )}

                  {(selectedTx.status === SalesStatus.PARTIALLY_DELIVERED || selectedTx.status === SalesStatus.FULLY_DELIVERED || selectedTx.status === SalesStatus.PARTIALLY_BILLED) && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-700">Generate Invoice (Partial Supported)</h4>
                      <div className="space-y-2">{selectedTx.items.map(it => {
                        const pendingInv = it.deliveredQty - it.invoicedQty;
                        return <div key={it.productId} className="flex items-center justify-between"><p className="text-xs font-bold uppercase">{it.productName} <span className="text-slate-400">(Delivered: {it.deliveredQty} | Invoiced: {it.invoicedQty})</span></p><input type="number" min={0} max={Math.max(0,pendingInv)} value={invoiceInputs[it.productId] || 0} onChange={e => setInvoiceInputs(prev => ({...prev, [it.productId]: Number(e.target.value)}))} className="w-24 px-2 py-1.5 border rounded-lg text-xs font-black" /></div>
                      })}</div>
                      <button onClick={handleCreateInvoice} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Generate Invoice</button>
                    </div>
                  )}

                  {(selectedTx.status === SalesStatus.PARTIALLY_BILLED || selectedTx.status === SalesStatus.FULLY_BILLED) && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-700">Collect Payment / Map Advance</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input type="number" value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} placeholder="Payment Amount" className="px-3 py-2 border rounded-xl text-xs font-black" />
                        <select value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} className="px-3 py-2 border rounded-xl text-xs font-black"><option value="">Select Account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                        <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Reference" className="px-3 py-2 border rounded-xl text-xs font-black" />
                      </div>
                      <button onClick={handleCollectPayment} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Collect Payment</button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="number" value={advanceAdjustAmount || ''} onChange={e => setAdvanceAdjustAmount(Number(e.target.value))} placeholder="Map Existing Advance" className="px-3 py-2 border rounded-xl text-xs font-black" />
                        <button onClick={handleMapAdvance} className="py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase">Map Advance</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

           </div>
           <div className="absolute inset-0 -z-10 cursor-pointer" onClick={() => setSelectedTxId(null)} />
        </div>
      )}
    </div>
  );
};

export default SalesPage;
