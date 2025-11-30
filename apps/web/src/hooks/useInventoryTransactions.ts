import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  doc,
  Timestamp,
  getDocs,
  increment as firestoreIncrement,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { InventoryTransaction, InventoryItem } from '../types/index';

/**
 * Custom hook to manage inventory transactions with atomic updates
 */
export const useInventoryTransactions = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { factoryId, user } = useAuth();

  // Real-time listener for transactions
  useEffect(() => {
    if (!factoryId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'inventoryTransactions'),
      where('factoryId', '==', factoryId)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const transData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as InventoryTransaction));
        
        // Sort by date descending (newest first)
        transData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setTransactions(transData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching inventory transactions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [factoryId]);

  /**
   * Add a transaction and atomically update inventory stock
   * Uses Firestore batch write for atomicity
   */
  const addTransaction = async (
    transactionData: Omit<InventoryTransaction, 'id' | 'timestamp'>
  ): Promise<void> => {
    if (!factoryId || !user?.email) {
      throw new Error('Missing factory or user information');
    }

    // Validate inputs
    if (!transactionData.itemId || !transactionData.itemName || transactionData.quantity <= 0) {
      throw new Error('Please fill in all required fields with valid values.');
    }

    if (!transactionData.reason) {
      throw new Error('Please provide a reason for this transaction.');
    }

    // Validate OUT transactions - ensure sufficient stock
    if (transactionData.type === 'OUT') {
      try {
        const itemRef = doc(db, 'inventory', transactionData.itemId);
        const itemSnap = await getDocs(query(collection(db, 'inventory'), where('factoryId', '==', factoryId)));
        
        const item = itemSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as InventoryItem))
          .find(i => i.id === transactionData.itemId);

        if (!item) {
          throw new Error('Inventory item not found');
        }

        if (item.currentStock < transactionData.quantity) {
          throw new Error(
            `Insufficient stock. Available: ${item.currentStock} ${item.unit}, Requested: ${transactionData.quantity}`
          );
        }
      } catch (err: any) {
        throw new Error(err.message || 'Failed to validate stock');
      }
    }

    try {
      const batch = writeBatch(db);

      // Step 1: Create transaction document
      const transactionRef = doc(collection(db, 'inventoryTransactions'));
      const newTransaction: InventoryTransaction = {
        ...transactionData,
        factoryId,
        performedBy: user.email,
        timestamp: Timestamp.now(),
      };

      batch.set(transactionRef, newTransaction);

      // Step 2: Update inventory item stock
      const itemRef = doc(db, 'inventory', transactionData.itemId);
      const stockChange = transactionData.type === 'IN' 
        ? transactionData.quantity 
        : -transactionData.quantity;

      const updateData: any = {
        lastUpdated: Timestamp.now(),
        currentStock: firestoreIncrement(stockChange),
      };

      // For IN transactions, also update costPerUnit (Last Purchase Price)
      if (transactionData.type === 'IN' && transactionData.costPerUnit) {
        updateData.costPerUnit = transactionData.costPerUnit;
      }

      batch.update(itemRef, updateData);

      // Commit batch
      await batch.commit();

      console.log('Transaction added successfully:', transactionRef.id);
    } catch (err: any) {
      console.error('Error adding transaction:', err);
      throw new Error(err.message || 'Failed to add transaction');
    }
  };

  return {
    transactions,
    loading,
    error,
    addTransaction,
  };
};
