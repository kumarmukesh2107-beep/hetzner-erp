
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { AccountType, FinancialAccount, ExpenseRecord, LedgerEntry, TransactionType, Product } from '../types';
import { useCompany } from './CompanyContext';
import { loadLocalState, saveLocalState } from '../utils/persistence';

interface CashFlowBreakdown {
  category: string;
  amount: number;
  transactions: LedgerEntry[];
}

interface CashFlowResult {
  cashIn: number;
  cashOut: number;
  netFlow: number;
  inflows: CashFlowBreakdown[];
  outflows: CashFlowBreakdown[];
}

interface AccountingContextType {
  accounts: FinancialAccount[];
  expenses: ExpenseRecord[];
  ledger: LedgerEntry[];
  expenseCategories: string[];
  recordCustomerAdvance: (partyId: string, partyName: string, amount: number, accountId: string, reference: string) => string;
  recordVendorAdvance: (partyId: string, partyName: string, amount: number, accountId: string, reference: string) => string;
  recordSalesRevenue: (invoiceId: string, orderNo: string, partyId: string, partyName: string, amount: number, taxAmount: number) => void;
  recordPurchaseCost: (billId: string, billNo: string, supplierId: string, supplierName: string, amount: number, taxAmount: number) => void;
  recordPaymentAgainstInvoice: (invoiceId: string, partyId: string, partyName: string, amount: number, accountId: string, reference: string) => void;
  recordPaymentAgainstBill: (billId: string, partyId: string, amount: number, accountId: string, reference: string) => void;
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'companyId'>) => void;
  transferFunds: (fromAccountId: string, toAccountId: string, amount: number, reference: string) => boolean;
  addExpenseCategory: (category: string) => void;
  toggleReconciliation: (ledgerId: string) => void;
  getAccountLedger: (accountId: string) => (LedgerEntry & { runningBalance: number })[];
  getCustomerNetLedger: (partyId: string) => (LedgerEntry & { runningBalance: number })[];
  getSupplierNetLedger: (partyId: string) => (LedgerEntry & { runningBalance: number })[];
  getPLStatement: () => any;
  getCashFlowStatement: (startDate?: string, endDate?: string) => CashFlowResult;
  getReceivablesAgeing: () => any[];
  getPayablesAgeing: () => any[];
  getBrandProfitability: (products: Product[]) => any[];
  getDayWiseCashBook: (startDate: string, endDate: string) => any[];
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);
const ACCOUNTING_STORAGE_KEY = 'nexus_accounting_state_v1';

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompany } = useCompany();
  
  const [baseAccounts] = useState<FinancialAccount[]>([
    { id: 'cash-main', companyId: 'comp-001', name: 'Main Cash', type: AccountType.CASH, balance: 15000 },
    { id: 'cash-smc', companyId: 'comp-001', name: 'SMC Cash', type: AccountType.CASH, balance: 5000 },
    { id: 'bank-hdfc-1', companyId: 'comp-001', name: 'HDFC Bank', type: AccountType.BANK, balance: 250000 },
    { id: 'bank-icici-1', companyId: 'comp-001', name: 'ICICI Bank', type: AccountType.BANK, balance: 100000 },
  ]);

  const [allLedger, setAllLedger] = useState<LedgerEntry[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    'REPAIR & MAINTANCE EXP', 'MISC EXPENSES', 'Electricity Expense', 'SHOWROOM EXPS', 'Salary Expense',
    'SHOWROOM Rent EXPS', 'Internet Expense', 'Telephone Expense', 'Purchase Expense', 'Business Promotion EXP',
    'Diwali Bonus/Gift EXP', 'LABOUR & DELIVERY CHARGES EXP', 'PACKING MATERIAL EXP', 'Sales Commission Expense',
    'Stationary Expense', 'Travelling Expense'
  ]);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadLocalState<any | null>(ACCOUNTING_STORAGE_KEY, null);
    if (saved) {
      if (Array.isArray(saved.ledger)) setAllLedger(saved.ledger);
      if (Array.isArray(saved.expenses)) setAllExpenses(saved.expenses);
      if (Array.isArray(saved.expenseCategories)) setExpenseCategories(saved.expenseCategories);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveLocalState(ACCOUNTING_STORAGE_KEY, {
      ledger: allLedger,
      expenses: allExpenses,
      expenseCategories,
    });
  }, [allLedger, allExpenses, expenseCategories, isHydrated]);

  const ledger = useMemo(() => allLedger.filter(l => l.companyId === activeCompany?.id), [allLedger, activeCompany]);
  const expenses = useMemo(() => allExpenses.filter(e => e.companyId === activeCompany?.id), [allExpenses, activeCompany]);

  const accounts = useMemo(() => {
    return baseAccounts
      .filter(a => a.companyId === activeCompany?.id)
      .map(acc => {
        const accEntries = ledger.filter(e => e.accountId === acc.id);
        const netChange = accEntries.reduce((sum, e) => sum + e.debit - e.credit, 0);
        return { ...acc, balance: acc.balance + netChange };
      });
  }, [baseAccounts, ledger, activeCompany]);

  const addLedger = useCallback((e: Omit<LedgerEntry, 'id' | 'companyId'>) => {
    if (!activeCompany) return '';
    const ne = { ...e, id: `LGR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, companyId: activeCompany.id, reconciled: false };
    setAllLedger(prev => [...prev, ne as LedgerEntry]);
    return ne.id;
  }, [activeCompany]);

  const toggleReconciliation = useCallback((id: string) => {
    setAllLedger(prev => prev.map(e => e.id === id ? { ...e, reconciled: !e.reconciled } : e));
  }, []);

  const recordCustomerAdvance = useCallback((partyId: string, partyName: string, amount: number, accountId: string, reference: string) => {
    const date = new Date().toISOString().split('T')[0];
    // Side 1: Debit Cash/Bank (Treasury). Removed partyId to prevent duplication in Customer Ledger.
    addLedger({ date, partyId: undefined, partyName, type: TransactionType.CUSTOMER_PAYMENT, debit: amount, credit: 0, accountId, reference, description: `Receipt: ${partyName}` });
    // Side 2: Credit Customer (Receivable). partyId is used for balance movement.
    addLedger({ date, partyId, partyName, type: TransactionType.CUSTOMER_PAYMENT, debit: 0, credit: amount, accountId: undefined, reference, description: `Receipt from ${partyName}` });
    return reference;
  }, [addLedger]);

  const recordVendorAdvance = useCallback((partyId: string, partyName: string, amount: number, accountId: string, reference: string) => {
    const date = new Date().toISOString().split('T')[0];
    // Side 1: Credit Cash/Bank (Treasury). Removed partyId to prevent duplication in Supplier Ledger.
    addLedger({ date, partyId: undefined, partyName, type: TransactionType.VENDOR_PAYMENT, debit: 0, credit: amount, accountId, reference, description: `Payment to ${partyName}` });
    // Side 2: Debit Vendor (Payable). partyId is used for balance movement.
    addLedger({ date, partyId, partyName, type: TransactionType.VENDOR_PAYMENT, debit: amount, credit: 0, accountId: undefined, reference, description: `Payment: ${partyName}` });
    return reference;
  }, [addLedger]);

  const recordSalesRevenue = useCallback((invoiceId: string, orderNo: string, partyId: string, partyName: string, amount: number, taxAmount: number) => {
    // Standard sales recognition: Debit Customer (increases what they owe).
    addLedger({ date: new Date().toISOString().split('T')[0], partyId, partyName, type: TransactionType.REVENUE, debit: amount, credit: 0, transactionId: invoiceId, reference: orderNo, description: `Invoice Generated: ${orderNo}` });
  }, [addLedger]);

  const recordPurchaseCost = useCallback((billId: string, billNo: string, supplierId: string, supplierName: string, amount: number, taxAmount: number) => {
    // Standard purchase recognition: Credit Vendor (increases what we owe).
    addLedger({ date: new Date().toISOString().split('T')[0], partyId: supplierId, partyName: supplierName, type: TransactionType.COST, debit: 0, credit: amount, transactionId: billId, reference: billNo, description: `Vendor Bill: ${billNo}` });
  }, [addLedger]);

  const recordPaymentAgainstInvoice = useCallback((invoiceId: string, partyId: string, partyName: string, amount: number, accountId: string, reference: string) => {
    const date = new Date().toISOString().split('T')[0];
    // Side 1: Debit Cash/Bank. Removed partyId to ensure focused ledger remains clean.
    addLedger({ date, partyId: undefined, partyName, type: TransactionType.CUSTOMER_PAYMENT, debit: amount, credit: 0, accountId, transactionId: invoiceId, reference, description: `Payment Received: ${invoiceId}` });
    // Side 2: Credit Customer. partyId ensures the customer's balance is reduced.
    addLedger({ date, partyId, partyName, type: TransactionType.CUSTOMER_PAYMENT, debit: 0, credit: amount, accountId: undefined, transactionId: invoiceId, reference, description: `Credit for payment: ${invoiceId}` });
  }, [addLedger]);

  const recordPaymentAgainstBill = useCallback((billId: string, partyId: string, amount: number, accountId: string, reference: string) => {
    const date = new Date().toISOString().split('T')[0];
    const partyName = ledger.find(l => l.partyId === partyId)?.partyName || 'Vendor';
    // Side 1: Credit Cash/Bank. Removed partyId.
    addLedger({ date, partyId: undefined, partyName, type: TransactionType.VENDOR_PAYMENT, debit: 0, credit: amount, accountId, transactionId: billId, reference, description: `Bill Payment: ${billId}` });
    // Side 2: Debit Vendor. partyId ensures the vendor's balance is reduced.
    addLedger({ date, partyId, partyName, type: TransactionType.VENDOR_PAYMENT, debit: amount, credit: 0, accountId: undefined, transactionId: billId, reference, description: `Debit for payment: ${billId}` });
  }, [addLedger, ledger]);

  const addExpense = useCallback((expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'companyId'>) => {
    if (!activeCompany) return;
    const newExp: ExpenseRecord = { ...expense, id: `EXP-${Date.now()}`, createdAt: new Date().toISOString(), companyId: activeCompany.id };
    setAllExpenses(prev => [...prev, newExp]);
    addLedger({ date: expense.date, type: TransactionType.OPERATIONAL_EXPENSE, debit: 0, credit: expense.amount, accountId: expense.accountId, reference: 'EXPENSE', description: expense.description });
  }, [activeCompany, addLedger]);

  const transferFunds = useCallback((from: string, to: string, amount: number, reference: string) => {
    const fromAcc = accounts.find(a => a.id === from);
    if (!fromAcc || fromAcc.balance < amount) return false;
    const date = new Date().toISOString().split('T')[0];
    addLedger({ date, type: TransactionType.FUND_TRANSFER, debit: 0, credit: amount, accountId: from, reference, description: `Transfer to ${accounts.find(a => a.id === to)?.name}` });
    addLedger({ date, type: TransactionType.FUND_TRANSFER, debit: amount, credit: 0, accountId: to, reference, description: `Transfer from ${fromAcc.name}` });
    return true;
  }, [accounts, addLedger]);

  const addExpenseCategory = useCallback((cat: string) => setExpenseCategories(prev => Array.from(new Set([...prev, cat]))), []);

  const getAccountLedger = useCallback((accountId: string) => {
    const acc = baseAccounts.find(a => a.id === accountId);
    let balance = acc ? acc.balance : 0;
    return ledger
      .filter(e => e.accountId === accountId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => {
        balance += (e.debit - e.credit);
        return { ...e, runningBalance: balance };
      }).reverse();
  }, [baseAccounts, ledger]);

  const getCustomerNetLedger = useCallback((partyId: string) => {
    let balance = 0;
    return ledger
      .filter(e => e.partyId === partyId && e.accountId === undefined && (e.type === TransactionType.REVENUE || e.type === TransactionType.CUSTOMER_PAYMENT))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => {
        balance += (e.debit - e.credit);
        return { ...e, runningBalance: balance };
      }).reverse();
  }, [ledger]);

  const getSupplierNetLedger = useCallback((partyId: string) => {
    let balance = 0;
    return ledger
      .filter(e => e.partyId === partyId && e.accountId === undefined && (e.type === TransactionType.COST || e.type === TransactionType.VENDOR_PAYMENT))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => {
        balance += (e.credit - e.debit);
        return { ...e, runningBalance: balance };
      }).reverse();
  }, [ledger]);

  const getPLStatement = useCallback(() => {
    const grossSales = ledger.filter(e => e.type === TransactionType.REVENUE).reduce((sum, e) => sum + e.debit, 0);
    const costOfGoods = ledger.filter(e => e.type === TransactionType.COST).reduce((sum, e) => sum + e.credit, 0);
    const operatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { grossSales, costOfGoods, operatingExpenses, netIncome: grossSales - costOfGoods - operatingExpenses };
  }, [ledger, expenses]);

  const getCashFlowStatement = useCallback((startDate?: string, endDate?: string): CashFlowResult => {
    const filtered = ledger.filter(e => e.accountId !== undefined && (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate));
    
    const inflows: Record<string, CashFlowBreakdown> = {};
    const outflows: Record<string, CashFlowBreakdown> = {};

    filtered.forEach(e => {
      if (e.debit > 0) {
        let cat = 'Other Income';
        if (e.type === TransactionType.CUSTOMER_PAYMENT) cat = 'Customer Receipts';
        else if (e.type === TransactionType.REVENUE) cat = 'Cash Sales';
        else if (e.type === TransactionType.FUND_TRANSFER) cat = 'Internal Transfers';

        if (!inflows[cat]) inflows[cat] = { category: cat, amount: 0, transactions: [] };
        inflows[cat].amount += e.debit;
        inflows[cat].transactions.push(e);
      }
      if (e.credit > 0) {
        let cat = 'Other Payments';
        if (e.type === TransactionType.VENDOR_PAYMENT) cat = 'Vendor Payments';
        else if (e.type === TransactionType.FUND_TRANSFER) cat = 'Internal Transfers';
        else if (e.type === TransactionType.OPERATIONAL_EXPENSE) {
          const isPayroll = e.description.toLowerCase().includes('payroll') || e.description.toLowerCase().includes('salary');
          cat = isPayroll ? 'Payroll Payments' : 'Expense Payments';
        }

        if (!outflows[cat]) outflows[cat] = { category: cat, amount: 0, transactions: [] };
        outflows[cat].amount += e.credit;
        outflows[cat].transactions.push(e);
      }
    });

    const cashIn = Object.values(inflows).reduce((s, i) => s + i.amount, 0);
    const cashOut = Object.values(outflows).reduce((s, o) => s + o.amount, 0);

    return { cashIn, cashOut, netFlow: cashIn - cashOut, inflows: Object.values(inflows), outflows: Object.values(outflows) };
  }, [ledger]);

  const getReceivablesAgeing = useCallback(() => {
    const parties = Array.from(new Set(ledger.filter(e => e.partyId).map(e => e.partyId!)));
    const ageing: any[] = [];
    parties.forEach(pid => {
      const partyLedger = ledger.filter(e => e.partyId === pid && e.accountId === undefined);
      // Determine if Customer based on transaction types
      const isCustomer = partyLedger.some(e => e.type === TransactionType.REVENUE || e.type === TransactionType.CUSTOMER_PAYMENT);
      if (!isCustomer) return;

      const totalDue = partyLedger.reduce((sum, e) => sum + (e.debit - e.credit), 0);
      if (Math.abs(totalDue) > 0.01) {
        const firstEntry = partyLedger.find(e => e.type === TransactionType.REVENUE) || partyLedger[0];
        ageing.push({
          id: pid,
          ref: firstEntry?.reference || 'MULTIPLE',
          customer: firstEntry?.partyName || 'Customer',
          partyId: pid,
          date: firstEntry?.date || '-',
          total: partyLedger.filter(e => e.debit > 0).reduce((s, e) => s + e.debit, 0),
          paid: partyLedger.filter(e => e.credit > 0).reduce((s, e) => s + e.credit, 0),
          due: totalDue
        });
      }
    });
    return ageing.sort((a, b) => b.due - a.due);
  }, [ledger]);

  const getPayablesAgeing = useCallback(() => {
    const parties = Array.from(new Set(ledger.filter(e => e.partyId).map(e => e.partyId!)));
    const ageing: any[] = [];
    parties.forEach(pid => {
      const partyLedger = ledger.filter(e => e.partyId === pid && e.accountId === undefined);
      // Determine if Vendor based on transaction types
      const isVendor = partyLedger.some(e => e.type === TransactionType.COST || e.type === TransactionType.VENDOR_PAYMENT);
      if (!isVendor) return;

      const totalDue = partyLedger.reduce((sum, e) => sum + (e.credit - e.debit), 0);
      if (Math.abs(totalDue) > 0.01) {
        const firstEntry = partyLedger.find(e => e.type === TransactionType.COST) || partyLedger[0];
        ageing.push({
          id: pid,
          ref: firstEntry?.reference || 'MULTIPLE',
          vendor: firstEntry?.partyName || 'Vendor',
          partyId: pid,
          date: firstEntry?.date || '-',
          total: partyLedger.filter(e => e.credit > 0).reduce((s, e) => s + e.credit, 0),
          paid: partyLedger.filter(e => e.debit > 0).reduce((s, e) => s + e.debit, 0),
          due: totalDue
        });
      }
    });
    return ageing.sort((a, b) => b.due - a.due);
  }, [ledger]);

  const getBrandProfitability = useCallback((products: Product[]) => {
    const brands = Array.from(new Set(products.map(p => p.brand)));
    return brands.map(b => {
      const rev = ledger.filter(e => e.type === TransactionType.REVENUE && e.description.includes(b)).reduce((s, e) => s + e.debit, 0) || 0;
      const c = rev * 0.7;
      return { brand: b, revenue: rev, cost: c, grossProfit: rev - c, margin: rev > 0 ? ((rev - c) / rev) * 100 : 0 };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [ledger]);

  const getDayWiseCashBook = useCallback((start: string, end: string) => {
    const dates = [];
    let curr = new Date(start);
    const last = new Date(end);
    while (curr <= last) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    let runningOpening = baseAccounts.reduce((s, a) => s + a.balance, 0);
    const priorHistory = allLedger.filter(e => e.accountId !== undefined && e.date < start);
    runningOpening += priorHistory.reduce((s, e) => s + e.debit - e.credit, 0);

    return dates.map(d => {
      const dayEntries = ledger.filter(e => e.date === d && e.accountId !== undefined);
      const receipts = dayEntries.reduce((s, e) => s + e.debit, 0);
      const payments = dayEntries.reduce((s, e) => s + e.credit, 0);
      const closing = runningOpening + receipts - payments;
      const result = { date: d, opening: runningOpening, receipts, payments, closing };
      runningOpening = closing;
      return result;
    });
  }, [allLedger, ledger, baseAccounts]);

  return (
    <AccountingContext.Provider value={{ 
      accounts, expenses, ledger, expenseCategories, recordCustomerAdvance, recordVendorAdvance,
      recordSalesRevenue, recordPurchaseCost, recordPaymentAgainstInvoice, recordPaymentAgainstBill,
      addExpense, transferFunds, addExpenseCategory,
      toggleReconciliation, getAccountLedger, getCustomerNetLedger, getSupplierNetLedger,
      getPLStatement, getCashFlowStatement, getReceivablesAgeing, getPayablesAgeing, getBrandProfitability, getDayWiseCashBook
    }}>
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) throw new Error('useAccounting missing provider');
  return context;
};
