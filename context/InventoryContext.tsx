
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Product, WarehouseType, WarehouseStock, StockTransfer, ManualTransaction, ProductCategory } from '../types';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';

interface ImportResult { 
  total: number;
  success: number; 
  updated: number; 
  failed: number; 
  warnings: number;
  newCategories: string[];
  errors: string[]; 
}

interface InventoryContextType {
  products: Product[];
  stocks: WarehouseStock[];
  transfers: StockTransfer[];
  manualTransactions: ManualTransaction[];
  categories: ProductCategory[];
  addProduct: (product: Omit<Product, 'id' | 'companyId'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  addCategory: (category: Omit<ProductCategory, 'id' | 'companyId' | 'createdAt' | 'createdBy'>) => ProductCategory;
  updateCategory: (id: string, data: Partial<ProductCategory>) => void;
  addHistoricalShadowProduct: (data: Partial<Product>) => Product;
  bulkImportProducts: (items: any[], mode: 'add_only' | 'update_only' | 'add_update', createMissingCategories?: string[]) => ImportResult;
  bulkImportStocks: (stockData: any[]) => ImportResult;
  transferStock: (productId: string, from: WarehouseType, to: WarehouseType, qty: number, options?: { partyName?: string; salesPerson?: string; date?: string }) => boolean;
  increaseStock: (productId: string, warehouse: WarehouseType, qty: number) => void;
  deductStock: (productId: string, warehouse: WarehouseType, qty: number) => boolean;
  recordManualReceipt: (productId: string, warehouse: WarehouseType, qty: number, reference: string, date: string, partyName: string, salesPerson?: string) => void;
  recordManualDelivery: (productId: string, warehouse: WarehouseType, qty: number, reference: string, date: string, partyName: string, salesPerson?: string) => boolean;
  getProductStock: (productId: string) => WarehouseStock[];
  getTotalStock: (productId: string) => number;
  getSellableStock: (productId: string) => number;
  linkProductImages: (imageMap: Map<string, string>) => number;
  normalizeValue: (val: any) => string;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  
  const [allProducts, setAllProducts] = useState<Product[]>([
    { id: 'comp-001-DIMS130', companyId: 'comp-001', name: 'SIDE TABLE', modelNo: 'DIMS130', brand: 'DIMS', category: 'SIDE TABLE', range: 'REGULAR', salesPrice: 600, cost: 275, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS130/200' },
    { id: 'comp-001-DIMS131', companyId: 'comp-001', name: 'BEDROOM CHAIR', modelNo: 'DIMS131', brand: 'DIMS', category: 'CHAIRS', range: 'REGULAR', salesPrice: 750, cost: 340, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS131/200' },
    { id: 'comp-001-DIMS1357', companyId: 'comp-001', name: 'BED', modelNo: 'DIMS1357', brand: 'DIMS', category: 'BED', range: 'REGULAR', salesPrice: 2650, cost: 1060, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS1357/200' },
    { id: 'comp-001-DIMS1362', companyId: 'comp-001', name: 'BEDSIDE TABLE', modelNo: 'DIMS1362', brand: 'DIMS', category: 'BED SIDE TABLE', range: 'REGULAR', salesPrice: 675, cost: 270, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS1362/200' },
    { id: 'comp-001-DIMS168', companyId: 'comp-001', name: 'SOFA 2.5 SEATER', modelNo: 'DIMS168', brand: 'DIMS', category: 'SOFA', range: 'REGULAR', salesPrice: 1625, cost: 550, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS168/200' },
    { id: 'comp-001-DIMS171', companyId: 'comp-001', name: 'SOFA 4 SEATER', modelNo: 'DIMS171', brand: 'DIMS', category: 'SOFA', range: 'REGULAR', salesPrice: 2400, cost: 960, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS171/200' },
    { id: 'comp-001-DIMS172', companyId: 'comp-001', name: 'SOFA 2.5 SEATER', modelNo: 'DIMS172', brand: 'DIMS', category: 'SOFA', range: 'REGULAR', salesPrice: 1500, cost: 600, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS172/200' },
    { id: 'comp-001-DIMS221', companyId: 'comp-001', name: 'SOFA 2.5 SEATER', modelNo: 'DIMS221', brand: 'DIMS', category: 'SOFA', range: 'REGULAR', salesPrice: 1653, cost: 490, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS221/200' },
    { id: 'comp-001-DIMS365', companyId: 'comp-001', name: 'CABINET', modelNo: 'DIMS365', brand: 'DIMS', category: 'CABINET', range: 'REGULAR', salesPrice: 1950, cost: 780, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS365/200' },
    { id: 'comp-001-DIMS396', companyId: 'comp-001', name: 'BEDSIDE TABLE', modelNo: 'DIMS396', brand: 'DIMS', category: 'BED SIDE TABLE', range: 'REGULAR', salesPrice: 806.8, cost: 260, unit: 'Units', trackInventory: true, image: 'https://picsum.photos/seed/DIMS396/200' },
  ]);

  const [allCategories, setAllCategories] = useState<ProductCategory[]>([
    { id: 'cat-01', companyId: 'comp-001', name: 'BAR CABINET', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-02', companyId: 'comp-001', name: 'BAR CHAIR', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-03', companyId: 'comp-001', name: 'BED', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-04', companyId: 'comp-001', name: 'BED SIDE TABLE', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-05', companyId: 'comp-001', name: 'BOOK SHELF', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-06', companyId: 'comp-001', name: 'CABINET', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-07', companyId: 'comp-001', name: 'CENTER TABLE', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-08', companyId: 'comp-001', name: 'CHAIRS', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-09', companyId: 'comp-001', name: 'COAT HANGER', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-10', companyId: 'comp-001', name: 'CONSOLE', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-11', companyId: 'comp-001', name: 'COUCH', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-12', companyId: 'comp-001', name: 'DÉCOR', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-13', companyId: 'comp-001', name: 'DINING CHAIR', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-14', companyId: 'comp-001', name: 'DINING TABLE', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-15', companyId: 'comp-001', name: 'DRESSER', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-16', companyId: 'comp-001', name: 'FURNISHINGS', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-17', companyId: 'comp-001', name: 'LIGHTS', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-18', companyId: 'comp-001', name: 'MIRROR', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-19', companyId: 'comp-001', name: 'OTTOMAN', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-20', companyId: 'comp-001', name: 'PARTITION', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-21', companyId: 'comp-001', name: 'PLANTER', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-22', companyId: 'comp-001', name: 'PLATFORM', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-23', companyId: 'comp-001', name: 'SIDE TABLE', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-24', companyId: 'comp-001', name: 'SOFA', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-25', companyId: 'comp-001', name: 'STUDY TABLE', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
    { id: 'cat-26', companyId: 'comp-001', name: 'TABLEWARE', status: 'ACTIVE', source: 'MANUAL', createdBy: 'System', createdAt: new Date().toISOString() },
  ]);

  const [allStocks, setAllStocks] = useState<WarehouseStock[]>([
    { productId: 'comp-001-DIMS130', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 45 },
    { productId: 'comp-001-DIMS130', companyId: 'comp-001', warehouse: WarehouseType.BOOKED, quantity: 5 },
    { productId: 'comp-001-DIMS131', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 50 },
    { productId: 'comp-001-DIMS1357', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 50 },
    { productId: 'comp-001-DIMS1362', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 50 },
    { productId: 'comp-001-DIMS168', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 50 },
    { productId: 'comp-001-DIMS171', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 50 },
    { productId: 'comp-001-DIMS172', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 50 },
    { productId: 'comp-001-DIMS221', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 50 },
    { productId: 'comp-001-DIMS365', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 50 },
    { productId: 'comp-001-DIMS396', companyId: 'comp-001', warehouse: WarehouseType.GODOWN, quantity: 50 },
  ]);

  const [allTransfers, setAllTransfers] = useState<StockTransfer[]>([]);
  const [allManualTransactions, setAllManualTransactions] = useState<ManualTransaction[]>([]);

  // Products filter now excludes SHADOW / HISTORICAL products from Live Catalog
  const products = useMemo(() => allProducts.filter(p => p.companyId === activeCompany?.id && !p.isHistorical), [allProducts, activeCompany]);
  const categories = useMemo(() => allCategories.filter(c => c.companyId === activeCompany?.id), [allCategories, activeCompany]);
  const stocks = useMemo(() => allStocks.filter(s => s.companyId === activeCompany?.id), [allStocks, activeCompany]);
  const transfers = useMemo(() => allTransfers.filter(t => t.companyId === activeCompany?.id), [allTransfers, activeCompany]);
  const manualTransactions = useMemo(() => allManualTransactions.filter(m => m.companyId === activeCompany?.id), [allManualTransactions, activeCompany]);

  const normalizeValue = useCallback((val: any) => String(val || '').trim().toUpperCase().replace(/[^A-Z0-9\s-]/g, ''), []);

  const addCategory = useCallback((data: Omit<ProductCategory, 'id' | 'companyId' | 'createdAt' | 'createdBy'>) => {
    if (!activeCompany) throw new Error('No active company');
    const nameNorm = normalizeValue(data.name);
    const existing = allCategories.find(c => normalizeValue(c.name) === nameNorm && c.companyId === activeCompany.id);
    if (existing) return existing;

    const newCat: ProductCategory = {
      ...data,
      id: `cat-${Date.now()}`,
      companyId: activeCompany.id,
      name: data.name.toUpperCase(),
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'System'
    };
    setAllCategories(prev => [...prev, newCat]);
    return newCat;
  }, [activeCompany, allCategories, normalizeValue, user]);

  const updateCategory = useCallback((id: string, data: Partial<ProductCategory>) => {
    setAllCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const addProduct = useCallback((data: Omit<Product, 'id' | 'companyId'>) => {
    if (!activeCompany) return;
    const newProduct: Product = {
      ...data,
      id: `${activeCompany.id}-${data.modelNo || Date.now()}`,
      companyId: activeCompany.id
    };
    setAllProducts(prev => {
      const idx = prev.findIndex(p => p.modelNo.toUpperCase() === newProduct.modelNo.toUpperCase() && p.companyId === activeCompany.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = newProduct;
        return next;
      }
      return [...prev, newProduct];
    });
  }, [activeCompany]);

  const addHistoricalShadowProduct = useCallback((data: Partial<Product>): Product => {
    if (!activeCompany) throw new Error("No active company");
    const modelNo = normalizeValue(data.modelNo);
    const existing = allProducts.find(p => p.modelNo.toUpperCase() === modelNo && p.companyId === activeCompany.id);
    if (existing) return existing;

    const newShadow: Product = {
      id: `HIST-${activeCompany.id}-${modelNo}`,
      companyId: activeCompany.id,
      name: (data.name || 'LEGACY ITEM').toUpperCase(),
      modelNo,
      brand: (data.brand || 'LEGACY').toUpperCase(),
      category: (data.category || 'HISTORICAL').toUpperCase(),
      range: 'LEGACY',
      salesPrice: data.salesPrice || 0,
      cost: data.cost || 0,
      unit: 'Units',
      trackInventory: false,
      isHistorical: true,
      excludeFromStock: true
    };
    setAllProducts(prev => [...prev, newShadow]);
    return newShadow;
  }, [activeCompany, allProducts, normalizeValue]);

  const updateProduct = useCallback((id: string, data: Partial<Product>) => {
    setAllProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, []);

  const bulkImportProducts = useCallback((items: any[], mode: 'add_only' | 'update_only' | 'add_update', createMissingCategories?: string[]): ImportResult => {
    if (!activeCompany) return { total: 0, success: 0, updated: 0, failed: 0, warnings: 0, newCategories: [], errors: ['No active company selected.'] };

    const result: ImportResult = { total: items.length, success: 0, updated: 0, failed: 0, warnings: 0, newCategories: [], errors: [] };
    const nextProducts = [...allProducts];

    const normalizeCategoryKey = (val: any) => normalizeValue(val).replace(/[\s-]/g, '');
    const currentCategories = allCategories.filter(c => c.companyId === activeCompany.id);
    const categoryNameByKey = new Map<string, string>();

    currentCategories.forEach((c) => {
      const key = normalizeCategoryKey(c.name);
      if (key && !categoryNameByKey.has(key)) categoryNameByKey.set(key, c.name);
    });

    const mapVal = (row: any, keys: string[]) => {
      const foundKey = Object.keys(row).find(k => keys.includes(k.toLowerCase().replace(/[\s*_]/g, '')));
      return foundKey ? row[foundKey] : undefined;
    };

    if (createMissingCategories && createMissingCategories.length > 0) {
      createMissingCategories.forEach(rawCatName => {
        const normalizedCat = normalizeValue(rawCatName).replace(/\s+/g, ' ').trim();
        const catKey = normalizeCategoryKey(normalizedCat);
        if (!catKey || categoryNameByKey.has(catKey)) return;
        const created = addCategory({ name: normalizedCat, status: 'ACTIVE', source: 'IMPORT' });
        categoryNameByKey.set(catKey, created.name);
      });
    }

    const seenModelNosInBatch = new Set<string>();

    items.forEach((row, index) => {
      const rowNum = index + 2;
      const rawModelNo = mapVal(row, ['modelno', 'sku', 'itemcode', 'model_no']);
      const modelNo = normalizeValue(rawModelNo);
      const name = String(mapVal(row, ['productname', 'name', 'itemname', 'product_name']) || '').trim();
      const sPrice = Number(mapVal(row, ['salesprice', 'sellingprice', 'price', 'mrp']) || 0);
      const cPrice = Number(mapVal(row, ['costprice', 'cost', 'purchaseprice']) || 0);

      if (!modelNo || !name || isNaN(sPrice) || isNaN(cPrice)) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Mandatory field missing.`);
        return;
      }

      if (seenModelNosInBatch.has(modelNo)) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Duplicate Model No '${modelNo}' in file.`);
        return;
      }
      seenModelNosInBatch.add(modelNo);

      const existingIdx = nextProducts.findIndex(p => p.modelNo.toUpperCase() === modelNo && p.companyId === activeCompany.id);

      if (mode === 'add_only' && existingIdx > -1) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Model No already exists.`);
        return;
      }
      if (mode === 'update_only' && existingIdx === -1) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Model No not found for update.`);
        return;
      }

      const excelCategoryRaw = mapVal(row, ['category', 'group', 'type']);
      const categoryNormalized = normalizeValue(excelCategoryRaw).replace(/\s+/g, ' ').trim();
      const categoryKey = normalizeCategoryKey(categoryNormalized);
      let finalCategory = '';

      if (categoryKey) {
        const existingCategoryName = categoryNameByKey.get(categoryKey);
        if (existingCategoryName) {
          finalCategory = existingCategoryName;
        } else {
          const created = addCategory({ name: categoryNormalized, status: 'ACTIVE', source: 'IMPORT' });
          finalCategory = created.name;
          categoryNameByKey.set(categoryKey, created.name);
        }
      } else if (existingIdx > -1) {
        finalCategory = nextProducts[existingIdx].category;
      } else {
        finalCategory = 'UNCATEGORIZED';
        result.warnings++;
      }

      const productData: Product = {
        id: existingIdx > -1 ? nextProducts[existingIdx].id : `${activeCompany.id}-${modelNo}`,
        companyId: activeCompany.id,
        name,
        modelNo,
        brand: String(mapVal(row, ['brand', 'make']) || (existingIdx > -1 ? nextProducts[existingIdx].brand : 'UNBRANDED')).trim().toUpperCase(),
        category: finalCategory,
        range: String(mapVal(row, ['range', 'collection']) || (existingIdx > -1 ? nextProducts[existingIdx].range : 'REGULAR')).trim().toUpperCase(),
        salesPrice: sPrice,
        cost: cPrice,
        unit: String(mapVal(row, ['unit', 'uom']) || (existingIdx > -1 ? nextProducts[existingIdx].unit : 'Units')).trim(),
        trackInventory: true,
        image: existingIdx > -1 ? nextProducts[existingIdx].image : undefined
      };

      if (existingIdx > -1) {
        nextProducts[existingIdx] = productData;
        result.updated++;
      } else {
        nextProducts.push(productData);
        result.success++;
      }
    });

    if (result.success > 0 || result.updated > 0) {
      setAllProducts(nextProducts);
    }
    return result;
  }, [activeCompany, allProducts, allCategories, normalizeValue, addCategory]);

  const bulkImportStocks = useCallback((stockData: any[]): ImportResult => {
    if (!activeCompany) return { total: 0, success: 0, updated: 0, failed: 0, warnings: 0, newCategories: [], errors: ['No active company selected.'] };
    
    const result: ImportResult = { total: stockData.length, success: 0, updated: 0, failed: 0, warnings: 0, newCategories: [], errors: [] };
    const nextStocks = [...allStocks];

    const mapVal = (row: any, keys: string[]) => {
      const foundKey = Object.keys(row).find(k => 
        keys.includes(k.toLowerCase().replace(/[\s*_]/g, ''))
      );
      return foundKey ? row[foundKey] : undefined;
    };

    stockData.forEach((row, index) => {
      const rowNum = index + 2;
      const modelNo = String(mapVal(row, ['modelno', 'sku', 'itemcode', 'model_no']) || '').trim().toUpperCase();
      
      if (!modelNo) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Model No missing.`);
        return;
      }

      const product = allProducts.find(p => p.modelNo.toUpperCase() === modelNo && p.companyId === activeCompany.id);
      if (!product) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Product SKU '${modelNo}' not found.`);
        return;
      }

      const godown = Number(mapVal(row, ['godown', 'mainwarehouse', 'godown_qty']) || 0);
      const display = Number(mapVal(row, ['display', 'showroom', 'display_qty']) || 0);
      const booked = Number(mapVal(row, ['booked', 'reserved', 'booked_qty']) || 0);
      const repair = Number(mapVal(row, ['repair', 'damaged', 'service', 'repair_qty']) || 0);

      const updateWhStock = (wh: WarehouseType, qty: number) => {
        const idx = nextStocks.findIndex(s => s.productId === product.id && s.warehouse === wh && s.companyId === activeCompany.id);
        if (idx > -1) {
          nextStocks[idx] = { ...nextStocks[idx], quantity: qty };
        } else {
          nextStocks.push({ companyId: activeCompany.id, productId: product.id, warehouse: wh, quantity: qty });
        }
      };

      updateWhStock(WarehouseType.GODOWN, godown);
      updateWhStock(WarehouseType.DISPLAY, display);
      updateWhStock(WarehouseType.BOOKED, booked);
      updateWhStock(WarehouseType.REPAIR, repair);

      result.success++;
    });

    if (result.success > 0) {
      setAllStocks(nextStocks);
    }
    return result;
  }, [activeCompany, allProducts, allStocks]);

  const increaseStock = useCallback((productId: string, warehouse: WarehouseType, qty: number) => {
    if (!activeCompany || warehouse === WarehouseType.HISTORICAL) return;
    setAllStocks(prev => {
      const idx = prev.findIndex(s => s.productId === productId && s.warehouse === warehouse && s.companyId === activeCompany.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { companyId: activeCompany.id, productId, warehouse, quantity: qty }];
    });
  }, [activeCompany]);

  const deductStock = useCallback((productId: string, warehouse: WarehouseType, qty: number) => {
    if (!activeCompany || warehouse === WarehouseType.HISTORICAL) return false;
    let success = false;
    setAllStocks(prev => {
      const idx = prev.findIndex(s => s.productId === productId && s.warehouse === warehouse && s.companyId === activeCompany.id);
      if (idx === -1 || prev[idx].quantity < qty) return prev;
      success = true;
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity - qty };
      return next;
    });
    return success;
  }, [activeCompany]);

  const transferStock = useCallback((productId: string, from: WarehouseType, to: WarehouseType, qty: number, options?: { partyName?: string; salesPerson?: string; date?: string }) => {
    if (!activeCompany) return false;
    const success = deductStock(productId, from, qty);
    if (!success) return false;
    increaseStock(productId, to, qty);
    setAllTransfers(prev => [{
      id: `TR-${Date.now()}`,
      companyId: activeCompany.id,
      productId,
      sourceWarehouse: from,
      destinationWarehouse: to,
      quantity: qty,
      timestamp: new Date().toISOString(),
      date: options?.date || new Date().toISOString().split('T')[0],
      performedBy: user?.name || 'System',
      partyName: options?.partyName,
      salesPerson: options?.salesPerson
    }, ...prev]);
    return true;
  }, [deductStock, increaseStock, user, activeCompany]);

  const recordManualReceipt = useCallback((productId: string, warehouse: WarehouseType, qty: number, reference: string, date: string, partyName: string, salesPerson?: string) => {
    if (!activeCompany) return;
    increaseStock(productId, warehouse, qty);
    setAllManualTransactions(prev => [{
      id: `MRT-${Date.now()}`,
      companyId: activeCompany.id,
      productId,
      type: 'RECEIPT',
      warehouse,
      quantity: qty,
      reference,
      date,
      partyName,
      salesPerson,
      timestamp: new Date().toISOString(),
      performedBy: user?.name || 'Operator'
    }, ...prev]);
  }, [increaseStock, activeCompany, user]);

  const recordManualDelivery = useCallback((productId: string, warehouse: WarehouseType, qty: number, reference: string, date: string, partyName: string, salesPerson?: string) => {
    if (!activeCompany) return false;
    const success = deductStock(productId, warehouse, qty);
    if (success) {
      setAllManualTransactions(prev => [{
        id: `MDT-${Date.now()}`,
        companyId: activeCompany.id,
        productId,
        type: 'DELIVERY',
        warehouse,
        quantity: qty,
        reference,
        date,
        partyName,
        salesPerson,
        timestamp: new Date().toISOString(),
        performedBy: user?.name || 'Operator'
      }, ...prev]);
    }
    return success;
  }, [deductStock, activeCompany, user]);

  const getProductStock = (productId: string) => stocks.filter(s => s.productId === productId);
  
  const getTotalStock = (productId: string) => {
    // Explicitly exclude HISTORICAL warehouse from stock calculation
    return stocks
      .filter(s => s.productId === productId && s.warehouse !== WarehouseType.HISTORICAL)
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  const getSellableStock = (productId: string) => {
    const pStocks = stocks.filter(s => s.productId === productId);
    const godown = pStocks.find(s => s.warehouse === WarehouseType.GODOWN)?.quantity || 0;
    const display = pStocks.find(s => s.warehouse === WarehouseType.DISPLAY)?.quantity || 0;
    return godown + display;
  };

  const linkProductImages = useCallback((imageMap: Map<string, string>) => {
    let count = 0;
    setAllProducts(prev => prev.map(p => {
      const newImage = imageMap.get(p.modelNo.toUpperCase());
      if (newImage) {
        count++;
        return { ...p, image: newImage };
      }
      return p;
    }));
    return count;
  }, []);

  return (
    <InventoryContext.Provider value={{ 
      products, stocks, transfers, manualTransactions, categories,
      addProduct, updateProduct, addCategory, updateCategory, bulkImportProducts,
      bulkImportStocks, transferStock, increaseStock, addHistoricalShadowProduct,
      deductStock, recordManualReceipt, recordManualDelivery, getProductStock, getTotalStock, getSellableStock,
      linkProductImages, normalizeValue
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory missing provider');
  return context;
};
