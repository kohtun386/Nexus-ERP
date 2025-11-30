import { useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Payroll, PayrollItem, WorkerLog, Worker } from '../types/index';

/**
 * Custom hook to manage payroll calculations and processing
 */
export const usePayroll = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { factoryId } = useAuth();

  /**
   * Generate payroll preview for a date range
   * Logic:
   * 1. Query workerLogs between dates
   * 2. Group logs by workerId
   * 3. Sum up earnings for each worker
   * 4. Fetch workers to get their baseSalary
   * 5. Calculate Net Pay
   * 6. Return the preview data (don't save to DB yet)
   */
  const generatePayroll = async (
    startDate: string, // YYYY-MM-DD
    endDate: string    // YYYY-MM-DD
  ): Promise<PayrollItem[]> => {
    if (!factoryId) {
      throw new Error('User has no Factory ID');
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Query worker logs for the date range
      const logsQuery = query(
        collection(db, 'workerLogs'),
        where('factoryId', '==', factoryId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        where('status', '==', 'Approved') // Only approved logs count
      );

      const logsSnapshot = await getDocs(logsQuery);
      const logs = logsSnapshot.docs.map(doc => doc.data() as WorkerLog);

      // 2. Group logs by workerId
      const logsByWorker: Record<string, WorkerLog[]> = {};
      logs.forEach(log => {
        if (!logsByWorker[log.workerId]) {
          logsByWorker[log.workerId] = [];
        }
        logsByWorker[log.workerId].push(log);
      });

      // 3. Fetch all workers in the factory
      const workersQuery = query(
        collection(db, 'workers'),
        where('factoryId', '==', factoryId)
      );
      const workersSnapshot = await getDocs(workersQuery);
      const workers = workersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker));
      const workerMap = new Map(workers.map(w => [w.id!, w]));

      // 4. Calculate payroll items
      const payrollItems: PayrollItem[] = [];

      Object.entries(logsByWorker).forEach(([workerId, workerLogs]) => {
        const worker = workerMap.get(workerId);
        if (!worker) return;

        // Sum production earnings
        const productionEarnings = workerLogs.reduce((sum, log) => sum + log.totalPay, 0);
        const totalProductionQty = workerLogs.reduce((sum, log) => sum + log.quantity, 0);

        // Calculate deductions (2% SSB if applicable)
        const baseSalary = worker.baseSalary || 0;
        const bonus = 0; // Set to 0 for now, can be configured later
        const deductions = worker.isSSB ? productionEarnings * 0.02 : 0;

        // Net pay = production earnings + base salary + bonus - deductions
        const netPay = productionEarnings + baseSalary + bonus - deductions;

        payrollItems.push({
          workerId: worker.id!,
          workerName: worker.name,
          totalProductionQty,
          productionEarnings,
          baseSalary,
          bonus,
          deductions,
          netPay,
        });
      });

      setLoading(false);
      return payrollItems;
    } catch (err: any) {
      console.error('Error generating payroll:', err);
      setError(err.message || 'Failed to generate payroll');
      setLoading(false);
      throw new Error(err.message || 'Failed to generate payroll');
    }
  };

  /**
   * Save payroll to Firestore
   * Creates a Payroll document and PayrollItem documents
   */
  const savePayroll = async (
    startDate: string,
    endDate: string,
    payrollItems: PayrollItem[]
  ): Promise<string> => {
    if (!factoryId) {
      throw new Error('User has no Factory ID');
    }

    setLoading(true);
    setError(null);

    try {
      const batch = writeBatch(db);

      // Calculate total amount
      const totalAmount = payrollItems.reduce((sum, item) => sum + item.netPay, 0);

      // 1. Create Payroll document
      const payrollRef = await addDoc(collection(db, 'payrolls'), {
        factoryId,
        periodStart: startDate,
        periodEnd: endDate,
        totalAmount,
        status: 'Finalized',
        createdAt: Timestamp.now(),
      } as Payroll);

      // 2. Create PayrollItem documents
      payrollItems.forEach(item => {
        const itemRef = collection(db, 'payrollItems');
        batch.set(itemRef as any, {
          payrollId: payrollRef.id,
          ...item,
        } as PayrollItem);
      });

      await batch.commit();

      setLoading(false);
      console.log('Payroll saved with ID:', payrollRef.id);
      return payrollRef.id;
    } catch (err: any) {
      console.error('Error saving payroll:', err);
      setError(err.message || 'Failed to save payroll');
      setLoading(false);
      throw new Error(err.message || 'Failed to save payroll');
    }
  };

  return {
    loading,
    error,
    generatePayroll,
    savePayroll,
  };
};
