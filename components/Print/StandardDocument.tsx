
import React from 'react';
import { Company, WarehouseType } from '../../types';
import { numberToWords } from '../../utils/formatters';
import { useSettings } from '../../context/SettingsContext';

interface StandardDocumentProps {
  company: Company | null;
  type: string;
  referenceNo: string;
  date: string;
  party: {
    name: string;
    address: string;
    mobile: string;
    gstNo?: string;
  };
  // Enhanced Fields
  salesPerson?: string;
  cordName?: string;
  bookingDate?: string;
  expectedDeliveryDate?: string;
  salesType?: string;
  storeName?: string;
  warehouse?: WarehouseType;
  items: Array<{
    name: string;
    model: string;
    image?: string;
    qty: number;
    rate: number;
    gst?: number;
    total: number;
  }>;
  summary: {
    subtotal: number;
    tax: number;
    discount?: number;
    grandTotal: number;
  };
  remarks?: string;
  templateId?: string;
}

const StandardDocument: React.FC<StandardDocumentProps> = ({ 
  company, type, referenceNo, date, party, warehouse, items, summary, remarks, 
  templateId = 'std-doc', salesPerson, cordName, bookingDate, expectedDeliveryDate, salesType, storeName
}) => {
  const { getTemplate } = useSettings();
  const template = getTemplate(templateId);
  
  if (!company || !template) return null;
  const { settings } = template;

  const headerAlignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }[settings.headerAlignment];

  // Logic for template specific labels
  let documentTitle = type;
  if (templateId === 'ready-items') {
    documentTitle = "READY ITEMS ORDER";
  } else if (templateId === 'made-to-order') {
    documentTitle = "MADE TO ORDER";
  }

  return (
    <div id="printable-erp-doc" className="bg-white p-12 text-slate-900 font-sans leading-relaxed">
      {/* Letterhead */}
      <div className={`border-b-2 border-slate-900 pb-6 mb-8 flex flex-col ${headerAlignClass}`}>
        <div className={`flex gap-4 items-center mb-4 ${settings.headerAlignment === 'center' ? 'justify-center' : settings.headerAlignment === 'right' ? 'justify-end' : ''}`}>
          {settings.showHeaderLogo && (
            <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center text-3xl font-black rounded-xl shrink-0" style={{ backgroundColor: settings.primaryColor }}>
              {company.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase" style={{ color: settings.accentColor }}>{company.name}</h1>
            <p className="text-[10px] font-bold uppercase text-slate-500">{company.address}, {company.city}, {company.state}</p>
          </div>
        </div>
        
        <div className="flex justify-between items-end w-full">
           <div className={`flex-1 ${headerAlignClass}`}>
              <p className="text-[10px] font-black">GSTIN: <span className="text-slate-600">{company.gstNo}</span> | Contact: <span className="text-slate-600">{company.phone}</span></p>
              <p className="text-[10px] font-black">Email: <span className="text-slate-600">{company.email}</span></p>
           </div>
           <div className="text-right shrink-0">
              <h2 className="text-2xl font-black uppercase mb-1" style={{ color: settings.primaryColor }}>{documentTitle}</h2>
              <p className="text-[10px] font-bold text-slate-400">Ref No: <span className="text-slate-900">{referenceNo}</span></p>
              <p className="text-[10px] font-bold text-slate-400">Date: <span className="text-slate-900">{date}</span></p>
           </div>
        </div>
      </div>

      {/* Enhanced Metadata Section (Dates, Personnel, Logistics) */}
      <div className="grid grid-cols-3 gap-6 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100 no-print-background">
         <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Logistics Context</p>
            <p className="text-[10px] font-bold text-slate-700">Store: <span className="text-indigo-600 uppercase">{storeName || 'Main Outlet'}</span></p>
            <p className="text-[10px] font-bold text-slate-700">Dispatch Wh: <span className="text-indigo-600 uppercase">{warehouse || 'Standard'}</span></p>
            <p className="text-[10px] font-bold text-slate-700">Sales Type: <span className="text-indigo-600 uppercase">{salesType || 'Retail'}</span></p>
         </div>
         <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Personnel</p>
            <p className="text-[10px] font-bold text-slate-700">Sales Executive: <span className="uppercase">{salesPerson || 'N/A'}</span></p>
            <p className="text-[10px] font-bold text-slate-700">Coordinator (CORD): <span className="uppercase">{cordName || 'N/A'}</span></p>
         </div>
         <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Critical Timelines</p>
            <p className="text-[10px] font-bold text-slate-700">Booking: <span>{bookingDate || date}</span></p>
            {expectedDeliveryDate && (
              <p className="text-[11px] font-black text-indigo-700 mt-1">Expected Delivery: <span className="underline">{expectedDeliveryDate}</span></p>
            )}
         </div>
      </div>

      {/* Parties Row */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="p-5 border border-slate-200 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-1">Client Information</p>
          <p className="text-sm font-black uppercase text-slate-800">{party.name}</p>
          <p className="text-[10px] text-slate-600 font-medium leading-relaxed mt-1">{party.address}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-black uppercase">
            <p className="text-slate-400">GSTIN: <span className="text-slate-800">{party.gstNo || 'UNREGISTERED'}</span></p>
            <p className="text-slate-400">Contact: <span className="text-slate-800">{party.mobile}</span></p>
          </div>
        </div>
        <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-1">Billing Entity</p>
          <p className="text-sm font-black uppercase text-slate-800">{company.name}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">HQ: {company.city}</p>
          <p className="text-[10px] text-slate-500 mt-2 italic leading-tight">{company.address}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm border-collapse mb-8 rounded-xl overflow-hidden border border-slate-200">
        <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest" style={{ backgroundColor: settings.accentColor }}>
          <tr>
            <th className="p-4 text-left w-12">#</th>
            <th className="p-4 text-left w-16">Item</th>
            <th className="p-4 text-left">Description of Goods</th>
            <th className="p-4 text-center w-20">Qty</th>
            <th className="p-4 text-right w-28">Rate</th>
            <th className="p-4 text-right w-32">Amount</th>
          </tr>
        </thead>
        <tbody className="text-[11px]">
          {items.map((item, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
              <td className="p-4 text-center font-bold text-slate-400">{i + 1}</td>
              <td className="p-2 text-center">
                {item.image ? (
                   <img src={item.image} alt="" className="w-12 h-12 rounded object-cover border border-slate-100 mx-auto" />
                ) : (
                   <div className="w-12 h-12 bg-slate-50 rounded border border-slate-100 flex items-center justify-center text-[8px] text-slate-300 font-bold uppercase mx-auto">NO IMG</div>
                )}
              </td>
              <td className="p-4">
                <p className="font-black uppercase text-slate-800">{item.name}</p>
                <p className="text-[9px] font-mono text-slate-500 mt-0.5">{item.model}</p>
              </td>
              <td className="p-4 text-center font-black text-slate-700">{item.qty}</td>
              <td className="p-4 text-right font-bold text-slate-500">₹{item.rate.toLocaleString()}</td>
              <td className="p-4 text-right font-black text-slate-900">₹{item.total.toLocaleString()}</td>
            </tr>
          ))}
          {/* Minimum space buffer */}
          {items.length < 5 && Array(5 - items.length).fill(0).map((_, i) => (
            <tr key={`fill-${i}`} className="h-12 border-b border-slate-50/50"><td colSpan={6}></td></tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex justify-between items-start gap-12 mb-12">
        <div className="flex-1">
          <div className="mb-6">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Total in Words</p>
            <p className="text-[10px] font-black text-slate-800 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 uppercase">
              {numberToWords(summary.grandTotal)}
            </p>
          </div>
          {remarks && (
            <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Document Remarks</p>
               <p className="text-[10px] text-slate-600 font-medium italic border-l-4 border-slate-200 pl-4 py-1">{remarks}</p>
            </div>
          )}
        </div>
        
        <div className="w-80 border border-slate-200 rounded-[24px] overflow-hidden shadow-sm bg-white">
          <div className="p-4 flex justify-between border-b border-slate-50">
            <span className="text-[10px] font-black uppercase text-slate-400">Net Taxable</span>
            <span className="text-xs font-bold text-slate-700">₹{summary.subtotal.toLocaleString()}</span>
          </div>
          <div className="p-4 flex justify-between border-b border-slate-50">
            <span className="text-[10px] font-black uppercase text-slate-400">GST Output</span>
            <span className="text-xs font-bold text-slate-700">₹{summary.tax.toLocaleString()}</span>
          </div>
          {summary.discount && summary.discount > 0 && (
            <div className="p-4 flex justify-between border-b border-slate-50">
              <span className="text-[10px] font-black uppercase text-slate-400">Discount Applied</span>
              <span className="text-xs font-bold text-rose-600">-₹{summary.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="p-6 flex justify-between items-center text-white" style={{ backgroundColor: settings.primaryColor }}>
            <span className="text-xs font-black uppercase tracking-widest">Grand Total</span>
            <span className="text-2xl font-black">₹{summary.grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Conditional Sections */}
      <div className="grid grid-cols-2 gap-16 border-t-2 border-slate-100 pt-8 mb-16">
        {settings.showBankDetails && (
          <div>
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Bank Settlement Instructions</h4>
            <div className="text-[10px] space-y-1.5 font-bold text-slate-600">
              <p>Beneficiary: <span className="text-slate-900 uppercase">{company.bankDetails?.name}</span></p>
              <p>Account No: <span className="text-indigo-600 font-black">{company.bankDetails?.accountNo}</span></p>
              <p>IFS Code: <span className="text-slate-900">{company.bankDetails?.ifsc}</span></p>
              <p>Branch: <span className="text-slate-900 uppercase">{company.bankDetails?.branch}</span></p>
            </div>
          </div>
        )}
        {settings.showTerms && (
          <div>
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Contractual Terms</h4>
            <ul className="text-[9px] space-y-1 text-slate-500 font-medium list-disc ml-4 leading-relaxed">
              {company.terms?.map((term, idx) => <li key={idx}>{term}</li>)}
            </ul>
          </div>
        )}
      </div>

      {settings.showSignatures && (
        <div className="mt-24 flex justify-between items-end px-4">
          <div className="text-center w-56">
            <div className="border-b-2 border-slate-200 mb-2 h-10"></div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{settings.signatureLabels.left}</p>
          </div>
          <div className="text-center w-64">
            <p className="text-[10px] font-black uppercase text-slate-800 mb-12">FOR {company.name}</p>
            <div className="border-b-2 border-slate-200 mb-2 h-10"></div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{settings.signatureLabels.right}</p>
          </div>
        </div>
      )}

      {settings.footerNotes && (
        <div className="mt-20 text-center border-t border-slate-100 pt-6">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">{settings.footerNotes}</p>
        </div>
      )}
    </div>
  );
};

export default StandardDocument;
