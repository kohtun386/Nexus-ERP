import { useState, useEffect } from 'react';
import { Rate, WorkerLog } from '../types/index';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * A custom hook to manage data logging.
 * It fetches available rates and provides a function to add new worker logs.
 *
 * @returns An object containing rates, loading state, and an addLog function.
 */
export const useDataLogs = () => {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { factoryId } = useAuth();

  useEffect(() => {
    if (!factoryId) {
        setLoading(false);
        return;
    };

    setLoading(true);
    const q = query(collection(db, 'rates'), where('factoryId', '==', factoryId));
    
    const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
            const ratesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rate));
            setRates(ratesData);
            setLoading(false);
        },
        (error) => {
            console.error("Error fetching rates:", error);
            setLoading(false);
        }
    );

    return () => unsubscribe();

  }, [factoryId]);

  const addLog = async (logData: { workerId: string, rateId: string, quantity: number }) => {
    if (!factoryId) throw new Error("User has no factory assigned.");

    const newLog = { 
        ...logData, 
        factoryId,
        approved: false, // Logs start as unapproved
        date: serverTimestamp(),
    };
    await addDoc(collection(db, 'workerLogs'), newLog);
  };

  return { rates, loading, addLog };
};
