import { useState, useEffect } from 'react';
import { Rate } from '../types/index';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook to manage production rates/tasks.
 * Provides CRUD operations for rates within a factory.
 *
 * @returns An object containing rates, loading state, and rate management functions.
 */
export const useRates = () => {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { factoryId } = useAuth();

  // Real-time listener for rates
  useEffect(() => {
    if (!factoryId) {
      setRates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'rates'), where('factoryId', '==', factoryId));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const ratesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Rate));
        setRates(ratesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching rates:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [factoryId]);

  /**
   * Add a new production rate
   */
  const addRate = async (rateData: Omit<Rate, 'id' | 'createdAt' | 'factoryId'>) => {
    if (!factoryId) {
      throw new Error("User has no factory assigned.");
    }

    // Validate price
    if (rateData.pricePerUnit <= 0) {
      throw new Error("Price must be greater than 0");
    }

    try {
      const newRate: Rate = {
        ...rateData,
        factoryId,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'rates'), newRate);
      console.log("Rate added with ID:", docRef.id);
      return docRef.id;
    } catch (err: any) {
      console.error("Error adding rate:", err);
      throw new Error(err.message || "Failed to add rate");
    }
  };

  /**
   * Update an existing rate
   */
  const updateRate = async (rateId: string, updates: Partial<Rate>) => {
    if (!factoryId) {
      throw new Error("User has no factory assigned.");
    }

    // Validate price if being updated
    if (updates.pricePerUnit !== undefined && updates.pricePerUnit <= 0) {
      throw new Error("Price must be greater than 0");
    }

    try {
      const rateRef = doc(db, 'rates', rateId);
      await updateDoc(rateRef, updates);
      console.log("Rate updated:", rateId);
    } catch (err: any) {
      console.error("Error updating rate:", err);
      throw new Error(err.message || "Failed to update rate");
    }
  };

  /**
   * Archive a rate (soft delete by setting status to 'Archived')
   */
  const archiveRate = async (rateId: string) => {
    try {
      await updateRate(rateId, { status: 'Archived' });
      console.log("Rate archived:", rateId);
    } catch (err: any) {
      console.error("Error archiving rate:", err);
      throw new Error(err.message || "Failed to archive rate");
    }
  };

  /**
   * Restore an archived rate
   */
  const restoreRate = async (rateId: string) => {
    try {
      await updateRate(rateId, { status: 'Active' });
      console.log("Rate restored:", rateId);
    } catch (err: any) {
      console.error("Error restoring rate:", err);
      throw new Error(err.message || "Failed to restore rate");
    }
  };

  return {
    rates,
    loading,
    error,
    addRate,
    updateRate,
    archiveRate,
    restoreRate,
  };
};
