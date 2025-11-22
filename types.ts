
// Core Types based on Project V2 Schema

export type InventoryType = 'raw_material' | 'finished_good';

export interface InventoryItem {
  factoryId: string;
  itemId: string;
  name: string;
  type: InventoryType;
  currentStock: number;
  unit: string;
  reorderLevel: number;
}

export interface Customer {
  factoryId: string;
  id: string; // internal UUID
  name: string;
  phone: string;
  totalPurchases: number; // LTV
  lastOrderDate: string; // ISO Date string
}

export interface OrderItem {
  itemId: string;
  qty: number;
  price: number;
  itemName?: string; // Hydrated for UI
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface Order {
  factoryId: string;
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  date: string; // ISO Timestamp
}

// The Critical Link Logic
export interface Task {
  id: string;
  taskName: string;
  pricePerUnit: number; // Piece rate for worker
  outputInventoryId: string | null; // The Critical Link: Which item does this produce?
}

export interface WorkerLog {
  id: string;
  date: string;
  workerName: string;
  taskId: string;
  quantityCompleted: number;
  totalPay: number;
  status: 'pending' | 'paid'; // Added for Payroll tracking
  payrollRunId?: string;      // Link to a finalized payroll
}

// Auth & Setup Types
export type AuthView = 'login' | 'signup' | 'setup' | 'forgot-password';
export type PayrollCycle = 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Custom';
export type Currency = 'MMK' | 'USD' | 'THB';
export type UserRole = 'Owner' | 'Admin' | 'Supervisor' | 'Viewer';

// --- Subscription Types ---
export type SubscriptionPlan = 'Trial' | 'Monthly' | 'Yearly';
export type SubscriptionStatus = 'Active' | 'Expired' | 'Pending_Approval';

export interface SubscriptionDetails {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  amount: number;
  paymentMethod?: string; // e.g., 'KPay', 'Wave'
  transactionId?: string; // From Telegram Payment
}

export interface FactoryProfile {
  name: string;
  address: string;
  email: string;
  phone: string;
  logoUrl?: string;
  payrollCycle: PayrollCycle;
  currency: Currency;
  subscription: SubscriptionDetails; // Added Subscription Info
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastActive: string;
}

// UI State Types
export type View = 'dashboard' | 'inventory' | 'production' | 'sales' | 'crm' | 'settings' | 'payroll';
export type SettingsTab = 'profile' | 'config' | 'team' | 'billing'; // Added billing

export interface AIInsight {
  title: string;
  description: string;
  type: 'warning' | 'success' | 'info';
}

// --- Payroll System Types ---

export type DeductionType = 'advance' | 'loan' | 'penalty' | 'tax' | 'other';

export interface Deduction {
  id: string;
  workerName: string;
  type: DeductionType;
  amount: number;
  date: string;
  reason: string;
  isRecurring: boolean; // If true, applies automatically every cycle until removed
}

export interface PayrollEntry {
  workerName: string;
  grossPay: number; // Sum of tasks
  deductions: number;
  netPay: number;
  logCount: number;
  details: {
    logs: WorkerLog[];
    deductionsList: Deduction[];
  };
}

export interface PayrollRun {
  id: string;
  startDate: string;
  endDate: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  workerCount: number;
  status: 'finalized';
  finalizedDate: string;
  entries: PayrollEntry[]; // Snapshot of the run
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string; // e.g., "Finalized Payroll", "Added Deduction"
  user: string;   // e.g., "Owner"
  details: string;
}
