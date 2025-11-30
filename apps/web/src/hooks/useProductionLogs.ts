import { useState, useEffect } from 'react';
import { WorkerLog, MaterialRequirement, InventoryTransaction } from '../types/index';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook to manage production logs (worker activity tracking).
 * Provides real-time filtering by date and factory.
 * Now includes automatic inventory deduction based on Bill of Materials (BOM).
 *
 * @param selectedDate - YYYY-MM-DD format (e.g., "2025-01-15")
 * @returns An object containing logs, loading state, and log management functions.
 */
export const useProductionLogs = (selectedDate: string) => {
  const [logs, setLogs] = useState<WorkerLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { factoryId, user } = useAuth();

  // Real-time listener for logs filtered by date and factory
  useEffect(() => {
    if (!factoryId || !selectedDate) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'workerLogs'),
      where('factoryId', '==', factoryId),
      where('date', '==', selectedDate),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const logsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as WorkerLog));
        setLogs(logsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching logs:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [factoryId, selectedDate]);

  /**
   * Add a new production log with automatic calculation and inventory deduction
   * 
   * IMPORTANT: This snapshots the taskName and pricePerUnit so that if rates change,
   * historical logs remain accurate.
   * 
   * NEW: If the Rate has requiredMaterials (BOM), this will:
   * 1. Calculate total material consumption = logQty * quantityPerUnit
   * 2. Check stock availability (warn if insufficient, but still allow)
   * 3. Create inventory transactions (OUT) for each material
   * 4. Decrement currentStock in inventory collection
   */
  const addLog = async (logData: {
    workerId: string;
    workerName: string;
    rateId: string;
    taskName: string;
    pricePerUnit: number;
    quantity: number;
    defectQty: number;
    shift?: 'Day' | 'Night';
    requiredMaterials?: MaterialRequirement[]; // BOM from the selected Rate
  }) => {
    // Safety check: Ensure user has a factoryId
    if (!factoryId) {
      throw new Error("User has no Factory ID");
    }

    // Debug logging for troubleshooting permissions
    console.log("Current User Factory ID:", factoryId);
    console.log("Data being sent:", { ...logData, factoryId });

    // Validate inputs
    if (!logData.workerId || !logData.rateId || logData.quantity <= 0 || logData.pricePerUnit <= 0) {
      throw new Error("Please fill in all required fields with valid values.");
    }

    if (logData.defectQty < 0) {
      throw new Error("Defect quantity cannot be negative.");
    }

    if (logData.defectQty > logData.quantity) {
      throw new Error("Defect quantity cannot exceed total quantity.");
    }

    try {
      // Calculate total pay: (quantity - defect) * pricePerUnit
      const netQty = logData.quantity - logData.defectQty;
      const totalPay = netQty * logData.pricePerUnit;

      // === INVENTORY DEDUCTION LOGIC (BOM) ===
      const stockWarnings: string[] = [];
      const materialDeductions: Array<{
        itemId: string;
        itemName: string;
        deductQty: number;
        currentStock: number;
        newStock: number;
      }> = [];

      // If BOM materials are defined, check stock and prepare deductions
      if (logData.requiredMaterials && logData.requiredMaterials.length > 0) {
        for (const material of logData.requiredMaterials) {
          const deductQty = logData.quantity * material.quantityPerUnit;
          
          // Fetch current inventory item to check stock
          const itemRef = doc(db, 'inventory', material.inventoryItemId);
          const itemSnap = await getDoc(itemRef);
          
          if (!itemSnap.exists()) {
            console.warn(`Inventory item ${material.inventoryItemId} not found. Skipping deduction.`);
            continue;
          }
          
          const itemData = itemSnap.data();
          const currentStock = itemData.currentStock || 0;
          const newStock = currentStock - deductQty;
          
          // Check if stock will go negative
          if (newStock < 0) {
            stockWarnings.push(
              `${material.inventoryItemName}: Need ${deductQty.toFixed(2)}, only ${currentStock.toFixed(2)} available`
            );
          }
          
          materialDeductions.push({
            itemId: material.inventoryItemId,
            itemName: material.inventoryItemName,
            deductQty,
            currentStock,
            newStock,
          });
        }
      }

      // Log warnings but don't block (as per requirement: allow but warn)
      if (stockWarnings.length > 0) {
        console.warn("⚠️ Low Stock Warning:", stockWarnings);
        // You could also set this in state or return it to show in UI
      }

      // === BATCH WRITE: Log + Transactions + Stock Updates ===
      const batch = writeBatch(db);

      // 1. Create the worker log
      const newLog: WorkerLog = {
        factoryId,
        workerId: logData.workerId,
        workerName: logData.workerName,
        rateId: logData.rateId,
        taskName: logData.taskName,
        pricePerUnit: logData.pricePerUnit,
        quantity: logData.quantity,
        defectQty: logData.defectQty,
        totalPay,
        date: selectedDate,
        timestamp: Timestamp.now(),
        status: 'Pending',
        shift: logData.shift || 'Day',
        createdAt: new Date().toISOString(),
      };

      const logRef = doc(collection(db, 'workerLogs'));
      batch.set(logRef, newLog);

      // 2. Create inventory transactions and update stock for each material
      for (const deduction of materialDeductions) {
        // Create OUT transaction
        const transaction: InventoryTransaction = {
          factoryId,
          itemId: deduction.itemId,
          itemName: deduction.itemName,
          type: 'OUT',
          quantity: deduction.deductQty,
          reason: `Production: ${logData.taskName} (${logData.quantity} units)`,
          date: selectedDate,
          performedBy: user?.email || 'system',
          timestamp: Timestamp.now(),
        };

        const txnRef = doc(collection(db, 'inventoryTransactions'));
        batch.set(txnRef, transaction);

        // Update inventory currentStock
        const itemRef = doc(db, 'inventory', deduction.itemId);
        batch.update(itemRef, {
          currentStock: deduction.newStock,
          lastUpdated: Timestamp.now(),
        });
      }

      // 3. Commit the batch
      await batch.commit();
      
      console.log("Production log added with ID:", logRef.id);
      if (materialDeductions.length > 0) {
        console.log(`✓ ${materialDeductions.length} material(s) deducted from inventory`);
      }

      return { 
        id: logRef.id, 
        totalPay,
        stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined,
        materialsDeducted: materialDeductions.length,
      };
    } catch (err: any) {
      console.error("Error adding log:", err);
      throw new Error(err.message || "Failed to add production log");
    }
  };

  /**
   * Update an existing log
   * Note: This does NOT adjust inventory. For corrections, consider creating
   * manual adjustment transactions in the inventory module.
   */
  const updateLog = async (logId: string, updates: Partial<WorkerLog>) => {
    // If quantity or defect changed, recalculate totalPay
    if (updates.quantity !== undefined || updates.defectQty !== undefined) {
      const existingLog = logs.find(l => l.id === logId);
      if (existingLog) {
        const qty = updates.quantity ?? existingLog.quantity;
        const defect = updates.defectQty ?? existingLog.defectQty;
        updates.totalPay = (qty - defect) * existingLog.pricePerUnit;
      }
    }

    try {
      const logRef = doc(db, 'workerLogs', logId);
      await updateDoc(logRef, updates);
      console.log("Log updated:", logId);
    } catch (err: any) {
      console.error("Error updating log:", err);
      throw new Error(err.message || "Failed to update log");
    }
  };

  /**
   * Delete a log (hard delete)
   * Note: This does NOT restore inventory. Inventory transactions are immutable
   * for audit purposes. Manual adjustments should be made if needed.
   */
  const deleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'workerLogs', logId));
      console.log("Log deleted:", logId);
    } catch (err: any) {
      console.error("Error deleting log:", err);
      throw new Error(err.message || "Failed to delete log");
    }
  };

  /**
   * Approve a log (change status to Approved)
   */
  const approveLog = async (logId: string) => {
    await updateLog(logId, { status: 'Approved' });
  };

  /**
   * Calculate stats for selected date
   */
  const calculateStats = () => {
    const totalOutput = logs.reduce((sum, log) => sum + log.quantity, 0);
    const totalWages = logs.reduce((sum, log) => sum + log.totalPay, 0);
    const totalDefects = logs.reduce((sum, log) => sum + log.defectQty, 0);
    const totalApproved = logs.filter(l => l.status === 'Approved').length;

    return {
      totalOutput,
      totalWages,
      totalDefects,
      totalApproved,
      logCount: logs.length,
    };
  };

  return {
    logs,
    loading,
    error,
    addLog,
    updateLog,
    deleteLog,
    approveLog,
    calculateStats,
  };
};
