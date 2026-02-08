
import React, { useState, useMemo, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { Product, UserRole, ProductCategory, WarehouseType } from '../types';
import * as XLSX from 'xlsx';
import { triggerStandalonePrint } from '../utils/printService';
import ProductMasterDocument from '../components/Print/ProductMasterDocument';
import ProductTagDocument from '../components/Print/ProductTagDocument';

const INITIAL_FORM_DATA: Partial<Product> = {
  name: '',
  modelNo: '',
  brand: '',
  category: '',
  color: 'NA',
  range: '',
  salesPrice: 0,
  cost: 0,
  unit: 'Units',
  trackInventory: true,
  image: ''
};

interface LogEntry {
  type: 'success' | 'warning' | 'error';
  message: string;
  subMessage?: string;
  stats?: { total: number; success: number; updated: number; failed: number; newCategories?: string[] };
  errors?: string[];
  timestamp: string;
}

const ProductDetailModal: React.FC<{ product: Product; isOpen: boolean; onClose: () => void }> = ({ product, isOpen, onClose }) => {
  const { getProductStock } = useInventory();
  if (!isOpen) return null;
  
  const stock = getProductStock(product.id);
  const getQty = (type: WarehouseType) => stock.find(s => s.warehouse === type)?.quantity || 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
       <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="px-8 py-5 border-b bg-slate-900 text-white flex items-center justify-between">
             <h2 className="text-lg font-black uppercase tracking-tight">SKU Detail View</h2>
             <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
          <div className="p-8 space-y-6">
             <div className="flex items-center gap-6">
                <img src={product.image} className="w-32 h-32 rounded-2xl object-cover border border-slate-100 shadow-sm" alt="" />
                <div>
                   <h3 className="text-2xl font-black text-slate-800 uppercase leading-none mb-1">{product.name}</h3>
                   <p className="text-sm font-mono font-black text-indigo-600 uppercase">{product.modelNo}</p>
                   <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase">{product.category}</span>
                </div>
             </div>

             <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Warehouse Distribution</p>
                <div className="grid grid-cols-4 gap-2">
                   <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Godown</p>
                      <p className="text-sm font-black text-indigo-600">{getQty(WarehouseType.GODOWN)}</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Display</p>
                      <p className="text-sm font-black text-indigo-600">{getQty(WarehouseType.DISPLAY)}</p>
                   </div>
                   <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-center">
                      <p className="text-[8px] font-black text-amber-500 uppercase mb-1">Booked</p>
                      <p className="text-sm font-black text-amber-600">{getQty(WarehouseType.BOOKED)}</p>
                   </div>
                   <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 text-center">
                      <p className="text-[8px] font-black text-rose-500 uppercase mb-1">Repair</p>
                      <p className="text-sm font-black text-rose-600">{getQty(WarehouseType.REPAIR)}</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[24px]">
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Brand Identity</p><p className="font-bold text-slate-800 uppercase">{product.brand}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Product Range</p><p className="font-bold text-slate-800 uppercase">{product.range}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Colour</p><p className="font-bold text-slate-800 uppercase">{product.color || 'NA'}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Standard Unit</p><p className="font-bold text-slate-800 uppercase">{product.unit}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Inventory Mode</p><p className="font-bold text-emerald-600 uppercase">{product.trackInventory ? 'TRACKED' : 'NOT TRACKED'}</p></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-[24px]">
                   <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Selling Rate</p>
                   <p className="text-2xl font-black text-indigo-700">₹{product.salesPrice.toLocaleString()}</p>
                </div>
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-[24px]">
                   <p className="text-[10px] font-black text-rose-400 uppercase mb-1">Procurement Cost</p>
                   <p className="text-2xl font-black text-rose-700">₹{product.cost.toLocaleString()}</p>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

const QuickAddCategoryModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (name: string) => void }> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
       <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="px-8 py-5 border-b bg-indigo-600 text-white flex items-center justify-between">
             <h2 className="text-lg font-black uppercase tracking-tight">New Category</h2>
             <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
          <div className="p-8 space-y-6">
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Category Name</label>
                <input autoFocus required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600 uppercase text-sm" placeholder="e.g. DINING CHAIRS" />
             </div>
             <button onClick={() => { if(name.trim()) { onSave(name.trim()); setName(''); } }} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Add Category</button>
          </div>
       </div>
    </div>
  );
};

const ProductsPage: React.FC = () => {
  const { products, addProduct, getTotalStock, bulkImportProducts, bulkImportStocks, linkProductImages, categories, addCategory, updateCategory } = useInventory();
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'categories'>('list');
  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProductForTag, setSelectedProductForTag] = useState<Product | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterBrand, setFilterBrand] = useState('All');

  const [importMode, setImportMode] = useState<'add_only' | 'update_only' | 'add_update'>('add_update');
  const [formData, setFormData] = useState<Partial<Product>>(INITIAL_FORM_DATA);
  
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState<LogEntry[]>([]);
  
  // Resolution step for imports
  const [pendingImportData, setPendingImportData] = useState<any[] | null>(null);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [selectedMissing, setSelectedMissing] = useState<string[]>([]);

  const productInputRef = useRef<HTMLInputElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const localImageInputRef = useRef<HTMLInputElement>(null);

  const canImport = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  const brands = useMemo(() => ['All', ...new Set(products.map(p => p.brand))].sort(), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm.trim() || p.name.toLowerCase().includes(term) || p.modelNo.toLowerCase().includes(term);
      const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
      const matchesBrand = filterBrand === 'All' || p.brand === filterBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [products, searchTerm, filterCategory, filterBrand]);

  const addLog = (type: LogEntry['type'], message: string, subMessage?: string, errors?: string[], stats?: LogEntry['stats']) => {
    setImportResults(prev => [{
      type,
      message,
      subMessage,
      errors,
      stats,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  };

  const handleProductImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (!data || data.length === 0) {
          addLog('error', 'Import Failed', 'No valid rows found.');
          return;
        }

        const res = bulkImportProducts(data, importMode);
        
        if (res.newCategories.length > 0) {
           setPendingImportData(data);
           setMissingCategories(res.newCategories);
           setSelectedMissing(res.newCategories);
           addLog('warning', 'New Categories Detected', `Identified ${res.newCategories.length} categories not in system. Please resolve below.`);
        } else {
           finalizeImport(data);
        }
      } catch (err) {
        addLog('error', 'Parse Error', 'The Excel file could not be read.');
      } finally {
        setLoading(false);
        if (productInputRef.current) productInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const finalizeImport = (data: any[], createCats?: string[]) => {
     const res = bulkImportProducts(data, importMode, createCats);
     const finalType = res.success + res.updated === 0 ? 'error' : (res.failed > 0 ? 'warning' : 'success');
     addLog(finalType, 'Sync Finished', `Processed ${res.total} rows.`, res.errors, { ...res });
     setPendingImportData(null);
     setMissingCategories([]);
  };

  const handleStockImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        const res = bulkImportStocks(data);
        addLog(res.failed > 0 ? 'warning' : 'success', 'Stock Sync Finished', `Updated ${res.success} items.`, res.errors, { ...res });
      } catch (err) {
        addLog('error', 'Critical Error', 'Stock file parsing failed.');
      } finally {
        setLoading(false);
        if (stockInputRef.current) stockInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    const imageMap = new Map<string, string>();
    const promises = (Array.from(files) as File[]).map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          const name = file.name.split('.').slice(0, -1).join('.').toUpperCase();
          imageMap.set(name, base64);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });
    await Promise.all(promises);
    const count = linkProductImages(imageMap);
    addLog(count === 0 ? 'warning' : 'success', 'Media Linking Complete', `${count} images matched.`);
    setLoading(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleLocalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setFormData(prev => ({ ...prev, image: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productToSave: Product = {
      ...formData as Product,
      id: editingProduct ? editingProduct.id : `${activeCompany?.id}-${formData.modelNo}`,
      color: (formData.color || 'NA').toString().toUpperCase(),
      image: formData.image?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'P')}&background=random&size=200`
    };
    addProduct(productToSave);
    setShowForm(false);
    setEditingProduct(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleCategorySave = (name: string) => {
     const newCat = addCategory({ name, status: 'ACTIVE', source: 'MANUAL' });
     setFormData(prev => ({ ...prev, category: newCat.name }));
     setShowCategoryModal(false);
  };

  const openEnlargeView = (img: string) => {
     setPreviewImage(img);
     setIsImagePreviewOpen(true);
  };

  const openDetailView = (p: Product) => {
     setSelectedProductForDetail(p);
     setIsDetailModalOpen(true);
  };

  const handleExportProducts = () => {
    const rows = filteredProducts.map((product) => ({
      Name: product.name,
      SKU: product.modelNo,
      Brand: product.brand,
      Category: product.category,
      Colour: product.color || 'NA',
      Range: product.range,
      'Sales Price': product.salesPrice,
      Cost: product.cost,
      Unit: product.unit,
      'Track Inventory': product.trackInventory ? 'Yes' : 'No',
      'Net Stock': getTotalStock(product.id)
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `products-master-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrintProducts = () => {
    triggerStandalonePrint('printable-products-table', 'Products_Master_List', 'landscape');
  };

  const handlePrintCatalogue = () => {
    triggerStandalonePrint('printable-product-master', 'Products_Catalogue', 'portrait');
  };

  const handlePrintTag = (product: Product) => {
    setSelectedProductForTag(product);
    setTimeout(() => triggerStandalonePrint('printable-product-tag', `Tag_${product.modelNo}`, 'portrait'), 60);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Products Hub</h1>
          <p className="text-sm text-slate-500 font-medium">Lifecycle management and catalog operations.</p>
        </div>
        
        <div className="flex p-1 bg-slate-200 rounded-xl tabs-row overflow-x-auto scrollbar-hide shrink-0">
          <button onClick={() => setActiveTab('list')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Master List</button>
          <button onClick={() => setActiveTab('categories')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'categories' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Category Master</button>
          {canImport && (
            <button onClick={() => setActiveTab('import')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'import' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Import Wizard</button>
          )}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 no-print">
             <div className="flex-1 min-w-[200px]">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Keywords</label>
                <input type="text" placeholder="Name or SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
             </div>
             <div className="w-40">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl bg-slate-50 font-black uppercase outline-none">
                   <option value="All">All Groups</option>
                   {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
             </div>
             <div className="w-40">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand</label>
                <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl bg-slate-50 font-black uppercase outline-none">
                   {brands.map(b => <option key={b} value={b}>{b === 'All' ? 'All Brands' : b}</option>)}
                </select>
             </div>
             <div className="flex gap-2 self-end">
                <button onClick={handlePrintProducts} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-50 tracking-widest transition-all">Print</button>
                <button onClick={handleExportProducts} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-50 tracking-widest transition-all">Export</button>
                <button onClick={handlePrintCatalogue} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-50 tracking-widest transition-all">Catalogue</button>
                <button onClick={() => { setEditingProduct(null); setFormData(INITIAL_FORM_DATA); setShowForm(true); }} className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-indigo-700 shadow-xl tracking-widest transition-all">Add Single SKU</button>
             </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b shadow-[0_1px_0_0_rgba(148,163,184,0.2)]">
                  <tr>
                    <th className="px-6 py-4">Descriptor</th>
                    <th className="px-6 py-4">Brand / SKU</th>
                    <th className="px-6 py-4">Group</th>
                    <th className="px-6 py-4">Valuation</th>
                    <th className="px-6 py-4 text-center">Net Stock</th>
                    <th className="px-6 py-4 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const totalStock = getTotalStock(product.id);
                    return (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <img 
                              src={product.image} 
                              alt="" 
                              onClick={() => openEnlargeView(product.image || '')}
                              className="w-12 h-12 rounded-xl object-cover mr-4 border border-slate-100 cursor-zoom-in hover:scale-105 transition-transform" 
                            />
                            <div className="cursor-pointer" onClick={() => openDetailView(product)}>
                              <p className="font-black text-[12px] text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors hover:underline decoration-indigo-200 underline-offset-4">{product.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{product.range}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-black text-indigo-600 text-[11px] uppercase tracking-tighter">{product.brand}</p>
                          <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{product.modelNo}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tight">{product.category}</span>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900 text-sm">₹{product.salesPrice.toLocaleString()}</td>
                        <td className="px-6 py-4 text-center font-black text-slate-900">{totalStock}</td>
                        <td className="px-6 py-4 text-right no-print">
                          <button onClick={() => handlePrintTag(product)} className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg" title="Print Tag">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6M8 6h8m-9 14h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </button>
                          <button onClick={() => { setFormData(product); setEditingProduct(product); setShowForm(true); }} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div id="printable-products-table" className="hidden" aria-hidden>
            <div className="bg-white p-10">
              <h2 className="text-xl font-black uppercase mb-2">Products Master List</h2>
              <p className="text-xs font-bold text-slate-500 uppercase mb-6">Generated: {new Date().toLocaleString()} • Records: {filteredProducts.length}</p>
              <table className="w-full text-sm text-left border border-slate-200 border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-black">
                  <tr>
                    <th className="px-3 py-2 border">Descriptor</th>
                    <th className="px-3 py-2 border">Brand / SKU</th>
                    <th className="px-3 py-2 border">Group</th>
                    <th className="px-3 py-2 border">Colour</th>
                    <th className="px-3 py-2 border text-right">Valuation</th>
                    <th className="px-3 py-2 border text-center">Net Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={`print-${product.id}`} className="border-b">
                      <td className="px-3 py-2 border font-bold uppercase">{product.name}<div className="text-[10px] text-slate-400">{product.range}</div></td>
                      <td className="px-3 py-2 border"><div className="font-black text-indigo-600">{product.brand}</div><div className="text-[10px] text-slate-500">{product.modelNo}</div></td>
                      <td className="px-3 py-2 border text-[11px] font-black uppercase">{product.category}</td>
                      <td className="px-3 py-2 border text-[11px] font-black uppercase">{product.color || 'NA'}</td>
                      <td className="px-3 py-2 border text-right font-black">₹{product.salesPrice.toLocaleString()}</td>
                      <td className="px-3 py-2 border text-center font-black">{getTotalStock(product.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hidden" aria-hidden>
            <ProductMasterDocument company={activeCompany} products={filteredProducts} showCost={false} />
            {selectedProductForTag && <ProductTagDocument product={selectedProductForTag} />}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
         <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
               <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Product Category Registry</h2>
               <button onClick={() => { setShowCategoryModal(true); }} className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg">New Master Category</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {categories.map(cat => (
                 <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg">
                          {cat.name.charAt(0)}
                       </div>
                       <div className="flex flex-col items-end">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${cat.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{cat.status}</span>
                          <span className="text-[8px] text-slate-400 uppercase font-bold mt-1">Source: {cat.source}</span>
                       </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">{cat.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Created By: {cat.createdBy}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{new Date(cat.createdAt).toLocaleDateString()}</p>
                    
                    <div className="mt-6 flex gap-2">
                       <button onClick={() => updateCategory(cat.id, { status: cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100">Toggle Status</button>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      )}

      {activeTab === 'import' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-sm flex flex-wrap items-end justify-between gap-6">
              <div className="space-y-4">
                 <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest flex items-center gap-3">
                    <span className="w-2 h-6 bg-indigo-600 rounded-full" /> Global Import Config
                 </h3>
                 <div className="flex gap-3">
                    {(['add_only', 'update_only', 'add_update'] as const).map(mode => (
                       <button 
                         key={mode} 
                         onClick={() => setImportMode(mode)}
                         className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all border ${importMode === mode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300'}`}
                       >
                          {mode.replace('_', ' ')}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-indigo-500 transition-colors">
              <div className="w-16 h-16 bg-indigo-50 rounded-[20px] flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">1. Master File</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 mb-8 px-4">Upload product catalog details.</p>
              <button onClick={() => productInputRef.current?.click()} className="w-full py-4 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-[20px] hover:bg-indigo-700 shadow-xl tracking-widest transition-all">Select Master</button>
              <input type="file" ref={productInputRef} onChange={handleProductImport} hidden accept=".xlsx, .xls, .csv" />
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-emerald-500 transition-colors">
              <div className="w-16 h-16 bg-emerald-50 rounded-[20px] flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">2. Stock Matrix</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 mb-8 px-4">Import Display/Godown/Booked/Repair counts.</p>
              <button onClick={() => stockInputRef.current?.click()} className="w-full py-4 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-[20px] hover:bg-emerald-700 shadow-xl tracking-widest transition-all">Select Stock</button>
              <input type="file" ref={stockInputRef} onChange={handleStockImport} hidden accept=".xlsx, .xls, .csv" />
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-orange-500 transition-colors">
              <div className="w-16 h-16 bg-orange-50 rounded-[20px] flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">3. Media Assets</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 mb-8 px-4">Link images automatically via SKU filename.</p>
              <button onClick={() => imageInputRef.current?.click()} className="w-full py-4 bg-orange-600 text-white text-[10px] font-black uppercase rounded-[20px] hover:bg-orange-700 shadow-xl tracking-widest transition-all">Select Images</button>
              <input type="file" ref={imageInputRef} onChange={handleImageUpload} hidden multiple accept="image/*" />
            </div>
          </div>

          {missingCategories.length > 0 && (
             <div className="bg-amber-50 border-2 border-amber-200 rounded-[32px] p-10 animate-in slide-in-from-top-4 duration-500 space-y-8">
                <div className="flex items-center gap-6">
                   <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-black text-2xl">?</div>
                   <div>
                      <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight">Resolution Required: Missing Categories</h3>
                      <p className="text-[11px] text-amber-700 font-bold uppercase mt-1 opacity-80">The following categories in your file do not exist in the system registry.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   {missingCategories.map(cat => (
                     <label key={cat} className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-amber-100 hover:border-amber-400 cursor-pointer transition-all shadow-sm">
                        <input 
                           type="checkbox" 
                           checked={selectedMissing.includes(cat)} 
                           onChange={e => {
                              if(e.target.checked) setSelectedMissing([...selectedMissing, cat]);
                              else setSelectedMissing(selectedMissing.filter(s => s !== cat));
                           }}
                           className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500" 
                        />
                        <span className="font-black text-[11px] text-slate-800 uppercase truncate">{cat}</span>
                     </label>
                   ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-amber-200">
                   <button onClick={() => { finalizeImport(pendingImportData!); }} className="px-6 py-3 bg-white text-slate-500 font-black text-[10px] uppercase rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-200">Skip & Assign Uncategorized</button>
                   <button onClick={() => { finalizeImport(pendingImportData!, selectedMissing); }} className="px-10 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Create Selected & Continue</button>
                </div>
             </div>
          )}

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Diagnostic Audit History</h3>
              <button onClick={() => setImportResults([])} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Clear History</button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {importResults.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center text-slate-300 opacity-20">
                  <svg className="w-24 h-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="font-black uppercase tracking-[0.3em] italic">Awaiting Input Stream</p>
                </div>
              ) : (
                importResults.map((res, i) => (
                  <div key={i} className="px-10 py-8 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start">
                      <div className={`mt-2 w-3 h-3 rounded-full shrink-0 mr-6 ${res.type === 'success' ? 'bg-emerald-500' : res.type === 'warning' ? 'bg-orange-500' : 'bg-rose-500'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <p className={`text-base font-black uppercase tracking-tight ${res.type === 'error' ? 'text-rose-600' : 'text-slate-800'}`}>{res.message}</p>
                          <span className="text-[9px] font-bold text-slate-400">{res.timestamp}</span>
                        </div>
                        {res.subMessage && <p className="text-[11px] text-slate-500 font-bold uppercase mb-4 leading-relaxed">{res.subMessage}</p>}
                        {res.stats && (
                          <div className="grid grid-cols-4 gap-6 mb-6">
                            <div className="p-4 bg-slate-50 rounded-[20px] border border-slate-100 text-center shadow-inner">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Rows Found</p>
                              <p className="text-xl font-black text-slate-700">{res.stats.total}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-[20px] border border-emerald-100 text-center">
                              <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Created</p>
                              <p className="text-xl font-black text-emerald-600">{res.stats.success}</p>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-[20px] border border-indigo-100 text-center">
                              <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Updated</p>
                              <p className="text-xl font-black text-indigo-600">{res.stats.updated}</p>
                            </div>
                            <div className="p-4 bg-rose-50 rounded-[20px] border border-rose-100 text-center">
                              <p className="text-[8px] font-black text-rose-400 uppercase mb-1">Rejected</p>
                              <p className="text-xl font-black text-rose-600">{res.stats.failed}</p>
                            </div>
                          </div>
                        )}
                        {res.errors && res.errors.length > 0 && (
                          <div className="p-6 bg-rose-50 rounded-[24px] border border-rose-100 space-y-3 mt-6">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 border-b border-rose-200 pb-1">Validation Failure Breakdown</p>
                            {res.errors.slice(0, 10).map((err, idx) => (
                              <div key={idx} className="text-[10px] text-rose-700 font-bold uppercase flex items-center gap-3">
                                <span className="w-1.5 h-1.5 bg-rose-300 rounded-full shrink-0" />
                                {err}
                              </div>
                            ))}
                            {res.errors.length > 10 && <p className="text-[9px] text-rose-400 italic">...and {res.errors.length - 10} more errors.</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-10 py-6 border-b bg-slate-50 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Modify SKU' : 'New Product Record'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto">
               <div className="flex flex-col items-center gap-4 mb-6">
                  {formData.image ? (
                     <img src={formData.image} className="w-32 h-32 rounded-3xl object-cover border-2 border-indigo-100 shadow-md" alt="" />
                  ) : (
                     <div className="w-32 h-32 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-bold text-xs uppercase text-center px-4 border-2 border-dashed border-slate-300">No Image Selected</div>
                  )}
                  <div className="flex gap-2">
                     <button type="button" onClick={() => localImageInputRef.current?.click()} className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-xl border border-indigo-100 hover:bg-indigo-100">Upload Local Image</button>
                     {formData.image && <button type="button" onClick={() => setFormData({...formData, image: ''})} className="px-4 py-2 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-xl border border-rose-100 hover:bg-rose-100">Remove</button>}
                  </div>
                  <input type="file" ref={localImageInputRef} onChange={handleLocalImageChange} hidden accept="image/*" />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Trade Name</label>
                     <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-600 uppercase text-xs" />
                  </div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Model No (Unique)</label><input required type="text" value={formData.modelNo} onChange={e => setFormData({...formData, modelNo: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-indigo-600 outline-none text-xs" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Brand</label><input required type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs uppercase" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Colour</label><input type="text" value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs uppercase" placeholder="NA" /></div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Product Group / Category</label>
                    <div className="flex gap-2">
                       <select value={formData.category} onChange={e => {
                          if(e.target.value === 'NEW') setShowCategoryModal(true);
                          else setFormData({...formData, category: e.target.value});
                       }} className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase outline-none focus:border-indigo-600">
                          <option value="">-- CHOOSE --</option>
                          {categories.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          <option value="NEW" className="text-indigo-600 font-black">+ ADD NEW CATEGORY</option>
                       </select>
                    </div>
                  </div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Product Range</label><input type="text" value={formData.range} onChange={e => setFormData({...formData, range: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none text-xs uppercase" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Sales Rate (₹)</label><input type="number" value={formData.salesPrice} onChange={e => setFormData({...formData, salesPrice: Number(e.target.value)})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs outline-none" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Base Cost (₹)</label><input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xs outline-none" /></div>
               </div>
               <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-[24px] shadow-xl uppercase tracking-widest text-[11px] hover:bg-indigo-700 active:scale-95 transition-all mt-4">Save Product Master</button>
            </form>
          </div>
        </div>
      )}

      <QuickAddCategoryModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} onSave={handleCategorySave} />

      {selectedProductForDetail && (
        <ProductDetailModal 
          product={selectedProductForDetail} 
          isOpen={isDetailModalOpen} 
          onClose={() => { setIsDetailModalOpen(false); setSelectedProductForDetail(null); }} 
        />
      )}

      {isImagePreviewOpen && previewImage && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-10 cursor-zoom-out" onClick={() => setIsImagePreviewOpen(false)}>
           <div className="relative max-w-7xl max-h-full">
              <img src={previewImage} alt="" className="max-w-full max-h-[85vh] rounded-3xl shadow-[0_0_80px_rgba(99,102,241,0.3)] border border-white/10 object-contain animate-in zoom-in-95 duration-200" />
           </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
