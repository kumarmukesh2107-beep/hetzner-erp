
import React from 'react';
import { Company, Product } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface ProductCatalogDocumentProps {
  company: Company | null;
  products: Product[];
  templateId?: string;
}

const ProductCatalogDocument: React.FC<ProductCatalogDocumentProps> = ({ 
  company, products, templateId = 'std-doc' 
}) => {
  const { getTemplate } = useSettings();
  const template = getTemplate(templateId);
  
  if (!company || !template) return null;
  const { settings } = template;

  return (
    <div id="printable-product-catalog" className="bg-white p-12 text-slate-900 font-sans leading-relaxed">
      {/* Catalog Header */}
      <div className="border-b-4 border-slate-900 pb-8 mb-12 flex justify-between items-end">
        <div className="flex gap-6 items-center">
          {settings.showHeaderLogo && (
            <div className="w-24 h-24 bg-slate-900 text-white flex items-center justify-center text-5xl font-black rounded-2xl shrink-0" style={{ backgroundColor: settings.primaryColor }}>
              {company.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase" style={{ color: settings.accentColor }}>{company.name}</h1>
            <p className="text-sm font-bold uppercase text-slate-500 tracking-widest">Premium Product Catalog</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Company Contact</p>
          <p className="text-xs font-bold text-slate-700">{company.phone}</p>
          <p className="text-xs font-bold text-slate-700">{company.email}</p>
        </div>
      </div>

      <div className="mb-12">
        <p className="text-xs text-slate-400 uppercase font-black tracking-[0.3em] mb-4">Official Collection</p>
        <div className="h-1 w-24 bg-indigo-600 rounded-full" />
      </div>

      {/* Catalog Grid - Brochure Style */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-16">
        {products.map((product) => (
          <div key={product.id} className="flex flex-col group break-inside-avoid mb-8">
            <div className="w-full aspect-[4/3] bg-slate-50 rounded-[32px] overflow-hidden border border-slate-100 mb-6 shadow-sm">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-xs uppercase tracking-widest bg-slate-100">No Image Available</div>
              )}
            </div>
            <div className="px-2">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">{product.category}</p>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{product.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Model: {product.modelNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900">₹{product.salesPrice.toLocaleString('en-IN')}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">MRP Incl. Taxes</p>
                </div>
              </div>
              <div className="h-px w-full bg-slate-100 my-4" />
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Collection: {product.range} Range • Quality Assured • Distributed by {company.name}.
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-20 pt-12 border-t border-slate-100 flex justify-between items-end">
        <div className="max-w-xs">
          <h4 className="text-xs font-black uppercase text-slate-800 mb-2">Visit Our Experience Center</h4>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{company.address}, {company.city}, {company.state}</p>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Pricing Subject to Change • Valid until further notice</p>
        </div>
      </div>
    </div>
  );
};

export default ProductCatalogDocument;
