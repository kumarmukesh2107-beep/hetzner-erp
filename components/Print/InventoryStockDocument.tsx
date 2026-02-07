
import React from 'react';
import { Company, Product, WarehouseType } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface InventoryStockDocumentProps {
  company: Company | null;
  products: Product[];
  warehouseFilter: WarehouseType | 'All';
  getStockFn: (id: string, wh: WarehouseType) => number;
  getTotalStockFn: (id: string) => number;
  getSellableStockFn: (id: string) => number;
  templateId?: string;
  user: string;
}

const InventoryStockDocument: React.FC<InventoryStockDocumentProps> = ({ 
  company, products, warehouseFilter, getStockFn, getTotalStockFn, getSellableStockFn, templateId = 'std-doc', user
}) => {
  const { getTemplate } = useSettings();
  const template = getTemplate(templateId);
  
  if (!company || !template) return null;
  const { settings } = template;

  return (
    <div id="printable-inventory-stock" className="bg-white p-12 text-slate-900 font-sans leading-relaxed">
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
            <p className="text-[10px] font-bold uppercase text-slate-500">{company.address}, {company.city}, {company.state}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase text-indigo-600">Stock Availability Audit</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Storage Context: {warehouseFilter === 'All' ? 'GLOBAL (ALL WAREHOUSES)' : warehouseFilter}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8 px-4 border-l-8 border-indigo-600 bg-slate-50 py-6 rounded-r-2xl no-print-background">
         <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Authenticated Auditor</p>
            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{user}</p>
         </div>
         <div className="text-right space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Generation Timestamp</p>
            <p className="text-sm font-bold text-slate-800">{new Date().toLocaleString('en-IN')}</p>
         </div>
      </div>

      <table className="w-full text-sm border-collapse border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest" style={{ backgroundColor: settings.accentColor }}>
          <tr>
            <th className="p-4 text-left w-12">#</th>
            <th className="p-4 text-left w-48">Product Visual</th>
            <th className="p-4 text-left">Item Details & SKU</th>
            <th className="p-4 text-center">Godown</th>
            <th className="p-4 text-center">Display</th>
            <th className="p-4 text-center">Booked</th>
            <th className="p-4 text-center">Repair</th>
            <th className="p-4 text-right bg-indigo-500">Total Net</th>
          </tr>
        </thead>
        <tbody className="text-[10px]">
          {products.map((product, i) => {
            const godown = getStockFn(product.id, WarehouseType.GODOWN);
            const display = getStockFn(product.id, WarehouseType.DISPLAY);
            const booked = getStockFn(product.id, WarehouseType.BOOKED);
            const repair = getStockFn(product.id, WarehouseType.REPAIR);
            const totalQty = getTotalStockFn(product.id);
            
            return (
              <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50/50 break-inside-avoid">
                <td className="p-4 text-center font-bold text-slate-400">{i + 1}</td>
                <td className="p-4 text-center">
                  <img 
                    src={product.image || `https://picsum.photos/seed/${product.modelNo}/100`} 
                    alt="" 
                    className="w-40 h-40 rounded-2xl object-cover border-2 border-slate-100 mx-auto bg-white shadow-md" 
                  />
                </td>
                <td className="p-4">
                  <p className="font-black uppercase text-slate-800 text-sm leading-tight mb-2">{product.name}</p>
                  <p className="text-[11px] font-mono font-bold text-indigo-600 uppercase">SKU: {product.modelNo}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{product.brand} | {product.category}</p>
                </td>
                
                <td className="p-4 text-center font-bold text-slate-700">{godown}</td>
                <td className="p-4 text-center font-bold text-slate-700">{display}</td>
                <td className="p-4 text-center font-black text-amber-600 bg-amber-50/30">{booked}</td>
                <td className="p-4 text-center font-black text-rose-500 bg-rose-50/30">{repair}</td>
                
                <td className="p-4 text-right font-black bg-slate-900 text-white">
                   <span className="text-sm">{totalQty}</span>
                </td>
              </tr>
            );
          })}
          {products.length === 0 && (
            <tr>
              <td colSpan={8} className="p-24 text-center text-slate-300 font-black uppercase italic tracking-[0.2em] text-xs">
                Logistics Cache Empty • Zero matches for current audit filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer Notes & Signatures */}
      <div className="mt-20 flex justify-between items-start">
         <div className="max-w-md">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b-2 border-indigo-100 pb-1 w-fit">Audit Compliance Statement</p>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
              This inventory valuation and availability report is a system-generated document based on real-time transactional logs. Total Net = Godown + Display + Booked + Repair. Physical audits must verify these electronic records quarterly.
            </p>
         </div>
         <div className="text-right w-80 pt-12 border-t-4 border-slate-200">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Chief Logistics Officer Signature</p>
            <p className="text-[10px] text-slate-300 mt-2 uppercase font-bold tracking-widest">{company.name} • Nexus Hub Operations</p>
         </div>
      </div>
      
      <div className="mt-16 text-center opacity-30">
         <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.5em]">Integrated NexusERP Business Intelligence Platform</p>
      </div>
    </div>
  );
};

export default InventoryStockDocument;
