import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { InventoryItem } from '../types/index';

/**
 * Custom hook to manage inventory items with real-time updates
 */
export const useInventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { factoryId } = useAuth();

  // Real-time listener for inventory items
  useEffect(() => {
    if (!factoryId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'inventory'),
      where('factoryId', '==', factoryId)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const itemsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as InventoryItem));
        setItems(itemsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching inventory:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [factoryId]);

  /**
   * Add a new inventory item
   */
  const addItem = async (itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    if (!factoryId) {
      throw new Error('User has no Factory ID');
    }

    if (!itemData.name || !itemData.category || itemData.currentStock < 0 || !itemData.unit) {
      throw new Error('Please fill in all required fields with valid values.');
    }

    try {
      await addDoc(collection(db, 'inventory'), {
        ...itemData,
        factoryId,
        lastUpdated: Timestamp.now(),
      } as InventoryItem);
      console.log('Inventory item added successfully');
    } catch (err: any) {
      console.error('Error adding inventory item:', err);
      throw new Error(err.message || 'Failed to add inventory item');
    }
  };

  /**
   * Update an existing inventory item
   */
  const updateItem = async (itemId: string, updates: Partial<InventoryItem>) => {
    try {
      const itemRef = doc(db, 'inventory', itemId);
      await updateDoc(itemRef, {
        ...updates,
        lastUpdated: Timestamp.now(),
      });
      console.log('Inventory item updated:', itemId);
    } catch (err: any) {
      console.error('Error updating inventory item:', err);
      throw new Error(err.message || 'Failed to update inventory item');
    }
  };

  /**
   * Delete an inventory item
   */
  const deleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
      console.log('Inventory item deleted:', itemId);
    } catch (err: any) {
      console.error('Error deleting inventory item:', err);
      throw new Error(err.message || 'Failed to delete inventory item');
    }
  };

  /**
   * Calculate low stock items
   */
  const getLowStockItems = () => {
    return items.filter(item => item.currentStock < item.minStockLevel);
  };

  /**
   * Calculate total inventory value
   */
  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);
  };

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    getLowStockItems,
    getTotalValue,
  };
};
