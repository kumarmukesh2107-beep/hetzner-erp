
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product } from '../../types';

interface SearchableProductSelectProps {
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({ products, selectedProductId, onSelect, placeholder = "-- CHOOSE ITEM --", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.modelNo.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-left font-black text-xs uppercase tracking-tight flex items-center justify-between shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
      >
        <span className={`truncate ${selectedProduct ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedProduct ? `${selectedProduct.name} (${selectedProduct.modelNo})` : placeholder}
        </span>
        <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <input
              autoFocus
              type="text"
              placeholder="Search product, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400 italic font-medium">No items matched search</div>
            ) : (
              filteredProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-4 py-3 text-left text-[11px] font-bold uppercase transition-colors flex items-center gap-3 hover:bg-indigo-50 ${selectedProductId === p.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700'}`}
                >
                  <img src={p.image || `https://picsum.photos/seed/${p.modelNo}/100`} className="w-10 h-10 rounded-lg object-cover shadow-sm" alt="" />
                  <div className="min-w-0">
                    <p className="leading-tight truncate">{p.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{p.modelNo} • {p.brand}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableProductSelect;
