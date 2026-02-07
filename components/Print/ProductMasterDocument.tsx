
import React from 'react';
import { Company, Product } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface ProductMasterDocumentProps {
  company: Company | null;
  products: Product[];
  showCost: boolean;
  templateId?: string;
}

const ProductMasterDocument: React.FC<ProductMasterDocumentProps> = ({ 
  company, products, showCost, templateId = 'std-doc' 
}) => {
  const { getTemplate } = useSettings();
  const template = getTemplate(templateId);
  
  if (!company || !template) return null;
  const { settings } = template;

  return (
    <div id="printable-product-master" className="bg-white p-12 text-slate-900 font-sans leading-relaxed">
      {/* Header */}
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
          <h2 className="text-2xl font-black uppercase text-indigo-600">Product Master List</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Printed: {new Date().toLocaleDateString()} • {products.length} Items</p>
        </div>
      </div>

      <table className="w-full text-sm border-collapse mb-8 border border-slate-200">
        <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest" style={{ backgroundColor: settings.accentColor }}>
          <tr>
            <th className="p-3 text-left w-12">#</th>
            <th className="p-3 text-left w-32">Product Image</th>
            <th className="p-3 text-left">Item Details</th>
            <th className="p-3 text-left">Category</th>
            <th className="p-3 text-right">Sales Price</th>
            {showCost && <th className="p-3 text-right">Cost Price</th>}
          </tr>
        </thead>
        <tbody className="text-[11px]">
          {products.map((product, i) => (
            <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50/50 break-inside-avoid">
              <td className="p-3 text-center font-bold text-slate-400">{i + 1}</td>
              <td className="p-4">
                {product.image ? (
                   <img src={product.image} alt="" className="w-32 h-32 rounded-xl object-cover border-2 border-slate-100 shadow-sm mx-auto" />
                ) : (
                   <div className="w-32 h-32 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase text-center mx-auto">No Preview Available</div>
                )}
              </td>
              <td className="p-3">
                <p className="text-sm font-black uppercase text-slate-800 leading-tight">{product.name}</p>
                <p className="text-[10px] font-mono text-indigo-600 mt-1 font-bold">SKU: {product.modelNo}</p>
                <p className="text-[9px] text-slate-400 uppercase mt-1 font-bold">{product.brand}</p>
              </td>
              <td className="p-3">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-tight">{product.category}</span>
              </td>
              <td className="p-3 text-right font-black text-sm text-slate-900">₹{product.salesPrice.toLocaleString()}</td>
              {showCost && <td className="p-3 text-right font-bold text-rose-600 italic">₹{product.cost.toLocaleString()}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-20 border-t border-slate-100 pt-6 text-center">
         <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Internal System Audit Record • NexusERP Logistics Module</p>
      </div>
    </div>
  );
};

export default ProductMasterDocument;
