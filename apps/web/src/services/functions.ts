import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

// ============================================================================
// Types for setupFactory
// ============================================================================
export interface SetupFactoryRequest {
  name: string;
  currency: 'MMK' | 'USD' | 'THB';
  defaultCycle: 'weekly' | 'monthly';
}

export interface SetupFactoryResponse {
  factoryId: string;
}

/**
 * Calls the 'setupFactory' cloud function.
 * Creates a new factory and assigns the caller as the 'Owner'.
 */
export const setupFactory = httpsCallable<SetupFactoryRequest, SetupFactoryResponse>(functions, 'setupFactory');


// ============================================================================
// Types for inviteSupervisor
// ============================================================================
export interface InviteSupervisorRequest {
  email: string;
  name: string;
}

export interface InviteSupervisorResponse {
  email: string;
  temporaryPassword?: string; // Present on success, but handle cases where it might not be.
}

/**
 * Calls the 'inviteSupervisor' cloud function.
 * Creates a new supervisor user under the owner's factory.
 */
export const inviteSupervisor = httpsCallable<InviteSupervisorRequest, InviteSupervisorResponse>(functions, 'inviteSupervisor');

// --- In the future, other function calls would be added here ---
// export const calculatePayroll = createCallable...
// export const finalizePayroll = createCallable...

// ============================================================================
// Types for calculatePayroll
// ============================================================================
export interface CalculatePayrollRequest {
  periodStart: string; // ISO Date string
  periodEnd: string; // ISO Date string
}

// The response will likely be a confirmation message, as the UI will update via hooks.
export interface CalculatePayrollResponse {
  success: boolean;
  message: string;
  payrollId?: string;
}

/**
 * Calls the 'calculatePayroll' cloud function.
 * Kicks off the backend process to calculate a payroll for a given period.
 */
export const calculatePayroll = httpsCallable<CalculatePayrollRequest, CalculatePayrollResponse>(functions, 'calculatePayroll');
