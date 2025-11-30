
// =================================================================
// ============== Core Firestore Collection Types ==============
// =================================================================

/**
 * Stores information about each factory entity using the ERP.
 * Collection: /factories
 */
export interface Factory {
  id: string;
  name:string;
  address: string;
  contactInfo: string;
}

/**
 * Manages user accounts with access to the system.
 * Collection: /users
 */
export interface User {
  id: string; // Firebase Auth UID
  factoryId: string;
  email: string;
  role: 'owner' | 'supervisor';
  name?: string;
}

/**
 * Contains profiles for all workers within a factory.
 * Collection: /workers
 */
export interface Worker {
  id: string;
  factoryId: string;
  name: string;
  contact?: string;
  hireDate: string; // ISO Timestamp
}

/**
 * Defines payment rates for different types of work.
 * Collection: /rates
 */
export interface Rate {
  id: string;
  factoryId: string;
  rateName: string;
  amount: number;
  unit: 'per_hour' | 'per_piece' | 'daily';
}

/**
 * Records daily work output for each worker.
 * Collection: /workerLogs
 */
export interface WorkerLog {
  id: string;
  factoryId: string;
  workerId: string;
  rateId: string;
  date: string; // ISO Timestamp
  quantity: number;
  approved: boolean;
}

/**
 * Represents a payment line item for a single worker within a payroll run.
 * Sub-collection: /payrolls/{payrollId}/workerPayments
 */
export interface WorkerPayment {
  // The ID for this document is the worker's ID
  amount: number;
  breakdown: string; // e.g., "50 units @ $2.50/unit"
  status: 'pending' | 'paid';
}

/**
 * Stores aggregated payroll records for a specific period.
 * Collection: /payrolls
 */
export interface Payroll {
  id: string;
  factoryId: string;
  periodStartDate: string; // ISO Timestamp
  periodEndDate: string; // ISO Timestamp
  totalAmount: number;
  status: 'pending' | 'paid';
}

/**
 * A write-only log for critical system events for compliance and tracking.
 * Collection: /auditLogs
 */
export interface AuditLog {
  id: string;
  factoryId: string;
  timestamp: string; // ISO Timestamp
  userId: string;
  event: string; // e.g., "payroll.create", "user.update_role"
  details: string; // e.g., "Created payroll P-1024 for $5,432.10"
}


// =================================================================
// ===================== UI & Other Types ==========================
// =================================================================

export type AuthView = 'login' | 'signup' | 'setup' | 'forgot-password';
export type View = 'dashboard' | 'workers' | 'logs' | 'payrolls' | 'rates' | 'settings';

export interface AIInsight {
  title: string;
  description: string;
  type: 'warning' | 'success' | 'info';
}

