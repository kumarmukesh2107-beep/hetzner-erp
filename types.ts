
import React from 'react';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

export interface Company {
  id: string;
  name: string;
  gstNo: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  logo?: string;
  bankDetails?: {
    name: string;
    accountNo: string;
    ifsc: string;
    branch: string;
  };
  terms?: string[];
}

export interface PrintSettings {
  primaryColor: string;
  accentColor: string;
  showHeaderLogo: boolean;
  showBankDetails: boolean;
  showTerms: boolean;
  showSignatures: boolean;
  headerAlignment: 'left' | 'center' | 'right';
  footerNotes?: string;
  signatureLabels: {
    left: string;
    right: string;
  };
}

export interface PrintTemplate {
  id: string;
  name: string;
  description: string;
  settings: PrintSettings;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  avatar?: string;
  allowedCompanies: string[]; // List of company IDs the user can access
}

export interface AuthState {
  user: null | User;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

export enum WarehouseType {
  DISPLAY = 'DISPLAY',
  GODOWN = 'GODOWN',
  BOOKED = 'BOOKED',
  REPAIR = 'REPAIR',
  HISTORICAL = 'HISTORICAL',
  ARCHIVE = 'ARCHIVE' // Added for migration isolation
}

export interface ProductCategory {
  id: string;
  companyId: string;
  name: string;
  parentId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  source: 'MANUAL' | 'IMPORT';
  createdBy: string;
  createdAt: string;
}

export interface Product {
  id: string; 
  companyId: string; 
  name: string;
  image?: string;
  modelNo: string;
  brand: string;
  category: string;
  color?: string;
  range: string;
  salesPrice: number;
  cost: number;
  unit: string;
  trackInventory: boolean;
  isHistorical?: boolean;
  excludeFromStock?: boolean;
}

export interface WarehouseStock {
  productId: string;
  companyId: string;
  warehouse: WarehouseType;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  companyId: string;
  productId: string;
  sourceWarehouse: WarehouseType;
  destinationWarehouse: WarehouseType;
  quantity: number;
  timestamp: string;
  performedBy: string;
  date: string; 
  partyName?: string; 
  salesPerson?: string; 
  remarks?: string;
}

export interface ManualTransaction {
  id: string;
  companyId: string;
  productId: string;
  type: 'RECEIPT' | 'DELIVERY';
  warehouse: WarehouseType;
  quantity: number;
  reference: string;
  timestamp: string;
  performedBy: string;
  date: string; 
  partyName: string; 
  salesPerson?: string; 
}

export enum SalesStatus {
  QUOTATION = 'QUOTATION',
  QUOTATION_SENT = 'QUOTATION_SENT',
  SALES_ORDER = 'SALES_ORDER', 
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED',
  FULLY_DELIVERED = 'FULLY_DELIVERED',
  PARTIALLY_BILLED = 'PARTIALLY_BILLED',
  FULLY_BILLED = 'FULLY_BILLED',
  CANCELLED = 'CANCELLED',
  MIGRATED = 'MIGRATED'
}

export interface DeliveryRecord {
  id: string;
  date: string;
  warehouse: WarehouseType;
  items: { productId: string; qty: number; productName: string }[];
}

export interface SalesItem {
  productId: string;
  productName: string;
  modelNo: string;
  productImage?: string;
  orderedQty: number;
  deliveredQty: number;
  invoicedQty: number;
  price: number; 
  discount: number; 
  discountPercent: number; 
  gstRate: number;
  isGstEnabled: boolean;
  total: number;
}

export enum ContactType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER'
}

export const CONTACT_CATEGORIES = [
  'Customer',
  'Supplier',
  'Architect',
  'Employee',
  'Contractor',
  'Transporter',
  'Other'
] as const;

export type ContactCategory = typeof CONTACT_CATEGORIES[number];

export interface Contact {
  id: string; 
  companyId: string;
  name: string;
  type: ContactType; 
  contactTypes: ContactCategory[]; 
  mobile: string;
  email?: string;
  billingAddress: string;
  shippingAddress?: string;
  city: string;
  state: string;
  gstNo?: string;
  status?: string; 
  openingBalance: number;
  createdAt: string;
}

export interface SalesTransaction {
  id: string;
  companyId: string;
  orderNo: string;
  date: string;
  bookingDate: string;
  expectedDeliveryDate: string;
  contactId: string; 
  customerName: string;  
  customerAddress: string;
  shippingAddress: string;
  warehouse: WarehouseType;
  salesPerson: string;
  salesTeam?: string; // New Field
  cordName?: string; 
  salesType: string;
  type: string;
  storeName: string;
  architectIncentive: number;
  architectIncentivePercent: number;
  fittingCharges: number;
  fittingPercent: number;
  otherCharges?: number; // New Field
  discountPercent?: number; // New Field
  marginPercent?: number; // New Field
  invoiceStatus?: string; // New Field
  remarks: string;
  internalNotes?: string;
  items: SalesItem[];
  subtotal: number;
  totalGst: number;
  totalDiscount: number;
  grandTotal: number;
  amountPaid: number;
  status: SalesStatus;
  deliveryHistory: DeliveryRecord[];
  createdAt: string;
  updatedAt: string;
  isMigrated?: boolean;
  isHistorical?: boolean;
  source?: 'live' | 'migration'; // New Field
}

export enum PurchaseStatus {
  RFQ = 'RFQ',
  PO = 'PO',
  GRN_PARTIAL = 'GRN_PARTIAL',
  GRN_COMPLETED = 'GRN_COMPLETED',
  BILLED = 'BILLED',
  CANCELLED = 'CANCELLED',
  MIGRATED = 'MIGRATED'
}

export enum PaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID'
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  modelNo: string;
  productImage?: string; 
  orderedQty: number;
  receivedQty: number;
  billedQty: number;
  unitPrice: number;
  gst: number;
  total: number;
}

export interface GRNRecord {
  id: string;
  date: string;
  reference: string;
  items: { productId: string; qty: number; productName: string }[];
}

export interface VendorBillRecord {
  id: string;
  date: string;
  billNo: string;
  amount: number;
  items: { productId: string; qty: number; unitPrice: number; total: number }[];
}

export interface PurchaseTransaction {
  id: string;
  companyId: string;
  purchaseNo: string; 
  rfqNo: string;
  poNo: string;
  date: string;
  expectedDeliveryDate: string; 
  contactId: string; 
  supplierId: string; 
  warehouse: WarehouseType;
  status: PurchaseStatus;
  items: PurchaseItem[];
  grnHistory: GRNRecord[];
  billHistory: VendorBillRecord[];
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  isMigrated?: boolean;
  isHistorical?: boolean;
  source?: 'live' | 'migration';
}

export enum AccountType {
  CASH = 'CASH',
  BANK = 'BANK',
  UPI = 'UPI',
  CARD = 'CARD',
  CHEQUE = 'CHEQUE'
}

export interface FinancialAccount {
  id: string;
  companyId: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface ExpenseRecord {
  id: string;
  companyId: string;
  date: string;
  category: string; 
  description: string;
  amount: number;
  accountId: string;
  partyId?: string; 
  partyName?: string; 
  taxAmount?: number;
  createdAt: string;
}

export enum TransactionType {
  CUSTOMER_ADVANCE = 'CUSTOMER_ADVANCE', 
  CUSTOMER_PAYMENT = 'CUSTOMER_PAYMENT', 
  VENDOR_ADVANCE = 'VENDOR_ADVANCE',     
  VENDOR_PAYMENT = 'VENDOR_PAYMENT',     
  REVENUE = 'REVENUE',                   
  COST = 'COST',                         
  OPERATIONAL_EXPENSE = 'OPERATIONAL_EXPENSE',
  FUND_TRANSFER = 'FUND_TRANSFER'
}

export interface LedgerEntry {
  id: string;
  companyId: string;
  date: string;
  partyName?: string;
  partyId?: string; 
  type: TransactionType;
  debit: number;
  credit: number;
  accountId?: string;
  transactionId?: string; 
  reference: string;
  description: string;
  reconciled?: boolean; 
  isMigrated?: boolean;
  isHistorical?: boolean;
}

export interface SalesLog {
  id: string;
  companyId: string;
  timestamp: string;
  orderNo: string;
  customerName: string;
  action: string;
  oldTotal: number;
  newTotal: number;
  delta: number;
  performedBy: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNo: string;
  openingBalance: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  billingAddress: string;
  city: string;
  state: string;
  createdAt: string;
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  WEEK_OFF = 'WEEK_OFF',
  HOLIDAY = 'HOLIDAY',
  HALF_DAY = 'HALF_DAY'
}

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  monthlySalary: number;
  doe: string | null;
  markLateTime: string | null;
  weekOffDay: string;
  gender: 'MALE' | 'FEMALE';
  isExempt: boolean;
  bankLimit?: number;
}

export interface Holiday {
  id: string;
  companyId: string;
  date: string;
  name: string;
}

export interface PayrollRecord {
  id: string;
  companyId: string;
  empCode: string;
  name: string;
  month: string;
  year: number;
  present: number;
  absent: number;
  halfDays: number;
  lateCount: number;
  lateDeductionDays: number;
  holidays: number;
  weekOff: number;
  sandwichLeave: number;
  extraPaidDays: number;
  basicSalary: number;
  incentive: number;
  conveyance: number;
  grossSalary: number;
  attendanceDeduction: number;
  penaltySuperfone: number;
  penaltyDress: number;
  penaltyCRM: number;
  manualAdjustment: number;
  totalDeduction: number;
  netSalary: number;
  bankAmount: number;
  pdcAmount: number;
  status: 'PAID' | 'UNPAID';
  processedAt: string;
  isManualOverride?: boolean;
  remarks?: string;
  leaveBalance: number;
}

export interface DailyAttendance {
  id: string;
  companyId: string;
  empCode: string;
  date: string;
  month: string;
  year: number;
  inTime: string;
  outTime: string;
  lateBy: string;
  status: AttendanceStatus;
  manualOverride: boolean;
}
