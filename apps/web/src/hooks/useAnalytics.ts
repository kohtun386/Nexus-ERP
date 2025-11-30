import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface DailyProduction {
  date: string;        // "Nov 1", "Nov 2", etc.
  fullDate: string;    // "2025-11-01" for sorting
  quantity: number;
  wages: number;
}

interface WorkerPerformance {
  name: string;
  totalQty: number;
  totalWages: number;
}

interface SalesVsCost {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsData {
  monthlyProduction: DailyProduction[];
  workerPerformance: WorkerPerformance[];
  salesVsCost: SalesVsCost[];
  summary: {
    totalProduction: number;
    totalWages: number;
    totalSales: number;
    activeWorkers: number;
    avgDailyProduction: number;
  };
}

/**
 * Custom hook for real-time analytics data
 */
export const useAnalytics = () => {
  const [data, setData] = useState<AnalyticsData>({
    monthlyProduction: [],
    workerPerformance: [],
    salesVsCost: [],
    summary: {
      totalProduction: 0,
      totalWages: 0,
      totalSales: 0,
      activeWorkers: 0,
      avgDailyProduction: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { factoryId } = useAuth();

  useEffect(() => {
    if (!factoryId) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Get current month date range
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = lastDay.toISOString().split('T')[0];

        // Fetch worker logs for this month
        const logsQuery = query(
          collection(db, 'workerLogs'),
          where('factoryId', '==', factoryId),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        
        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch invoices for this month (for sales data)
        const invoicesQuery = query(
          collection(db, 'invoices'),
          where('factoryId', '==', factoryId),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        
        const invoicesSnapshot = await getDocs(invoicesQuery);
        const invoices = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // === 1. Monthly Production Stats (aggregate by date) ===
        const dailyMap = new Map<string, { quantity: number; wages: number }>();
        
        logs.forEach((log: any) => {
          const date = log.date;
          const existing = dailyMap.get(date) || { quantity: 0, wages: 0 };
          dailyMap.set(date, {
            quantity: existing.quantity + (log.quantity || 0),
            wages: existing.wages + (log.totalPay || 0),
          });
        });

        // Convert to array and format dates
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyProduction: DailyProduction[] = [];
        
        // Generate all days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayData = dailyMap.get(dateStr) || { quantity: 0, wages: 0 };
          
          monthlyProduction.push({
            date: `${monthNames[month]} ${day}`,
            fullDate: dateStr,
            quantity: dayData.quantity,
            wages: dayData.wages,
          });
        }

        // Only keep days up to today (don't show future days with 0)
        const today = now.toISOString().split('T')[0];
        const filteredProduction = monthlyProduction.filter(d => d.fullDate <= today);

        // === 2. Worker Performance (Top 5) ===
        const workerMap = new Map<string, { totalQty: number; totalWages: number }>();
        
        logs.forEach((log: any) => {
          const name = log.workerName || 'Unknown';
          const existing = workerMap.get(name) || { totalQty: 0, totalWages: 0 };
          workerMap.set(name, {
            totalQty: existing.totalQty + (log.quantity || 0),
            totalWages: existing.totalWages + (log.totalPay || 0),
          });
        });

        const workerPerformance: WorkerPerformance[] = Array.from(workerMap.entries())
          .map(([name, data]) => ({
            name,
            totalQty: data.totalQty,
            totalWages: data.totalWages,
          }))
          .sort((a, b) => b.totalQty - a.totalQty)
          .slice(0, 5);

        // === 3. Sales vs Payroll Cost ===
        const totalSales = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0);
        const totalWages = logs.reduce((sum: number, log: any) => sum + (log.totalPay || 0), 0);

        const salesVsCost: SalesVsCost[] = [
          { name: 'Sales Revenue', value: totalSales, color: '#22c55e' },
          { name: 'Payroll Cost', value: totalWages, color: '#ef4444' },
        ];

        // === 4. Summary Stats ===
        const totalProduction = logs.reduce((sum: number, log: any) => sum + (log.quantity || 0), 0);
        const uniqueWorkers = new Set(logs.map((log: any) => log.workerId)).size;
        const daysWithData = dailyMap.size || 1;
        const avgDailyProduction = Math.round(totalProduction / daysWithData);

        setData({
          monthlyProduction: filteredProduction,
          workerPerformance,
          salesVsCost,
          summary: {
            totalProduction,
            totalWages,
            totalSales,
            activeWorkers: uniqueWorkers,
            avgDailyProduction,
          },
        });

        setError(null);
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [factoryId]);

  return {
    ...data,
    loading,
    error,
    refresh: () => {
      // Trigger re-fetch by updating a dependency
      // For now, just re-run the effect
    },
  };
};

/**
 * Get today's quick stats
 */
export const useTodayStats = () => {
  const [stats, setStats] = useState({
    todayProduction: 0,
    todayWages: 0,
    todayLogs: 0,
  });
  const [loading, setLoading] = useState(true);
  const { factoryId } = useAuth();

  useEffect(() => {
    if (!factoryId) {
      setLoading(false);
      return;
    }

    const fetchTodayStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const logsQuery = query(
          collection(db, 'workerLogs'),
          where('factoryId', '==', factoryId),
          where('date', '==', today)
        );
        
        const snapshot = await getDocs(logsQuery);
        const logs = snapshot.docs.map(doc => doc.data());

        setStats({
          todayProduction: logs.reduce((sum, log: any) => sum + (log.quantity || 0), 0),
          todayWages: logs.reduce((sum, log: any) => sum + (log.totalPay || 0), 0),
          todayLogs: logs.length,
        });
      } catch (err) {
        console.error('Error fetching today stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayStats();
  }, [factoryId]);

  return { ...stats, loading };
};
