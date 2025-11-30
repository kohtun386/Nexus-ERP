import { useState, useEffect } from 'react';
import { Worker } from '../types/index';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * A custom hook to manage worker data in real-time from Firestore.
 * Provides CRUD operations for workers within a factory.
 *
 * @returns An object containing workers, loading state, and worker management functions.
 */
export const useWorkers = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { factoryId } = useAuth();

  // Real-time listener for workers
  useEffect(() => {
    if (!factoryId) {
      setWorkers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'workers'), where('factoryId', '==', factoryId));
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const workersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Worker));
        setWorkers(workersData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching workers:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [factoryId]);

  /**
   * Add a new worker to Firestore
   */
  const addWorker = async (workerData: Omit<Worker, 'id' | 'createdAt' | 'factoryId'>) => {
    if (!factoryId) {
      throw new Error("User has no factory assigned.");
    }

    try {
      const newWorker: Worker = {
        ...workerData,
        factoryId,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'workers'), newWorker);
      console.log("Worker added with ID:", docRef.id);
      return docRef.id;
    } catch (err: any) {
      console.error("Error adding worker:", err);
      throw new Error(err.message || "Failed to add worker");
    }
  };

  /**
   * Update an existing worker
   */
  const updateWorker = async (workerId: string, updates: Partial<Worker>) => {
    if (!factoryId) {
      throw new Error("User has no factory assigned.");
    }

    try {
      const workerRef = doc(db, 'workers', workerId);
      await updateDoc(workerRef, updates);
      console.log("Worker updated:", workerId);
    } catch (err: any) {
      console.error("Error updating worker:", err);
      throw new Error(err.message || "Failed to update worker");
    }
  };

  /**
   * Toggle worker status between Active and Inactive
   */
  const toggleWorkerStatus = async (workerId: string, currentStatus: 'Active' | 'Inactive') => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    await updateWorker(workerId, { status: newStatus });
  };

  return {
    workers,
    loading,
    error,
    addWorker,
    updateWorker,
    toggleWorkerStatus,
  };
};
