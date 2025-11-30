/**
 * ============================================================================
 * NEXUS ERP - TYPE DEFINITIONS
 * ============================================================================
 * Central location for all TypeScript interfaces and types used across the app.
 */

// --- Worker Types ---
export interface Worker {
  id?: string;
  factoryId: string;
  name: string;
  phone: string;
  role: 'Weaver' | 'Helper' | 'Supervisor';
  salaryType: 'PieceRate' | 'Monthly' | 'Daily';
  baseSalary: number; // For monthly/daily workers; 0 for piece-rate
  joinedDate: string; // ISO date string (YYYY-MM-DD)
  status: 'Active' | 'Inactive';
  isSSB: boolean; // Super Savings Bank - 2% deduction
  createdAt?: string; // ISO timestamp
}

// --- Material Requirement (BOM) Types ---
export interface MaterialRequirement {
  inventoryItemId: string;
  inventoryItemName: string; // Denormalized for display
  quantityPerUnit: number;   // e.g., 0.5 yards per piece
}

// --- Rate/Task Types ---
export interface Rate {
  id?: string;
  factoryId: string;
  taskName: string; // e.g., "Sewing Grade A", "Ironing", "Packing"
  pricePerUnit: number; // e.g., 500 MMK per unit
  unit: string; // e.g., "pcs", "yards", "kg", "meter"
  currency: string; // "MMK" (default)
  status: 'Active' | 'Archived';
  description?: string;
  requiredMaterials?: MaterialRequirement[]; // Bill of Materials
  createdAt?: string;
}

// --- Worker Log Types ---
export interface WorkerLog {
  id?: string;
  factoryId: string;
  workerId: string;
  workerName: string; // Denormalized for easier display
  rateId: string;
  taskName: string; // Denormalized snapshot (e.g., "Sewing Grade A")
  pricePerUnit: number; // Snapshot of price at the time of logging
  quantity: number; // Completed quantity
  defectQty: number; // Optional deduction (defective units)
  totalPay: number; // Calculated: (quantity - defectQty) * pricePerUnit
  date: string; // YYYY-MM-DD
  timestamp?: any; // Server timestamp
  status: 'Pending' | 'Approved';
  shift?: 'Day' | 'Night'; // Optional shift indicator
  createdAt?: string;
}

// --- Payroll Types ---
export interface Payroll {
  id?: string;
  factoryId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  totalAmount: number;
  status: 'Draft' | 'Finalized';
  createdAt?: any;
}

export interface PayrollItem {
  id?: string;
  payrollId: string;
  workerId: string;
  workerName: string;
  totalProductionQty: number; // Sum of logs
  productionEarnings: number; // Sum of log earnings
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number; // The final amount
}

export interface WorkerPayment {
  amount: number;
  breakdown: string; // e.g., "140 units @ 2.50"
  status: 'pending' | 'paid';
}

// --- Inventory Types ---
export interface InventoryItem {
  id?: string;
  factoryId: string;
  name: string;           // e.g., "White Cotton Fabric"
  category: string;       // e.g., "Fabric", "Accessories", "Packaging"
  currentStock: number;   // e.g., 500
  unit: string;           // e.g., "Yards", "Rolls", "Pcs"
  minStockLevel: number;  // e.g., 50 (Alert if below this)
  costPerUnit: number;    // e.g., 2000 MMK (Last purchase price)
  lastUpdated?: any;      // Server timestamp
}

export interface InventoryTransaction {
  id?: string;
  factoryId: string;
  itemId: string;
  itemName: string;       // Denormalized
  type: 'IN' | 'OUT';     // IN = Purchase, OUT = Usage
  quantity: number;
  reason: string;         // e.g., "Purchase from Supplier A", "Production Lot 101"
  costPerUnit?: number;   // Only for IN transactions
  totalCost?: number;     // Calculated (quantity * costPerUnit)
  date: string;           // YYYY-MM-DD
  performedBy: string;    // User email/name
  timestamp?: any;        // Server timestamp
}

// --- Audit Log Types ---
export interface AuditLog {
  id?: string;
  factoryId: string;
  collection: string;
  docId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  userId: string;
  timestamp: string;
  details?: Record<string, any>;
}

// --- Customer Types (Module C: Sales & POS) ---
export interface Customer {
  id?: string;
  factoryId: string;
  name: string;
  phone: string;
  address?: string;
  totalCredit: number; // Amount they owe
  createdAt?: string;
}

// --- Invoice Types (Module C: Sales & POS) ---
export interface InvoiceItem {
  itemName: string;     // Product name
  quantity: number;
  price: number;
  total: number;        // quantity * price
}

export interface Invoice {
  id?: string;
  factoryId: string;
  customerId: string;
  customerName: string; // Denormalized
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;   // If paid < total, rest is credit
  paymentMethod: 'Cash' | 'Kpay' | 'Wave';
  status: 'Paid' | 'Partial' | 'Unpaid';
  date: string;         // YYYY-MM-DD
  createdAt?: any;      // Server timestamp
}
