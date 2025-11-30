/**
 * ============================================================================
 * NEXUS ERP - FIREBASE CLOUD FUNCTIONS (index.ts)
 * ============================================================================
 * Backend logic for Multi-tenant User Provisioning, Payroll Automation,
 * and Audit Triggers.
 *
 * Region: asia-east1 (Optimized for Asia/Myanmar access)
 * ============================================================================
 */

import * as admin from "firebase-admin";
import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import {
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { v4 as uuidv4 } from "uuid";

// 1. Initialize Configuration
admin.initializeApp();
const db = admin.firestore();

// Set global options to run in Asia (Fixes timeout issues)
setGlobalOptions({ region: "asia-east1" });

// ============================================================================
// TYPE DEFINITIONS (For Type Safety)
// ============================================================================
interface WorkerLog {
  workerId: string;
  completedQty: number;
  rateAtLog: number;
  isFinalized: boolean;
}

interface WorkerPaymentCalc {
  workerId: string;
  totalGrossPay: number;
  totalDeductions: number;
  netPay: number;
  logCount: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const assertAuthenticated = (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  return request.auth;
};

const assertOwner = (request: CallableRequest) => {
  const auth = assertAuthenticated(request);
  if (auth.token.role !== "owner" || !auth.token.factoryId) {
    throw new HttpsError("permission-denied", "Only factory owners can perform this action.");
  }
  return { uid: auth.uid, factoryId: auth.token.factoryId };
};

// ============================================================================
// BLOCK 9: User Provisioning & Custom Claims
// ============================================================================

/**
 * setupFactory: Creates a new factory and assigns the caller as 'Owner'.
 */
export const setupFactory = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  // Prevent double creation
  if (request.auth?.token.factoryId) {
    throw new HttpsError("failed-precondition", "You already belong to a factory.");
  }

  const { name, currency, defaultCycle } = request.data;
  if (!name || !currency) {
    throw new HttpsError("invalid-argument", "Missing factory name or currency.");
  }

  // 1. Create Factory Doc
  const factoryRef = db.collection("factories").doc();
  const newFactoryId = factoryRef.id;
  
  await factoryRef.set({
    name,
    currency,
    defaultCycle: defaultCycle || "monthly",
    ownerUid: uid,
    createdAt: new Date().toISOString(),
  });

  // 2. Set Custom Claims (The "Badge")
  await admin.auth().setCustomUserClaims(uid, {
    role: "owner",
    factoryId: newFactoryId,
  });

  // 3. Update User Profile in Firestore
  await db.collection("users").doc(uid).set({
    email: request.auth?.token.email || "",
    role: "owner",
    factoryId: newFactoryId,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  logger.info(`Factory ${newFactoryId} created by ${uid}`);
  return { factoryId: newFactoryId };
});

/**
 * inviteSupervisor: Owner invites a supervisor (Creates Auth + Claims).
 */
export const inviteSupervisor = onCall(async (request) => {
  const { uid, factoryId } = assertOwner(request);
  const { email, name } = request.data;

  if (!email || !name) throw new HttpsError("invalid-argument", "Email and Name required.");

  // 1. Create Auth User with Temp Password
  const temporaryPassword = uuidv4().substring(0, 8);
  let newUserRecord;
  
  try {
    newUserRecord = await admin.auth().createUser({
      email,
      password: temporaryPassword,
      displayName: name,
    });
  } catch (error: any) {
    logger.error("Auth Create Error", error);
    throw new HttpsError("already-exists", "User with this email likely already exists.");
  }

  // 2. Set Claims
  await admin.auth().setCustomUserClaims(newUserRecord.uid, {
    role: "supervisor",
    factoryId: factoryId,
  });

  // 3. Create User Doc
  await db.collection("users").doc(newUserRecord.uid).set({
    factoryId,
    email,
    name,
    role: "supervisor",
    invitedBy: uid,
    createdAt: new Date().toISOString(),
  });

  return { email, temporaryPassword };
});

// ============================================================================
// BLOCK 6: Payroll Automation Engine
// ============================================================================

/**
 * calculatePayroll: Aggregates workerLogs to create a Payroll draft.
 * (Now Fully Implemented)
 */
export const calculatePayroll = onCall(async (request) => {
  const { factoryId, uid } = assertOwner(request);
  const { periodStart, periodEnd, cycleType } = request.data;

  if (!periodStart || !periodEnd) throw new HttpsError("invalid-argument", "Date range required.");

  // 1. Query Worker Logs
  const logsSnapshot = await db.collection("workerLogs")
    .where("factoryId", "==", factoryId)
    .where("date", ">=", periodStart)
    .where("date", "<=", periodEnd)
    .where("isFinalized", "==", false) // Only calculate open logs
    .get();

  if (logsSnapshot.empty) {
    return { message: "No open logs found for this period." };
  }

  // 2. Aggregate Data (Group by Worker)
  const calculations: Record<string, WorkerPaymentCalc> = {};
  let payrollTotalGross = 0;

  logsSnapshot.forEach(doc => {
    const data = doc.data() as WorkerLog;
    const pay = data.completedQty * data.rateAtLog;

    if (!calculations[data.workerId]) {
      calculations[data.workerId] = {
        workerId: data.workerId,
        totalGrossPay: 0,
        totalDeductions: 0,
        netPay: 0,
        logCount: 0
      };
    }

    calculations[data.workerId].totalGrossPay += pay;
    calculations[data.workerId].netPay += pay; // Deductions added later
    calculations[data.workerId].logCount += 1;
    payrollTotalGross += pay;
  });

  // 3. Create Payroll Document
  const payrollRef = db.collection("payrolls").doc();
  const payrollId = payrollRef.id;

  const batch = db.batch();

  // Set Payroll Header
  batch.set(payrollRef, {
    factoryId,
    periodStart,
    periodEnd,
    cycleType: cycleType || "custom",
    status: "Draft",
    totalGrossPay: payrollTotalGross,
    totalDeductions: 0,
    totalNetPay: payrollTotalGross,
    createdBy: uid,
    createdAt: new Date().toISOString()
  });

  // Create Sub-collection: workerPayments
  Object.values(calculations).forEach(calc => {
    const paymentRef = payrollRef.collection("workerPayments").doc(calc.workerId);
    batch.set(paymentRef, calc);
  });

  await batch.commit();
  logger.info(`Payroll ${payrollId} calculated for factory ${factoryId}`);

  return { payrollId, totalAmount: payrollTotalGross, workerCount: Object.keys(calculations).length };
});

/**
 * finalizePayroll: Locks logs and marks payroll as Final.
 */
export const finalizePayroll = onCall(async (request) => {
  const { factoryId } = assertOwner(request);
  const { payrollId } = request.data;

  return db.runTransaction(async (t) => {
    const payrollRef = db.collection("payrolls").doc(payrollId);
    const payrollDoc = await t.get(payrollRef);

    if (!payrollDoc.exists || payrollDoc.data()?.factoryId !== factoryId) {
      throw new HttpsError("not-found", "Payroll not found.");
    }
    if (payrollDoc.data()?.status === "Finalized") {
      throw new HttpsError("failed-precondition", "Already finalized.");
    }

    // 1. Update Payroll Status
    t.update(payrollRef, { status: "Finalized", finalizedAt: new Date().toISOString() });

    // 2. Lock Worker Logs
    const { periodStart, periodEnd } = payrollDoc.data()!;
    const logsQuery = await db.collection("workerLogs")
      .where("factoryId", "==", factoryId)
      .where("date", ">=", periodStart)
      .where("date", "<=", periodEnd)
      .get();

    logsQuery.forEach(doc => {
      t.update(doc.ref, { isFinalized: true });
    });

    return { success: true, count: logsQuery.size };
  });
});

/**
 * addDeduction: Updates a worker's payment and the main payroll totals.
 * (Now Fully Implemented)
 */
export const addDeduction = onCall(async (request) => {
  assertOwner(request); // Ensures only owner can perform this action.
  const { payrollId, workerId, amount, reason } = request.data;
  const deductionAmount = Number(amount);

  if (!deductionAmount || deductionAmount <= 0) {
    throw new HttpsError("invalid-argument", "Valid amount required.");
  }

  const payrollRef = db.collection("payrolls").doc(payrollId);
  const workerPaymentRef = payrollRef.collection("workerPayments").doc(workerId);

  return db.runTransaction(async (t) => {
    // Read
    const payrollDoc = await t.get(payrollRef);
    const workerDoc = await t.get(workerPaymentRef);

    if (!payrollDoc.exists || !workerDoc.exists) {
      throw new HttpsError("not-found", "Payroll or Worker Payment not found.");
    }
    if (payrollDoc.data()?.status === "Finalized") {
      throw new HttpsError("failed-precondition", "Cannot modify finalized payroll.");
    }

    // Calculate New Values
    const currentPayrollDeductions = payrollDoc.data()?.totalDeductions || 0;
    const currentPayrollNet = payrollDoc.data()?.totalNetPay || 0;
    
    const currentWorkerDeductions = workerDoc.data()?.totalDeductions || 0;
    const currentWorkerNet = workerDoc.data()?.netPay || 0;

    // Update Worker Payment
    t.update(workerPaymentRef, {
      totalDeductions: currentWorkerDeductions + deductionAmount,
      netPay: currentWorkerNet - deductionAmount,
      // Add to ledger array (simplified)
      deductionsList: admin.firestore.FieldValue.arrayUnion({
        amount: deductionAmount,
        reason,
        addedAt: new Date().toISOString()
      })
    });

    // Update Main Payroll Totals
    t.update(payrollRef, {
      totalDeductions: currentPayrollDeductions + deductionAmount,
      totalNetPay: currentPayrollNet - deductionAmount
    });

    return { success: true };
  });
});

/**
 * generateExport: Stub for Phase 2.
 */
export const generateExport = onCall(async (request) => {
  return { url: "#", message: "Export functionality coming in Phase 2." };
});

// ============================================================================
// BLOCK 6: Audit Trigger
// ============================================================================

export const onAuditLog = onDocumentWritten({
  document: "{collectionId}/{docId}",
  region: "asia-east1" // Important: Trigger must match function region
}, (event) => {
  const collectionId = event.params.collectionId;
  const targetCollections = ["payrolls", "workerLogs", "rates"];

  if (!targetCollections.includes(collectionId)) return;

  const before = event.data?.before.data();
  const after = event.data?.after.data();
  
  // Determine Action
  let actionType = "unknown";
  if (!before && after) actionType = "CREATE";
  else if (before && after) actionType = "UPDATE";
  else if (before && !after) actionType = "DELETE";

  const factoryId = after?.factoryId || before?.factoryId;
  if (!factoryId) return; // Cannot audit without context

  // Ideally, 'modifiedBy' should be passed in the data. 
  // Since triggers run as system, we rely on the doc data.
  const userId = after?.modifiedBy || after?.createdBy || "system";

  return db.collection("auditLogs").add({
    factoryId,
    collection: collectionId,
    docId: event.params.docId,
    action: actionType,
    userId,
    timestamp: new Date().toISOString(),
    details: {
      diff: actionType === "UPDATE" ? "See versions" : "N/A"
    }
  });
});