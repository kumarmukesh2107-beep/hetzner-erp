
import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '../../context/InventoryContext';
import { useSales } from '../../context/SalesContext';
import { usePurchase } from '../../context/PurchaseContext';
import { useContacts } from '../../context/ContactContext';
import { WarehouseType, ContactType } from '../../types';
import { excelDateToISO } from '../../utils/formatters';

type ImportType = 'item_sales' | 'item_purchases' | 'sales_orders';

interface MappingField {
  label: string;
  key: string;
  required: boolean;
  legacy?: boolean;
  type?: 'string' | 'number' | 'date';
}

const FIELD_MAPS: Record<ImportType, MappingField[]> = {
  item_sales: [
    { label: 'Booking Date', key: 'bookingDate', required: true, type: 'date' },
    { label: 'Order No / Invoice No', key: 'orderNo', required: true, type: 'string' },
    { label: 'Customer Name', key: 'partyName', required: true, type: 'string' },
    { label: 'Customer Mobile', key: 'partyMobile', required: false, type: 'string' },
    { label: 'Model No / SKU', key: 'modelNo', required: true, type: 'string' },
    { label: 'Quantity', key: 'qty', required: true, type: 'number' },
    { label: 'Unit Price', key: 'rate', required: false, type: 'number' },
    { label: 'Total Value', key: 'total', required: true, type: 'number' },
    { label: 'Warehouse', key: 'warehouse', required: false, type: 'string' },
    // Expanded Business Fields
    { label: 'Sales Team', key: 'salesTeam', required: false, legacy: true },
    { label: 'Sales Person', key: 'salesPerson', required: false, legacy: true },
    { label: 'Discount %', key: 'discountPercent', required: false, legacy: true, type: 'number' },
    { label: 'Margin %', key: 'marginPercent', required: false, legacy: true, type: 'number' },
    { label: 'Architect Incentive Amt', key: 'architectIncentive', required: false, legacy: true, type: 'number' },
    { label: 'Architect Incentive %', key: 'architectIncentivePercent', required: false, legacy: true, type: 'number' },
    { label: 'Fitting Amount', key: 'fittingCharges', required: false, legacy: true, type: 'number' },
    { label: 'Fitting %', key: 'fittingPercent', required: false, legacy: true, type: 'number' },
    { label: 'Other Charges', key: 'otherCharges', required: false, legacy: true, type: 'number' },
    { label: 'Sales Type', key: 'salesType', required: false, legacy: true },
    { label: 'Store Name', key: 'storeName', required: false, legacy: true },
    { label: 'Invoice Status', key: 'invoiceStatus', required: false, legacy: true },
    { label: 'Expected Delivery Date', key: 'expectedDeliveryDate', required: false, type: 'date' },
  ],
  item_purchases: [
    { label: 'Bill Date', key: 'date', required: true, type: 'date' },
    { label: 'Bill Number', key: 'orderNo', required: true, type: 'string' },
    { label: 'Supplier Name', key: 'partyName', required: true, type: 'string' },
    { label: 'Supplier Mobile', key: 'partyMobile', required: false, type: 'string' },
    { label: 'Model No / SKU', key: 'modelNo', required: true, type: 'string' },
    { label: 'Quantity', key: 'qty', required: true, type: 'number' },
    { label: 'Rate', key: 'rate', required: false, type: 'number' },
    { label: 'Total Value', key: 'total', required: true, type: 'number' },
    { label: 'Warehouse', key: 'warehouse', required: false, type: 'string' }
  ],
  sales_orders: [
    { label: 'Booking Date', key: 'bookingDate', required: true, type: 'date' },
    { label: 'Order Number', key: 'orderNo', required: true, type: 'string' },
    { label: 'Customer Name', key: 'partyName', required: true, type: 'string' },
    { label: 'Customer Mobile', key: 'partyMobile', required: false, type: 'string' },
    { label: 'Grand Total', key: 'total', required: true, type: 'number' },
    { label: 'Store / Branch', key: 'storeName', required: false, legacy: true }
  ]
};

const DataMigrationPage: React.FC = () => {
  const { products, addHistoricalShadowProduct } = useInventory();
  const { importHistoricalSales, importHistoricalOrders } = useSales();
  const { importHistoricalPurchases } = usePurchase();
  const { contacts, addContact } = useContacts();

  const [step, setStep] = useState(1);
  const [importMode, setImportMode] = useState<'live' | 'historical'>('historical');
  const [importType, setImportType] = useState<ImportType>('item_sales');
  
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  const [validationResult, setValidationResult] = useState<{ valid: any[], errors: any[], warnings: any[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length > 0) {
          setRawData(data);
          const detectedHeaders = Object.keys(data[0] as object);
          setHeaders(detectedHeaders);
          
          const initialMapping: Record<string, string> = {};
          FIELD_MAPS[importType].forEach(f => {
            const match = detectedHeaders.find(h => 
              h.toLowerCase().replace(/[\s*_]/g, '') === f.key.toLowerCase() || 
              h.toLowerCase().replace(/[\s*_]/g, '') === f.label.toLowerCase().replace(/[\s*_]/g, '')
            );
            if (match) initialMapping[f.key] = match;
          });
          setMapping(initialMapping);
          setStep(3);
        }
      } catch (err) {
        alert("File parsing error.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateData = () => {
    const valid: any[] = [];
    const errors: any[] = [];
    const warnings: any[] = [];

    rawData.forEach((row, idx) => {
      const rowNum = idx + 2;
      const mappedRow: any = {};
      let hasError = false;
      const rowMsgs: string[] = [];

      FIELD_MAPS[importType].forEach(field => {
        const h = mapping[field.key];
        let val = h ? row[h] : undefined;
        
        // Handle Excel Serial Dates
        if (field.type === 'date' && val) {
          val = excelDateToISO(val);
        }

        // Mandatory enforcement
        if (field.required && (val === undefined || val === null || val === "")) {
          hasError = true;
          rowMsgs.push(`${field.label} missing`);
        }

        // Optional high-lighting
        if (!field.required && (val === undefined || val === null || val === "")) {
          warnings.push(`Row ${rowNum}: ${field.label} is unmapped/empty (Optional)`);
        }

        mappedRow[field.key] = val;
      });

      if (importMode === 'historical') {
        const whVal = String(mappedRow.warehouse || '').toUpperCase();
        if (!whVal || !Object.values(WarehouseType).includes(whVal as any)) {
          mappedRow.warehouse = WarehouseType.ARCHIVE;
          warnings.push(`Row ${rowNum}: Warehouse defaulted to ARCHIVE`);
        }
      }

      if (hasError) errors.push({ rowNum, msgs: rowMsgs, data: row });
      else valid.push(mappedRow);
    });

    setValidationResult({ valid, errors, warnings });
    setStep(4);
  };

  const executeImport = async () => {
    if (!validationResult) return;
    setIsProcessing(true);

    try {
      const processedRecords = validationResult.valid.map(row => {
        let contact = contacts.find(c => c.mobile === String(row.partyMobile || '').replace(/\D/g, ''));
        if (!contact) {
          contact = addContact({
            name: String(row.partyName || 'LEGACY CLIENT').toUpperCase(),
            mobile: row.partyMobile ? String(row.partyMobile).replace(/\D/g, '') : `LEGACY-${Math.random().toString(36).substr(2, 5)}`,
            type: importType === 'item_purchases' ? ContactType.SUPPLIER : ContactType.CUSTOMER,
            contactTypes: [importType === 'item_purchases' ? 'Supplier' : 'Customer'],
            billingAddress: 'MIGRATED FROM ARCHIVE',
            city: 'N/A', state: 'N/A', openingBalance: 0, status: 'Active'
          });
        }

        let productId = "";
        let productName = "";
        if (importType !== 'sales_orders') {
          const liveProd = products.find(p => p.modelNo.toUpperCase() === String(row.modelNo).toUpperCase());
          if (liveProd) {
            productId = liveProd.id;
            productName = liveProd.name;
          } else {
            const shadow = addHistoricalShadowProduct({ 
               modelNo: row.modelNo, 
               name: `LEGACY: ${row.modelNo}`,
               salesPrice: Number(row.rate || 0),
               cost: Number(row.rate || 0)
            });
            productId = shadow.id;
            productName = shadow.name;
          }
        }

        const total = Number(row.total || (Number(row.qty || 0) * Number(row.rate || 0)));
        const rate = Number(row.rate || (total / Number(row.qty || 1)));

        return {
          id: `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          orderNo: row.orderNo,
          date: row.bookingDate || row.date,
          bookingDate: row.bookingDate || row.date,
          expectedDeliveryDate: row.expectedDeliveryDate || row.bookingDate || row.date,
          contactId: contact.id,
          customerName: contact.name,
          customerAddress: contact.billingAddress,
          shippingAddress: contact.billingAddress,
          warehouse: row.warehouse as WarehouseType,
          salesPerson: row.salesPerson || 'MIGRATION',
          salesTeam: row.salesTeam,
          salesType: row.salesType || 'ARCHIVE',
          type: 'ARCHIVE',
          storeName: row.storeName || 'ARCHIVE',
          architectIncentive: Number(row.architectIncentive || 0),
          architectIncentivePercent: Number(row.architectIncentivePercent || 0),
          fittingCharges: Number(row.fittingCharges || 0),
          fittingPercent: Number(row.fittingPercent || 0),
          otherCharges: Number(row.otherCharges || 0),
          discountPercent: Number(row.discountPercent || 0),
          marginPercent: Number(row.marginPercent || 0),
          invoiceStatus: row.invoiceStatus,
          remarks: 'Migrated Historical Data',
          items: importType === 'sales_orders' ? [] : [{
            productId,
            productName,
            modelNo: row.modelNo,
            orderedQty: Number(row.qty || 1),
            deliveredQty: Number(row.qty || 1),
            invoicedQty: Number(row.qty || 1),
            price: rate,
            discount: 0, 
            discountPercent: Number(row.discountPercent || 0),
            gstRate: 0, 
            isGstEnabled: false,
            total
          }],
          subtotal: total,
          totalGst: 0, 
          totalDiscount: 0,
          grandTotal: total,
          isHistorical: importMode === 'historical',
          source: 'migration'
        };
      });

      if (importType === 'item_sales') importHistoricalSales(processedRecords);
      else if (importType === 'item_purchases') importHistoricalPurchases(processedRecords as any);
      else importHistoricalOrders(processedRecords);

      setStep(5);
    } catch (e) {
      console.error(e);
      alert("Execution failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Data Migration Wizard</h1>
           <p className="text-sm text-slate-500 font-medium">Provision live data or archive historical records from legacy ERP.</p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        {step === 1 && (
           <div className="p-20 text-center space-y-12">
              <div className="space-y-4">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Select Migration Strategy</h3>
                 <p className="text-sm text-slate-400 max-w-md mx-auto">Historical mode ensures legacy data is imported safely without affecting live stock or accounting balances.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                 <button 
                  onClick={() => { setImportMode('live'); setStep(2); }}
                  className={`p-10 rounded-[32px] border-4 transition-all text-left space-y-4 ${importMode === 'live' ? 'border-indigo-600 bg-indigo-50/30 shadow-xl' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                 >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${importMode === 'live' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h4 className="text-lg font-black uppercase text-slate-700">Live Import</h4>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase">Update current catalog, stock, and active transactions. High impact.</p>
                 </button>
                 <button 
                  onClick={() => { setImportMode('historical'); setStep(2); }}
                  className={`p-10 rounded-[32px] border-4 transition-all text-left space-y-4 ${importMode === 'historical' ? 'border-indigo-600 bg-indigo-50/30 shadow-xl' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                 >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${importMode === 'historical' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>
                       <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h4 className="text-lg font-black uppercase text-indigo-700">Historical Import</h4>
                    <p className="text-xs text-indigo-400 font-bold leading-relaxed uppercase">Import legacy data for reporting. Zero stock or ledger impact.</p>
                 </button>
              </div>
           </div>
        )}

        {step === 2 && (
           <div className="p-20 space-y-12">
              <div className="text-center space-y-2">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Step 2: Choose Data Type</h3>
                 <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">{importMode.toUpperCase()} MIGRATION SEQUENCE</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                 {(['item_sales', 'item_purchases', 'sales_orders'] as ImportType[]).map(type => (
                    <button key={type} onClick={() => {setImportType(type); fileInputRef.current?.click();}} className="bg-white p-8 rounded-3xl border-2 border-slate-100 hover:border-indigo-600 hover:shadow-xl transition-all group flex flex-col items-center text-center">
                       <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 mb-6 transition-colors">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                       </div>
                       <span className="font-black text-xs uppercase text-slate-700">{type.replace('_', ' ')}</span>
                    </button>
                 ))}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx" className="hidden" />
              <div className="flex justify-center"><button onClick={() => setStep(1)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Cancel & Go Back</button></div>
           </div>
        )}

        {step === 3 && (
           <div className="flex flex-col h-[70vh]">
              <div className="px-10 py-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                 <div><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Step 3: Intelligence Mapping</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Detecting columns for {importType}...</p></div>
                 <button onClick={validateData} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl uppercase text-xs shadow-xl hover:bg-indigo-700">Apply Mappings</button>
              </div>
              <div className="flex-1 flex overflow-hidden">
                 <div className="w-1/3 border-r overflow-y-auto p-10 space-y-6">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2">Fields to Map</p>
                    {FIELD_MAPS[importType].map(f => (
                       <div key={f.key} className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex justify-between">
                             {f.label} {f.required ? <span className="text-rose-500">* REQUIRED</span> : <span className="text-amber-500">OPTIONAL</span>}
                          </label>
                          <select 
                            value={mapping[f.key] || ''} 
                            onChange={e => setMapping({...mapping, [f.key]: e.target.value})}
                            className={`w-full px-4 py-2 text-xs font-bold border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${mapping[f.key] ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
                          >
                             <option value="">-- Unmapped --</option>
                             {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                       </div>
                    ))}
                 </div>
                 <div className="flex-1 bg-slate-50/30 p-10 overflow-x-auto">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">File Content Preview</p>
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                       <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-100">
                             <tr>{headers.map(h => <th key={h} className="px-4 py-3 font-black text-slate-500 whitespace-nowrap uppercase">{h}</th>)}</tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {rawData.slice(0, 10).map((row, rIdx) => (
                                <tr key={rIdx}>{headers.map(h => <td key={h} className="px-4 py-3 text-slate-400 whitespace-nowrap">{String(row[h] || '-')}</td>)}</tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {step === 4 && validationResult && (
           <div className="p-10 space-y-10">
              <div className="flex justify-between items-center bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                 <div className="flex gap-12">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Total Items</p><p className="text-3xl font-black text-slate-800">{rawData.length}</p></div>
                    <div><p className="text-[10px] font-black text-emerald-400 uppercase">Valid Rows</p><p className="text-3xl font-black text-emerald-600">{validationResult.valid.length}</p></div>
                    <div><p className="text-[10px] font-black text-rose-400 uppercase">Errors</p><p className="text-3xl font-black text-rose-600">{validationResult.errors.length}</p></div>
                    <div><p className="text-[10px] font-black text-indigo-400 uppercase">Warnings</p><p className="text-3xl font-black text-indigo-600">{validationResult.warnings.length}</p></div>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => setStep(3)} className="px-8 py-3 bg-white border border-slate-200 font-black rounded-2xl text-[10px] uppercase">Back to Mapping</button>
                    <button 
                      onClick={executeImport}
                      disabled={isProcessing || validationResult.valid.length === 0}
                      className="px-12 py-3 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl disabled:opacity-50"
                    >
                       {isProcessing ? 'PROCESSING...' : `COMMIT ${importMode.toUpperCase()} DATA`}
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-rose-600 uppercase tracking-widest border-b border-rose-50 pb-2">Critical Blockers ({validationResult.errors.length})</h3>
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                       {validationResult.errors.map((err, i) => (
                          <div key={i} className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex justify-between items-center gap-4">
                             <span className="text-[9px] font-black text-rose-300">ROW {err.rowNum}</span>
                             <span className="text-[11px] font-bold text-rose-700 uppercase flex-1">{err.msgs.join(', ')}</span>
                          </div>
                       ))}
                       {validationResult.errors.length === 0 && <p className="text-xs text-slate-300 italic py-10 text-center">Ready to import.</p>}
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-50 pb-2">Optional Items & Adjustments ({validationResult.warnings.length})</h3>
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                       {validationResult.warnings.map((warn, i) => (
                          <div key={i} className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center gap-4">
                             <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                             <span className="text-[11px] font-bold text-amber-700 uppercase">{warn}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        )}

        {step === 5 && (
           <div className="p-32 text-center space-y-10 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200">
                 <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div className="space-y-3">
                 <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Import Complete</h2>
                 <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">Records successfully synchronized. Historical data is now available in reports under the "ARCHIVE" data source.</p>
              </div>
              <div className="flex justify-center gap-4 pt-4">
                 <button onClick={() => setStep(1)} className="px-10 py-4 bg-slate-900 text-white font-black rounded-3xl text-[10px] uppercase shadow-xl tracking-widest">New Import Session</button>
                 <button onClick={() => window.location.hash = '#/reports'} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-3xl text-[10px] uppercase shadow-xl tracking-widest">View in Reports</button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default DataMigrationPage;
