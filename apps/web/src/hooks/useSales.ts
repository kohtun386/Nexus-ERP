import { useState, useEffect } from 'react';
import { Customer, Invoice, InvoiceItem } from '../types/index';
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
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook to manage Customers
 */
export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { factoryId } = useAuth();

  useEffect(() => {
    if (!factoryId) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'customers'),
      where('factoryId', '==', factoryId),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Customer));
        setCustomers(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching customers:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [factoryId]);

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'factoryId' | 'totalCredit' | 'createdAt'>) => {
    if (!factoryId) throw new Error('User has no Factory ID');

    if (!customerData.name || !customerData.phone) {
      throw new Error('Please provide customer name and phone.');
    }

    try {
      const newCustomer: Customer = {
        ...customerData,
        factoryId,
        totalCredit: 0,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'customers'), newCustomer);
      console.log('Customer added:', docRef.id);
      return docRef.id;
    } catch (err: any) {
      console.error('Error adding customer:', err);
      throw new Error(err.message || 'Failed to add customer');
    }
  };

  const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    try {
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, updates);
      console.log('Customer updated:', customerId);
    } catch (err: any) {
      console.error('Error updating customer:', err);
      throw new Error(err.message || 'Failed to update customer');
    }
  };

  const deleteCustomer = async (customerId: string) => {
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      console.log('Customer deleted:', customerId);
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      throw new Error(err.message || 'Failed to delete customer');
    }
  };

  const getCustomersWithCredit = () => {
    return customers.filter(c => c.totalCredit > 0);
  };

  const getTotalCredit = () => {
    return customers.reduce((sum, c) => sum + c.totalCredit, 0);
  };

  return {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomersWithCredit,
    getTotalCredit,
  };
};

/**
 * Custom hook to manage Invoices
 */
export const useInvoices = (dateFilter?: string) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { factoryId, user } = useAuth();

  useEffect(() => {
    if (!factoryId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    let q;
    if (dateFilter) {
      q = query(
        collection(db, 'invoices'),
        where('factoryId', '==', factoryId),
        where('date', '==', dateFilter),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'invoices'),
        where('factoryId', '==', factoryId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Invoice));
        setInvoices(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching invoices:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [factoryId, dateFilter]);

  /**
   * Create a new invoice and update customer credit if partial/unpaid
   */
  const createInvoice = async (invoiceData: {
    customerId: string;
    customerName: string;
    items: InvoiceItem[];
    totalAmount: number;
    paidAmount: number;
    paymentMethod: 'Cash' | 'Kpay' | 'Wave';
    date: string;
  }) => {
    if (!factoryId) throw new Error('User has no Factory ID');

    // Validate
    if (!invoiceData.customerId || invoiceData.items.length === 0) {
      throw new Error('Please select a customer and add at least one item.');
    }

    if (invoiceData.totalAmount <= 0) {
      throw new Error('Total amount must be greater than 0.');
    }

    if (invoiceData.paidAmount < 0) {
      throw new Error('Paid amount cannot be negative.');
    }

    try {
      // Determine invoice status
      let status: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
      if (invoiceData.paidAmount >= invoiceData.totalAmount) {
        status = 'Paid';
      } else if (invoiceData.paidAmount > 0) {
        status = 'Partial';
      }

      const creditAmount = invoiceData.totalAmount - invoiceData.paidAmount;

      // Use batch write for atomicity
      const batch = writeBatch(db);

      // 1. Create the invoice
      const invoiceRef = doc(collection(db, 'invoices'));
      const newInvoice: Invoice = {
        factoryId,
        customerId: invoiceData.customerId,
        customerName: invoiceData.customerName,
        items: invoiceData.items,
        totalAmount: invoiceData.totalAmount,
        paidAmount: invoiceData.paidAmount,
        paymentMethod: invoiceData.paymentMethod,
        status,
        date: invoiceData.date,
        createdAt: Timestamp.now(),
      };
      batch.set(invoiceRef, newInvoice);

      // 2. If there's credit (unpaid amount), update customer's totalCredit
      if (creditAmount > 0) {
        const customerRef = doc(db, 'customers', invoiceData.customerId);
        // We need to increment, but Firestore batch doesn't support increment directly
        // We'll fetch and update - for production, use Cloud Functions or transactions
        // For now, we'll use a simple approach
        const currentCustomer = await import('firebase/firestore').then(m => 
          m.getDoc(customerRef)
        );
        
        if (currentCustomer.exists()) {
          const currentCredit = currentCustomer.data().totalCredit || 0;
          batch.update(customerRef, {
            totalCredit: currentCredit + creditAmount,
          });
        }
      }

      await batch.commit();
      console.log('Invoice created:', invoiceRef.id);
      
      return { 
        id: invoiceRef.id, 
        status,
        creditAmount: creditAmount > 0 ? creditAmount : 0,
      };
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      throw new Error(err.message || 'Failed to create invoice');
    }
  };

  /**
   * Record a payment against an existing invoice
   */
  const recordPayment = async (invoiceId: string, paymentAmount: number) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const remainingBalance = invoice.totalAmount - invoice.paidAmount;
    if (paymentAmount > remainingBalance) {
      throw new Error('Payment amount exceeds remaining balance');
    }

    try {
      const batch = writeBatch(db);

      // Update invoice
      const newPaidAmount = invoice.paidAmount + paymentAmount;
      const newStatus = newPaidAmount >= invoice.totalAmount ? 'Paid' : 'Partial';
      
      const invoiceRef = doc(db, 'invoices', invoiceId);
      batch.update(invoiceRef, {
        paidAmount: newPaidAmount,
        status: newStatus,
      });

      // Update customer credit
      const customerRef = doc(db, 'customers', invoice.customerId);
      const currentCustomer = await import('firebase/firestore').then(m => 
        m.getDoc(customerRef)
      );
      
      if (currentCustomer.exists()) {
        const currentCredit = currentCustomer.data().totalCredit || 0;
        batch.update(customerRef, {
          totalCredit: Math.max(0, currentCredit - paymentAmount),
        });
      }

      await batch.commit();
      console.log('Payment recorded for invoice:', invoiceId);
    } catch (err: any) {
      console.error('Error recording payment:', err);
      throw new Error(err.message || 'Failed to record payment');
    }
  };

  // Calculate stats
  const calculateStats = () => {
    const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalCredit = invoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);
    const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
    const unpaidCount = invoices.filter(inv => inv.status === 'Unpaid').length;
    const partialCount = invoices.filter(inv => inv.status === 'Partial').length;

    return {
      totalSales,
      totalCollected,
      totalCredit,
      paidCount,
      unpaidCount,
      partialCount,
      invoiceCount: invoices.length,
    };
  };

  return {
    invoices,
    loading,
    error,
    createInvoice,
    recordPayment,
    calculateStats,
  };
};
