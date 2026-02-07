
import React from 'react';
import { Company, WarehouseType } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface BookedItemRow {
  id: string;
  productId: string;
  productName: string;
  modelNo: string;
  image?: string;
  qty: number;
  customerName: string;
  salesPerson: string;
  warehouse: WarehouseType;
  date: string;
  source: string;
  sourceType: 'Sales Order' | 'Manual Booking';
}

interface BookedItemsDocumentProps {
  company: Company | null;
  items: BookedItemRow[];
  user: string;
}

const BookedItemsDocument: React.FC<BookedItemsDocumentProps> = ({ company, items, user }) => {
  const { getTemplate } = useSettings();
  const template = getTemplate('std-doc');
  
  if (!company || !template) return null;
  const { settings } = template;

  return (
    <div id="printable-booked-items" className="bg-white p-12 text-slate-900 font-sans leading-relaxed">
      {/* Letterhead Header */}
      <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
        <div className="flex gap-4 items-center">
          {settings.showHeaderLogo && (
            <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center text-3xl font-black rounded-xl shrink-0" style={{ backgroundColor: settings.primaryColor }}>
              {company.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase" style={{ color: settings.accentColor }}>{company.name}</h1>
            <p className="text-[10px] font-bold uppercase text-slate-500">{company.address}, {company.city}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase text-indigo-600">Reserved Stock Audit</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Booked Items Allocation Report</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 px-1">
         <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized By</p>
            <p className="text-[11px] font-black text-slate-800 uppercase">{user}</p>
         </div>
         <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</p>
            <p className="text-[11px] font-bold text-slate-800">{new Date().toLocaleString('en-IN')}</p>
         </div>
      </div>

      <table className="w-full text-sm border-collapse border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <thead className="bg-slate-900 text-white uppercase text-[8px] font-black tracking-widest" style={{ backgroundColor: settings.accentColor }}>
          <tr>
            <th className="p-3 text-left w-8">#</th>
            <th className="p-3 text-left w-12">Img</th>
            <th className="p-3 text-left">Product / SKU</th>
            <th className="p-3 text-center">Qty</th>
            <th className="p-3 text-left">Customer / Rep</th>
            <th className="p-3 text-center">Wh</th>
            <th className="p-3 text-left">Ref / Date</th>
          </tr>
        </thead>
        <tbody className="text-[10px]">
          {items.map((item, i) => (
            <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 break-inside-avoid">
              <td className="p-3 text-center font-bold text-slate-400">{i + 1}</td>
              <td className="p-2">
                <img 
                  src={item.image || `https://picsum.photos/seed/${item.modelNo}/100`} 
                  alt="" 
                  className="w-10 h-10 rounded object-cover border border-slate-100 mx-auto bg-slate-50" 
                />
              </td>
              <td className="p-3">
                <p className="font-black uppercase text-slate-800">{item.productName}</p>
                <p className="text-[9px] font-mono font-bold text-indigo-600">{item.modelNo}</p>
              </td>
              <td className="p-3 text-center font-black">
                 <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100">{item.qty}</span>
              </td>
              <td className="p-3">
                 <p className="font-black uppercase text-slate-700">{item.customerName}</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Rep: {item.salesPerson}</p>
              </td>
              <td className="p-3 text-center">
                 <span className="text-[9px] font-black uppercase text-slate-500">{item.warehouse}</span>
              </td>
              <td className="p-3">
                 <div className="flex flex-col">
                   <span className="font-black text-slate-800 uppercase tracking-tighter">{item.source}</span>
                   <span className="text-[9px] font-bold text-slate-400">{item.date}</span>
                 </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="p-12 text-center text-slate-300 font-black uppercase italic tracking-widest">
                No active stock reservations matching active filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-16 flex justify-between items-start">
         <div className="max-w-xs">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Audit Compliance</p>
            <p className="text-[8px] text-slate-500 font-medium leading-relaxed italic">
              This report represents quantities currently allocated/blocked in the system. Stock availability in Sellable Godowns is automatically reduced by these amounts.
            </p>
         </div>
         <div className="text-right w-64 pt-6 border-t border-slate-200">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventory Auditor Signature</p>
            <p className="text-[8px] text-slate-300 mt-1 uppercase">NexusERP Corporate Hub</p>
         </div>
      </div>
      
      <div className="mt-12 text-center opacity-30">
         <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.4em]">Nexus Intelligence Logistics Engine</p>
      </div>
    </div>
  );
};

export default BookedItemsDocument;
