
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Supplier, PurchaseTransaction, PurchaseStatus, PaymentStatus, WarehouseType, PurchaseItem, GRNRecord, VendorBillRecord, TransactionType } from '../types';
import { useInventory } from './InventoryContext';
import { useAccounting } from './AccountingContext';
import { useCompany } from './CompanyContext';
import { loadLocalState, saveLocalState } from '../utils/persistence';

interface PurchaseContextType {
  suppliers: Supplier[];
  purchases: PurchaseTransaction[];
  createRFQ: (data: any) => void;
  updatePurchase: (id: string, data: Partial<PurchaseTransaction>) => void;
  confirmPO: (id: string) => void;
  recordGRN: (id: string, deliveries: { productId: string, qty: number }[], reference: string, warehouse: WarehouseType) => boolean;
  createVendorBill: (id: string, billedItems: { productId: string, qty: number, unitPrice: number, total: number }[], billNo: string) => boolean;
  recordPurchasePayment: (purchaseId: string, amount: number, accountId: string, reference: string) => void;
  reconcileVendorAdvance: (purchaseId: string, amount: number) => void;
  cancelPurchase: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'companyId'>) => void;
  getSupplierBalance: (supplierId: string) => number;
  getSupplierLedger: (supplierId: string) => any[];
  importHistoricalPurchases: (records: Omit<PurchaseTransaction, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>[]) => void;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);
const PURCHASE_STORAGE_KEY = 'nexus_purchase_state_v1';

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { increaseStock } = useInventory();
  const { recordPurchaseCost, recordPaymentAgainstBill, reconcileAdvanceToBill, getPayablesAgeing, ledger } = useAccounting();
  const { activeCompany } = useCompany();
  
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([
    { id: 'sup1', companyId: 'comp-001', name: 'Global Tech Distribution', phone: '555-0199', email: 'sales@globaltech.com', address: '123 Tech Lane', gstNo: 'GST123', openingBalance: 0 }
  ]);
  const [allPurchases, setAllPurchases] = useState<PurchaseTransaction[]>([]);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadLocalState<any | null>(PURCHASE_STORAGE_KEY, null);
    if (saved) {
      if (Array.isArray(saved.suppliers)) setAllSuppliers(saved.suppliers);
      if (Array.isArray(saved.purchases)) setAllPurchases(saved.purchases);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveLocalState(PURCHASE_STORAGE_KEY, { suppliers: allSuppliers, purchases: allPurchases });
  }, [allSuppliers, allPurchases, isHydrated]);

  const suppliers = useMemo(() => 
    allSuppliers.filter(s => s.companyId === activeCompany?.id), 
    [allSuppliers, activeCompany]
  );

  const purchases = useMemo(() => 
    allPurchases.filter(p => p.companyId === activeCompany?.id), 
    [allPurchases, activeCompany]
  );

  const createRFQ = (data: any) => {
    if (!activeCompany) return;
    const newPur: PurchaseTransaction = { 
      ...data, 
      id: `PUR-${Date.now()}`, 
      companyId: activeCompany.id,
      purchaseNo: data.rfqNo,
      status: PurchaseStatus.RFQ, 
      grnHistory: [], 
      billHistory: [], 
      paymentStatus: PaymentStatus.UNPAID, 
      amountPaid: 0, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setAllPurchases(prev => [newPur, ...prev]);
  };

  const updatePurchase = (id: string, data: Partial<PurchaseTransaction>) => 
    setAllPurchases(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));

  const confirmPO = (id: string) => 
    setAllPurchases(prev => prev.map(p => p.id === id ? { 
      ...p, 
      status: PurchaseStatus.PO, 
      poNo: `PO-${p.purchaseNo.split('-')[1]}`,
      updatedAt: new Date().toISOString() 
    } : p));

  const recordGRN = useCallback((id: string, deliveries: { productId: string, qty: number }[], reference: string, warehouse: WarehouseType) => {
    const purchase = allPurchases.find(p => p.id === id);
    if (!purchase) return false;

    // Strict Validation Rule: Received <= Ordered
    for (const del of deliveries) {
      const item = purchase.items.find(it => it.productId === del.productId);
      if (item && (item.receivedQty + del.qty > item.orderedQty)) {
        alert(`Validation Error: Received quantity for ${item.productName} cannot exceed ordered quantity (${item.orderedQty}).`);
        return false;
      }
    }

    setAllPurchases(prev => prev.map(p => {
      if (p.id !== id) return p;
      
      const newItems = p.items.map(it => {
        const del = deliveries.find(d => d.productId === it.productId);
        if (del) {
          increaseStock(it.productId, warehouse, del.qty);
          return { ...it, receivedQty: it.receivedQty + del.qty };
        }
        return it;
      });

      const totalOrdered = newItems.reduce((sum, i) => sum + i.orderedQty, 0);
      const totalReceived = newItems.reduce((sum, i) => sum + i.receivedQty, 0);
      const totalBilled = newItems.reduce((sum, i) => sum + i.billedQty, 0);
      
      let nextStatus: PurchaseStatus;
      if (totalReceived >= totalOrdered) {
        nextStatus = (totalBilled >= totalReceived) ? PurchaseStatus.BILLED : PurchaseStatus.GRN_COMPLETED;
      } else {
        nextStatus = PurchaseStatus.GRN_PARTIAL;
      }

      const newGRN: GRNRecord = { 
        id: `GRN-${Date.now()}`, 
        date: new Date().toISOString().split('T')[0], 
        reference, 
        items: deliveries.map(d => ({ 
          productId: d.productId, 
          qty: d.qty, 
          productName: p.items.find(i => i.productId === d.productId)?.productName || 'Item' 
        })) 
      };

      return { ...p, items: newItems, grnHistory: [...p.grnHistory, newGRN], status: nextStatus, updatedAt: new Date().toISOString() };
    }));
    return true;
  }, [allPurchases, increaseStock]);

  const createVendorBill = useCallback((id: string, billedItems: { productId: string, qty: number, unitPrice: number, total: number }[], billNo: string) => {
    const purchase = allPurchases.find(p => p.id === id);
    if (!purchase) return false;

    // Strict Validation Rules: Billed <= Ordered AND Billed <= Received
    for (const bItem of billedItems) {
      const item = purchase.items.find(it => it.productId === bItem.productId);
      if (item) {
        if (item.billedQty + bItem.qty > item.orderedQty) {
          alert(`Validation Error: Billed quantity for ${item.productName} cannot exceed ordered quantity.`);
          return false;
        }
        if (item.billedQty + bItem.qty > item.receivedQty) {
          alert(`Validation Error: Billed quantity for ${item.productName} cannot exceed received quantity (${item.receivedQty}).`);
          return false;
        }
      }
    }

    setAllPurchases(prev => prev.map(p => {
      if (p.id !== id) return p;
      
      const newItems = p.items.map(it => {
        const billLine = billedItems.find(b => b.productId === it.productId);
        if (billLine) return { ...it, billedQty: it.billedQty + billLine.qty };
        return it;
      });

      const totalReceived = newItems.reduce((sum, i) => sum + i.receivedQty, 0);
      const totalBilled = newItems.reduce((sum, i) => sum + i.billedQty, 0);
      const totalOrdered = newItems.reduce((sum, i) => sum + i.orderedQty, 0);
      
      let nextStatus: PurchaseStatus;
      if (totalBilled >= totalOrdered && totalBilled >= totalReceived) {
        nextStatus = PurchaseStatus.BILLED;
      } else if (totalReceived > totalBilled) {
        nextStatus = PurchaseStatus.GRN_COMPLETED; // We have stock that isn't billed yet
      } else {
        nextStatus = p.status;
      }

      const billAmount = billedItems.reduce((s, b) => s + b.total, 0);
      const supplier = suppliers.find(s => s.id === p.supplierId || s.id === p.contactId);
      recordPurchaseCost(p.id, billNo, p.contactId, supplier?.name || 'Vendor', billAmount, 0);
      
      const newBill: VendorBillRecord = { 
        id: `VBILL-${Date.now()}`, 
        date: new Date().toISOString().split('T')[0], 
        billNo, 
        amount: billAmount, 
        items: billedItems 
      };

      return { ...p, items: newItems, billHistory: [...p.billHistory, newBill], status: nextStatus, updatedAt: new Date().toISOString() };
    }));
    return true;
  }, [allPurchases, recordPurchaseCost, suppliers]);

  const recordPurchasePayment = useCallback((purchaseId: string, amount: number, accountId: string, reference: string) => {
    const purchase = allPurchases.find(p => p.id === purchaseId);
    if (!purchase) return;
    recordPaymentAgainstBill(purchaseId, purchase.contactId, amount, accountId, reference);
    setAllPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, amountPaid: p.amountPaid + amount, paymentStatus: (p.amountPaid + amount >= p.grandTotal) ? PaymentStatus.PAID : PaymentStatus.PARTIAL } : p));
  }, [recordPaymentAgainstBill, allPurchases]);

  const reconcileVendorAdvance = useCallback((purchaseId: string, amount: number) => {
    const purchase = allPurchases.find(p => p.id === purchaseId);
    if (!purchase) return;
    reconcileAdvanceToBill(purchaseId, purchase.contactId, amount);
    setAllPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, amountPaid: p.amountPaid + amount, paymentStatus: (p.amountPaid + amount >= p.grandTotal) ? PaymentStatus.PAID : PaymentStatus.PARTIAL } : p));
  }, [reconcileAdvanceToBill, allPurchases]);

  const cancelPurchase = (id: string) => setAllPurchases(prev => prev.map(p => p.id === id ? { ...p, status: PurchaseStatus.CANCELLED } : p));
  
  const addSupplier = (s: any) => {
    if (!activeCompany) return;
    setAllSuppliers(prev => [...prev, { ...s, id: `sup-${Date.now()}`, companyId: activeCompany.id }]);
  };

  const getSupplierBalance = useCallback((supplierId: string) => {
    const ageing = getPayablesAgeing();
    return ageing.filter(a => a.partyId === supplierId).reduce((sum, a) => sum + a.due, 0);
  }, [getPayablesAgeing]);

  const getSupplierLedger = useCallback((supplierId: string) => {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) return [];
    let balance = supplier.openingBalance;
    return ledger.filter(e => e.partyId === supplierId).map(e => {
        balance = balance + e.credit - e.debit;
        return { date: e.date, type: e.type === TransactionType.COST ? 'Bill' : 'Payment', ref: e.reference, debit: e.debit, credit: e.credit, balance: balance };
    });
  }, [allSuppliers, ledger]);

  const importHistoricalPurchases = useCallback((records: any[]) => {
    if (!activeCompany) return;
    const newPurchases: PurchaseTransaction[] = records.map(r => ({
      ...r,
      id: `MIG-PUR-${Math.random().toString(36).substr(2, 9)}`,
      companyId: activeCompany.id,
      status: PurchaseStatus.BILLED,
      isMigrated: true,
      amountPaid: r.grandTotal,
      paymentStatus: PaymentStatus.PAID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      grnHistory: [],
      billHistory: []
    }));
    setAllPurchases(prev => [...newPurchases, ...prev]);
  }, [activeCompany]);

  return (
    <PurchaseContext.Provider value={{ 
      suppliers, purchases, createRFQ, updatePurchase, confirmPO, recordGRN, 
      createVendorBill, recordPurchasePayment, reconcileVendorAdvance, cancelPurchase, addSupplier,
      getSupplierBalance, getSupplierLedger, importHistoricalPurchases
    }}>
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchase = () => {
  const context = useContext(PurchaseContext);
  if (!context) throw new Error('usePurchase missing provider');
  return context;
};
