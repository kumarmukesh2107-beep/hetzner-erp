
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { SalesTransaction, SalesStatus, WarehouseType, SalesItem, DeliveryRecord, SalesLog } from '../types';
import { useInventory } from './InventoryContext';
import { useAccounting } from './AccountingContext';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';
import { loadLocalState, saveLocalState } from '../utils/persistence';

interface SalesContextType {
  sales: SalesTransaction[];
  salesLogs: SalesLog[];
  createQuotation: (data: Omit<SalesTransaction, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'status' | 'amountPaid'>) => void;
  updateQuotation: (id: string, data: Partial<SalesTransaction>) => void;
  markQuotationSent: (id: string) => void;
  confirmOrder: (id: string) => boolean;
  recordDelivery: (id: string, deliveries: { productId: string, qty: number }[], warehouse: WarehouseType) => boolean;
  createInvoice: (id: string, itemsToInvoice: { productId: string, qty: number }[]) => boolean;
  cancelOrder: (id: string) => boolean;
  addSalePayment: (saleId: string, amount: number, accountId: string, reference: string) => void;
  reconcileAdvance: (saleId: string, amount: number) => void;
  importHistoricalSales: (records: any[]) => void;
  importHistoricalOrders: (records: any[]) => void;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);
const SALES_STORAGE_KEY = 'nexus_sales_state_v1';

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { transferStock, deductStock } = useInventory();
  const { recordSalesRevenue, recordPaymentAgainstInvoice, reconcileAdvanceToInvoice } = useAccounting();
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  const [allSales, setAllSales] = useState<SalesTransaction[]>([
    {
      id: 'QT-871546',
      companyId: 'comp-001',
      orderNo: 'QT-871546',
      date: '2025-05-10',
      bookingDate: '2025-05-10',
      expectedDeliveryDate: '2025-05-15',
      contactId: 'comp-001-9876543210',
      customerName: 'WALK-IN CUSTOMER',
      customerAddress: 'Lane 5, City B',
      shippingAddress: '',
      warehouse: WarehouseType.GODOWN,
      salesPerson: 'Michael Manager',
      salesType: 'Retail',
      type: 'Standard',
      storeName: 'Main Store',
      architectIncentive: 0,
      architectIncentivePercent: 0,
      fittingCharges: 0,
      fittingPercent: 0,
      remarks: 'Test Quotation',
      items: [
        { productId: 'comp-001-DIMS130', productName: 'SIDE TABLE', modelNo: 'DIMS130', orderedQty: 2, deliveredQty: 0, invoicedQty: 0, price: 600, discount: 0, discountPercent: 0, gstRate: 0, isGstEnabled: false, total: 1200 }
      ],
      subtotal: 1200, totalGst: 0, totalDiscount: 0, grandTotal: 1200, amountPaid: 0,
      status: SalesStatus.QUOTATION,
      deliveryHistory: [],
      createdAt: '2025-05-10T10:00:00Z', updatedAt: '2025-05-10T10:00:00Z'
    }
  ]);
  
  const [allSalesLogs, setAllSalesLogs] = useState<SalesLog[]>([]);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadLocalState<any | null>(SALES_STORAGE_KEY, null);
    if (saved) {
      if (Array.isArray(saved.sales)) setAllSales(saved.sales);
      if (Array.isArray(saved.salesLogs)) setAllSalesLogs(saved.salesLogs);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveLocalState(SALES_STORAGE_KEY, { sales: allSales, salesLogs: allSalesLogs });
  }, [allSales, allSalesLogs, isHydrated]);

  const sales = useMemo(() => allSales.filter(s => s.companyId === activeCompany?.id), [allSales, activeCompany]);
  const salesLogs = useMemo(() => allSalesLogs.filter(l => l.companyId === activeCompany?.id), [allSalesLogs, activeCompany]);

  const createQuotation = useCallback((data: any) => {
    if (!activeCompany) return;
    const newQuotation: SalesTransaction = { ...data, id: `QT-${Date.now()}`, companyId: activeCompany.id, status: SalesStatus.QUOTATION, amountPaid: 0, deliveryHistory: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setAllSales(prev => [newQuotation, ...prev]);
  }, [activeCompany]);

  const updateQuotation = useCallback((id: string, data: Partial<SalesTransaction>) => {
    setAllSales(prev => prev.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s));
  }, []);

  const markQuotationSent = useCallback((id: string) => {
    setAllSales(prev => prev.map(s => s.id === id ? { ...s, status: SalesStatus.QUOTATION_SENT, updatedAt: new Date().toISOString() } : s));
  }, []);

  const confirmOrder = useCallback((id: string) => {
    const sale = allSales.find(s => s.id === id);
    if (!sale) return false;
    
    if (!sale.isHistorical) {
      sale.items.forEach(item => transferStock(item.productId, sale.warehouse, WarehouseType.BOOKED, item.orderedQty));
    }
    
    setAllSales(prev => prev.map(s => s.id === id ? { ...s, status: SalesStatus.SALES_ORDER, updatedAt: new Date().toISOString() } : s));
    return true;
  }, [allSales, transferStock]);

  const recordDelivery = useCallback((id: string, deliveries: { productId: string, qty: number }[], wh: WarehouseType) => {
    setAllSales(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newItems = s.items.map(it => {
        const del = deliveries.find(d => d.productId === it.productId);
        if (del) return { ...it, deliveredQty: it.deliveredQty + del.qty };
        return it;
      });
      const totalOrdered = newItems.reduce((acc, i) => acc + i.orderedQty, 0);
      const totalDelivered = newItems.reduce((acc, i) => acc + i.deliveredQty, 0);
      let nextStatus = totalDelivered < totalOrdered ? SalesStatus.PARTIALLY_DELIVERED : SalesStatus.FULLY_DELIVERED;
      
      const newDelivery: DeliveryRecord = { 
        id: `DO-${Date.now()}`, 
        date: new Date().toISOString().split('T')[0], 
        warehouse: wh, 
        items: deliveries.map(d => ({ 
          productId: d.productId, 
          qty: d.qty, 
          productName: s.items.find(i => i.productId === d.productId)?.productName || 'Unknown' 
        })) 
      };
      return { ...s, items: newItems, deliveryHistory: [...s.deliveryHistory, newDelivery], status: nextStatus, updatedAt: new Date().toISOString() };
    }));
    return true;
  }, []);

  const createInvoice = useCallback((id: string, itemsToInvoice: { productId: string, qty: number }[]) => {
    const sale = allSales.find(s => s.id === id);
    if (!sale) return false;

    let totalBilledVal = 0;
    let totalBilledTax = 0;

    const newItems = sale.items.map(it => {
      const inv = itemsToInvoice.find(i => i.productId === it.productId);
      if (inv) {
        if (!sale.isHistorical) {
          deductStock(it.productId, WarehouseType.BOOKED, inv.qty);
        }
        
        const lineTaxable = inv.qty * it.price;
        const lineTax = it.isGstEnabled ? lineTaxable * (it.gstRate / 100) : 0;
        totalBilledVal += (lineTaxable + lineTax);
        totalBilledTax += lineTax;
        return { ...it, invoicedQty: it.invoicedQty + inv.qty };
      }
      return it;
    });

    if (!sale.isHistorical) {
      recordSalesRevenue(
        `INV-${Date.now().toString().slice(-4)}`, 
        sale.orderNo, 
        sale.contactId, 
        sale.customerName, 
        totalBilledVal, 
        totalBilledTax
      );
    }

    const totalOrdered = newItems.reduce((acc, i) => acc + i.orderedQty, 0);
    const totalInvoiced = newItems.reduce((acc, i) => acc + i.invoicedQty, 0);
    const nextStatus = totalInvoiced < totalOrdered ? SalesStatus.PARTIALLY_BILLED : SalesStatus.FULLY_BILLED;

    setAllSales(prev => prev.map(s => s.id === id ? { ...s, items: newItems, status: nextStatus, updatedAt: new Date().toISOString() } : s));
    return true;
  }, [allSales, deductStock, recordSalesRevenue]);

  const addSalePayment = useCallback((saleId: string, amount: number, accountId: string, reference: string) => {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;
    
    if (!sale.isHistorical) {
      recordPaymentAgainstInvoice(saleId, sale.contactId, sale.customerName, amount, accountId, reference);
    }
    
    setAllSales(prev => prev.map(s => s.id === saleId ? { ...s, amountPaid: s.amountPaid + amount } : s));
  }, [allSales, recordPaymentAgainstInvoice]);

  const reconcileAdvance = useCallback((saleId: string, amount: number) => {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;
    
    if (!sale.isHistorical) {
      reconcileAdvanceToInvoice(saleId, sale.contactId, amount);
    }
    
    setAllSales(prev => prev.map(s => s.id === saleId ? { ...s, amountPaid: s.amountPaid + amount } : s));
  }, [allSales, reconcileAdvanceToInvoice]);

  const cancelOrder = useCallback((id: string) => {
    setAllSales(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (!s.isHistorical) {
        s.items.forEach(item => {
          const qtyToReturn = item.orderedQty - item.invoicedQty;
          if (qtyToReturn > 0) transferStock(item.productId, WarehouseType.BOOKED, s.warehouse, qtyToReturn);
        });
      }
      return { ...s, status: SalesStatus.CANCELLED };
    }));
    return true;
  }, [transferStock]);

  const importHistoricalSales = useCallback((records: any[]) => {
    if (!activeCompany) return;
    const newSales: SalesTransaction[] = records.map(r => ({
      ...r,
      companyId: activeCompany.id,
      status: SalesStatus.FULLY_BILLED,
      isHistorical: true, // EXPLICIT ISOLATION
      amountPaid: r.grandTotal, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryHistory: []
    }));
    setAllSales(prev => [...newSales, ...prev]);
  }, [activeCompany]);

  const importHistoricalOrders = useCallback((records: any[]) => {
    if (!activeCompany) return;
    const newOrders: SalesTransaction[] = records.map(r => ({
      ...r,
      companyId: activeCompany.id,
      status: SalesStatus.FULLY_DELIVERED,
      isHistorical: true, // EXPLICIT ISOLATION
      amountPaid: r.grandTotal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryHistory: []
    }));
    setAllSales(prev => [...newOrders, ...prev]);
  }, [activeCompany]);

  return (
    <SalesContext.Provider value={{ 
      sales, salesLogs, createQuotation, updateQuotation,
      markQuotationSent, confirmOrder, recordDelivery, createInvoice, cancelOrder, 
      addSalePayment, reconcileAdvance, importHistoricalSales, importHistoricalOrders 
    }}>
      {children}
    </SalesContext.Provider>
  );
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) throw new Error('useSales missing provider');
  return context;
};
