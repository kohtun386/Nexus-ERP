import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {GoogleGenerativeAI} from "@google/generative-ai";
import Stripe from "stripe";

// Initialize Firebase Admin SDK
admin.initializeApp();

// --- Stripe Initialization ---
const STRIPE_SECRET_KEY = functions.config().stripe?.secret_key;
if (!STRIPE_SECRET_KEY) {
  functions.logger.error(
    "Stripe secret key not set. " +
    "Run 'firebase functions:config:set stripe.secret_key=\"sk_...\"'"
  );
}
const stripe = STRIPE_SECRET_KEY ?
  new Stripe(STRIPE_SECRET_KEY, {apiVersion: "2024-06-20"}) :
  undefined;

// --- 1. Custom Claims (Role Assignment) Function ---
export const setUserRole = functions
  .region("asia-east1")
  .https.onCall(async (
    data: any, context: functions.https.CallableContext
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated", "User must be authenticated."
      );
    }

    const {uid, role} = data;
    const callerUid = context.auth.uid;

    if (!uid || !role || typeof uid !== "string" || typeof role !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument", "UID and role (string) are required."
      );
    }

    // Security Check: Ensure the caller is an Admin or Owner
    const callerUser = await admin.auth().getUser(callerUid);
    const callerClaims = callerUser.customClaims;

    if (!(callerClaims && (callerClaims.role === "Admin" ||
      callerClaims.role === "Owner"))) {
      throw new functions.https.HttpsError(
        "permission-denied", "Only Admin or Owner can set user roles."
      );
    }

    try {
      await admin.auth().setCustomUserClaims(uid, {role: role});

      const auditLog = {
        type: "USER_ROLE_SET",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        uid: uid,
        newRole: role,
        changedBy: callerUid,
      };
      await admin.firestore().collection("auditLogs").add(auditLog);

      return {
        message:
          `Custom claim 'role' set to '${role}' for user ${uid}. ` +
          "Audit log created.",
      };
    } catch (error) {
      functions.logger.error(
        "Error setting custom user claims or creating audit log:", error
      );
      throw new functions.https.HttpsError(
        "internal", "Failed to set custom user claims.", error
      );
    }
  });

// --- 2. Gemini API Proxy Function ---
const GEMINI_API_KEY = functions.config().gemini?.api_key;
if (!GEMINI_API_KEY) {
  functions.logger.error(
    "Gemini API Key is not set. " +
    "Run 'firebase functions:config:set gemini.api_key=\"KEY\"'"
  );
}
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : undefined;
const model = genAI ? genAI.getGenerativeModel({model: "gemini-pro"}) : undefined;

export const callGeminiApi = functions
  .region("asia-east1")
  .https.onCall(async (
    data: any, context: functions.https.CallableContext
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated", "Authentication required."
      );
    }
    if (!model) {
      throw new functions.https.HttpsError(
        "internal", "Gemini API not initialized."
      );
    }
    const {prompt} = data;
    if (!prompt || typeof prompt !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument", "A \"prompt\" (string) is required."
      );
    }
    try {
      const result = await model.generateContent(prompt);
      return {success: true, response: result.response.text()};
    } catch (error) {
      functions.logger.error("Error calling Gemini API:", error);
      // eslint-disable-next-line max-len
      throw new functions.https.HttpsError(
        "internal", "Failed to get response from Gemini API.", error
      );
    }
  });

// --- 3. Inventory Automation Trigger ---
export const updateInventoryOnProduction = functions
  .region("asia-east1")
  .firestore.document("productionLogs/{logId}")
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot) => {
    const {itemId, quantity} = snap.data();
    if (!itemId || typeof quantity !== "number" || quantity <= 0) {
      functions.logger.error("Invalid production log data:", snap.data());
      return null;
    }
    const inventoryRef = admin.firestore().collection("inventory").doc(itemId);
    try {
      await inventoryRef.update(
        {stock: admin.firestore.FieldValue.increment(quantity)}
      );
      functions.logger.log(`Inventory for ${itemId} updated by ${quantity}.`);
      return null;
    } catch (error) {
      functions.logger.error(
        `Error updating inventory for ${itemId}:`, error
      );
      return null;
    }
  });

// --- 4. Sales Order Processing Trigger ---
export const processSalesOrder = functions
  .region("asia-east1")
  .firestore.document("salesOrders/{orderId}")
  .onCreate(async (
    snap: functions.firestore.QueryDocumentSnapshot,
    context: functions.EventContext
  ) => {
    const {items} = snap.data();
    if (!items || !Array.isArray(items) || items.length === 0) {
      functions.logger.error(
        "Invalid sales order, \"items\" is invalid:", snap.data()
      );
      return null;
    }
    const db = admin.firestore();
    const batch = db.batch();
    for (const item of items) {
      const {itemId, quantity} = item;
      if (
        typeof itemId === "string" &&
        typeof quantity === "number" &&
        quantity > 0
      ) {
        const inventoryRef = db.collection("inventory").doc(itemId);
        batch.update(
          inventoryRef, {stock: admin.firestore.FieldValue.increment(-quantity)}
        );
      } else {
        const orderId = context.params.orderId;
        functions.logger.warn(
          `Invalid item in sales order ${orderId}:`, item
        );
      }
    }
    try {
      await batch.commit();
      const orderId = context.params.orderId;
      functions.logger.log(
        `Inventory updated for sales order ${orderId}.`
      );
      return null;
    } catch (error) {
      const orderId = context.params.orderId;
      functions.logger.error(
        `Error processing sales order ${orderId}:`, error
      );
      return null;
    }
  });

// --- 5. Auditing Trigger for Inventory ---
export const auditInventoryUpdate = functions
  .region("asia-east1")
  .firestore.document("inventory/{itemId}")
  .onUpdate(async (
    change: functions.Change<functions.firestore.DocumentSnapshot>,
    context: functions.EventContext
  ) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before && after && before.stock !== after.stock) {
      const {itemId} = context.params;
      const log = {
        type: "INVENTORY_UPDATE",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        itemId: itemId,
        change: {from: before.stock, to: after.stock},
      };
      try {
        await admin.firestore().collection("auditLogs").add(log);
      } catch (error) {
        // eslint-disable-next-line max-len
        functions.logger.error(
          `Failed to write inventory audit log for item ${itemId}:`, error
        );
      }
    }
    return null;
  });

// --- 6. Payroll Calculation Function ---
export const calculatePayroll = functions
  .region("asia-east1")
  .https.onCall(async (
    data: any, context: functions.https.CallableContext
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated", "User must be authenticated."
      );
    }
    const caller = await admin.auth().getUser(context.auth.uid);
    const callerRole = caller.customClaims?.role;
    if (!["Manager", "Admin", "Owner"].includes(callerRole)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only Managers, Admins, or Owners can run payroll."
      );
    }

    const {startDate, endDate} = data;
    if (!startDate || !endDate ||
      typeof startDate !== "string" || typeof endDate !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A \"startDate\" and \"endDate\" (ISO string) are required."
      );
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new functions.https.HttpsError(
        "invalid-argument", "Invalid date format."
      );
    }

    const db = admin.firestore();
    try {
      const logsSnapshot = await db.collection("productionLogs")
        .where("timestamp", ">=", start)
        .where("timestamp", "<=", end)
        .get();

      if (logsSnapshot.empty) {
        return {message: "No production logs found for the selected period."};
      }

      const payroll: { [employeeId: string]: number } = {};
      logsSnapshot.forEach((doc) => {
        const log = doc.data();
        const {employeeId, quantity, pieceRate} = log;
        if (
          employeeId &&
          typeof quantity === "number" &&
          typeof pieceRate === "number"
        ) {
          if (!payroll[employeeId]) {
            payroll[employeeId] = 0;
          }
          payroll[employeeId] += quantity * pieceRate;
        }
      });

      const payrollRun = {
        runDate: admin.firestore.FieldValue.serverTimestamp(),
        period: {start: startDate, end: endDate},
        status: "completed",
        results: payroll,
        runBy: context.auth.uid,
      };
      const runRef = await db.collection("payrollRuns").add(payrollRun);

      return {success: true, payrollRunId: runRef.id, results: payroll};
    } catch (error) {
      functions.logger.error("Error calculating payroll:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An internal error occurred while calculating payroll.",
        error
      );
    }
  });

// --- 7. Payment Gateway Function (Stripe) ---
export const createStripePaymentIntent = functions
  .region("asia-east1")
  .https.onCall(async (
    data: any, context: functions.https.CallableContext
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to make a payment."
      );
    }
    if (!stripe) {
      throw new functions.https.HttpsError(
        "internal", "Stripe integration is not configured."
      );
    }

    const {amount, currency} = data;
    if (
      typeof amount !== "number" || amount <= 0 ||
      typeof currency !== "string"
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A positive amount (number) and currency (string) are required."
      );
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      let message = "An unknown error occurred.";
      if (error instanceof Error) {
        message = error.message;
      }
      functions.logger.error("Error creating Stripe Payment Intent:", error);
      throw new functions.https.HttpsError(
        "internal", "Failed to create Payment Intent.", message
      );
    }
  });

