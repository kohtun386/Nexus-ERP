
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import { InventoryItem, Customer, Order, WorkerLog, View, Task, OrderItem, AuthView, FactoryProfile, Deduction, PayrollRun, AuditLog, PayrollEntry, DeductionType, SettingsTab, PayrollCycle, Currency, User, SubscriptionPlan } from './types';
import { INITIAL_INVENTORY, INITIAL_CUSTOMERS, INITIAL_LOGS, MASTER_TASKS, INITIAL_ORDERS, MOCK_FACTORY_ID, INITIAL_DEDUCTIONS, INITIAL_PAYROLL_RUNS, INITIAL_USERS } from './constants';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Plus, Search, Bot, DollarSign, Factory, Activity, ShoppingCart, Settings, FileText, Download, Trash2, Calendar, X, Banknote, Info, User as UserIcon, Shield, Save, Mail, Wifi, WifiOff, Loader2, FileSpreadsheet, Menu, CreditCard, Send, Check, Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { analyzeBusinessData } from './services/geminiService';

// Utility for ID generation
const generateId = (prefix: string) => `${prefix}-${Date.now().toString().slice(-6)}`;

// --- Toast Component ---
type ToastType = 'success' | 'error' | 'info';
interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

const Toast: React.FC<{ toast: ToastMessage | null, onClose: () => void }> = ({ toast, onClose }) => {
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast, onClose]);

    if (!toast) return null;

    const bgColors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-white" />,
        error: <AlertTriangle className="w-5 h-5 text-white" />,
        info: <Info className="w-5 h-5 text-white" />
    };

    return (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl text-white transform transition-all duration-300 animate-in slide-in-from-bottom-4 ${bgColors[toast.type]}`}>
            {icons[toast.type]}
            <span className="font-medium">{toast.message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// --- Export Modal Component ---
interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'Payroll' | 'Logs' | 'Summary';
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, type }) => {
    const [status, setStatus] = useState<'generating' | 'ready'>('generating');

    useEffect(() => {
        if (isOpen) {
            setStatus('generating');
            const timer = setTimeout(() => setStatus('ready'), 1500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        {status === 'generating' ? (
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        ) : (
                            <FileText className="w-8 h-8 text-green-600" />
                        )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                        {status === 'generating' ? `Generating ${type} Report...` : 'Report Ready'}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                        {status === 'generating' 
                            ? "Please wait while we compile the data." 
                            : "Your report has been generated successfully."}
                    </p>
                    
                    {status === 'ready' && (
                        <div className="flex flex-col gap-3">
                            <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2">
                                <Download className="w-4 h-4" /> Download PDF
                            </button>
                            <button onClick={onClose} className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2">
                                <FileSpreadsheet className="w-4 h-4" /> Download Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export default function App() {
  // ---------------- State Management ----------------
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [factoryProfile, setFactoryProfile] = useState<FactoryProfile | null>(null);

  // App Data State
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [workerLogs, setWorkerLogs] = useState<WorkerLog[]>(INITIAL_LOGS);
  
  // Payroll State
  const [deductions, setDeductions] = useState<Deduction[]>(INITIAL_DEDUCTIONS);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(INITIAL_PAYROLL_RUNS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Settings State
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // UI & System State
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'Payroll' | 'Logs' | 'Summary'>('Summary');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ---------------- Effects ----------------
  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        showToast("Connection Restored. Syncing data...", 'success');
    };
    const handleOffline = () => {
        setIsOnline(false);
        showToast("You are offline. Changes saved locally.", 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (message: string, type: ToastType) => {
    setToast({ id: Date.now(), message, type });
  };

  const triggerExport = (type: 'Payroll' | 'Logs' | 'Summary') => {
    setExportType(type);
    setShowExportModal(true);
  };


  // ---------------- Auth Handlers ----------------
  const handleLogin = (email: string) => {
    // Mock profile fetch with subscription
    setFactoryProfile({
      name: "Nexus Manufacturing",
      email: email,
      address: "Yangon, Myanmar",
      phone: "09123456789",
      payrollCycle: "Weekly",
      currency: "MMK",
      subscription: {
          plan: 'Trial',
          status: 'Active',
          startDate: '2023-10-01',
          endDate: '2023-11-01', // Mock Date
          amount: 0
      }
    });
    setIsAuthenticated(true);
    addAuditLog("Login", `User ${email} logged in.`);
    showToast("Welcome back!", 'success');
  };

  const handleSignup = (email: string, name: string) => {
    setFactoryProfile({
        name,
        email,
        address: '',
        phone: '',
        payrollCycle: 'Weekly',
        currency: 'MMK',
        subscription: { // Placeholder to prevent crashes before Setup
            plan: 'Trial',
            status: 'Active',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            amount: 0
        }
    });
    setAuthView('setup');
  };

  const handleSetupComplete = (profile: FactoryProfile) => {
    setFactoryProfile(profile);
    setIsAuthenticated(true);
    addAuditLog("Setup Complete", "Factory profile created.");
    showToast("Factory profile set up successfully!", 'success');
  };

  const handleUpdateProfile = (updatedProfile: FactoryProfile) => {
    setFactoryProfile(updatedProfile);
    addAuditLog("Update Profile", "Factory settings updated.");
    showToast("Settings saved successfully.", 'success');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setFactoryProfile(null);
    setAuthView('login');
    showToast("Logged out successfully.", 'success');
    addAuditLog("Logout", "User logged out.");
  };

  const addAuditLog = (action: string, details: string) => {
    const log: AuditLog = {
      id: generateId('AUDIT'),
      timestamp: new Date().toISOString(),
      action,
      user: factoryProfile?.email || 'System',
      details
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  // ---------------- Derived Logic ----------------

  // 1. Inventory Calculations
  const lowStockItems = useMemo(() => 
    inventory.filter(item => item.currentStock <= item.reorderLevel), 
  [inventory]);

  // 2. Financials
  const totalRevenue = useMemo(() => 
    orders.reduce((sum, order) => sum + order.totalAmount, 0), 
  [orders]);

  // ---------------- Action Handlers ----------------

  const handleAddProductionLog = (workerName: string, taskId: string, qty: number) => {
    const task = MASTER_TASKS.find(t => t.id === taskId);
    if (!task) return;

    const newLog: WorkerLog = {
      id: generateId('LOG'),
      date: new Date().toISOString().split('T')[0],
      workerName,
      taskId,
      quantityCompleted: qty,
      totalPay: qty * task.pricePerUnit,
      status: 'pending'
    };

    setWorkerLogs([...workerLogs, newLog]);

    if (task.outputInventoryId) {
      setInventory(prev => prev.map(item => {
        if (item.itemId === task.outputInventoryId) {
          return { ...item, currentStock: item.currentStock + qty };
        }
        return item;
      }));
    }
    showToast(`Production log added for ${workerName}`, 'success');
  };

  const handleCreateOrder = (customerId: string, items: OrderItem[]) => {
    const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    
    const newOrder: Order = {
      factoryId: MOCK_FACTORY_ID,
      id: generateId('ORD'),
      customerId,
      items,
      totalAmount,
      status: 'pending',
      date: new Date().toISOString()
    };

    setOrders([newOrder, ...orders]);

    setInventory(prev => prev.map(invItem => {
      const orderItem = items.find(i => i.itemId === invItem.itemId);
      if (orderItem) {
        return { ...invItem, currentStock: invItem.currentStock - orderItem.qty };
      }
      return invItem;
    }));

    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          totalPurchases: c.totalPurchases + totalAmount,
          lastOrderDate: new Date().toISOString()
        };
      }
      return c;
    }));
    showToast("Sales Order Created Successfully!", 'success');
  };

  const fetchInsights = async () => {
    if (!isOnline) {
        showToast("AI Insights require an internet connection.", 'error');
        return;
    }
    setLoadingAi(true);
    const result = await analyzeBusinessData(inventory, orders, workerLogs);
    setAiInsight(result);
    setLoadingAi(false);
  };

  // ---------------- Views ----------------

  const DashboardView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">${totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Production Logs</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{workerLogs.length}</h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Low Stock Alerts</p>
              <h3 className={`text-2xl font-bold mt-1 ${lowStockItems.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {lowStockItems.length}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${lowStockItems.length > 0 ? 'text-red-600' : 'text-slate-500'}`} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-xl shadow-md text-white relative overflow-hidden">
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-2">
               <Bot className="w-5 h-5" />
               <p className="text-sm font-medium opacity-90">AI Insights</p>
             </div>
             {aiInsight ? (
               <div className="text-xs leading-relaxed opacity-90 whitespace-pre-line">
                 {aiInsight}
               </div>
             ) : (
               <button 
                onClick={fetchInsights} 
                disabled={loadingAi}
                className="text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm py-2 px-4 rounded-lg transition w-full text-left flex items-center justify-center gap-2"
               >
                 {loadingAi ? 'Analyzing...' : 'Generate Business Intelligence'}
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-800">Inventory Levels</h3>
             <button onClick={() => triggerExport('Summary')} className="text-xs text-blue-600 font-medium hover:underline">Export Report</button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="currentStock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">Recent Production Output</h3>
           <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={workerLogs.slice(-10)}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="workerName" tick={{fontSize: 10}} />
                 <YAxis />
                 <Tooltip />
                 <Line type="monotone" dataKey="quantityCompleted" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const InventoryView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Inventory Management</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
            <tr>
                <th className="px-6 py-4 whitespace-nowrap">Item ID</th>
                <th className="px-6 py-4 whitespace-nowrap">Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Type</th>
                <th className="px-6 py-4 whitespace-nowrap">Stock</th>
                <th className="px-6 py-4 whitespace-nowrap">Unit</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {inventory.map((item) => {
                const isLow = item.currentStock <= item.reorderLevel;
                return (
                <tr key={item.itemId} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono text-slate-500">{item.itemId}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.type === 'raw_material' ? 'bg-gray-100 text-gray-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {item.type.replace('_', ' ')}
                    </span>
                    </td>
                    <td className="px-6 py-4 font-bold">{item.currentStock}</td>
                    <td className="px-6 py-4 text-slate-500">{item.unit}</td>
                    <td className="px-6 py-4">
                    {isLow ? (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold">
                        <TrendingDown className="w-4 h-4" /> Reorder
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                        <CheckCircle className="w-4 h-4" /> Healthy
                        </span>
                    )}
                    </td>
                </tr>
                );
            })}
            </tbody>
        </table>
      </div>
    </div>
  );

  const ProductionView = () => {
    const [worker, setWorker] = useState('');
    const [task, setTask] = useState('');
    const [qty, setQty] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (worker && task && qty > 0) {
        handleAddProductionLog(worker, task, qty);
        setWorker('');
        setTask('');
        setQty(0);
      } else {
          showToast("Please fill in all fields correctly.", 'error');
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
        {/* Entry Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Factory className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Daily Production Entry</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Worker Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={worker}
                  onChange={(e) => setWorker(e.target.value)}
                  placeholder="e.g., Mg Ba"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task (Master Data)</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  required
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                >
                  <option value="">Select Task</option>
                  {MASTER_TASKS.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.taskName} {t.outputInventoryId ? `(-> ${t.outputInventoryId})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Selecting a task linked to inventory will auto-increment stock.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Completed</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={qty || ''}
                  onChange={(e) => setQty(parseInt(e.target.value))}
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition shadow-lg shadow-indigo-500/30">
                Submit Log
              </button>
            </form>
          </div>
        </div>

        {/* Logs List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Recent Worker Logs</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                    <tr>
                        <th className="px-6 py-3 whitespace-nowrap">Date</th>
                        <th className="px-6 py-3 whitespace-nowrap">Worker</th>
                        <th className="px-6 py-3 whitespace-nowrap">Task</th>
                        <th className="px-6 py-3 whitespace-nowrap">Output</th>
                        <th className="px-6 py-3 whitespace-nowrap">Pay (MMK)</th>
                        <th className="px-6 py-3 whitespace-nowrap">Status</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {[...workerLogs].reverse().map((log) => {
                        const taskDetails = MASTER_TASKS.find(t => t.id === log.taskId);
                        return (
                        <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-500">{log.date}</td>
                            <td className="px-6 py-3 font-medium">{log.workerName}</td>
                            <td className="px-6 py-3 text-slate-600">{taskDetails?.taskName}</td>
                            <td className="px-6 py-3">
                            <span className="font-bold text-indigo-600">+{log.quantityCompleted}</span>
                            {taskDetails?.outputInventoryId && (
                                <span className="text-xs text-slate-400 ml-1">({taskDetails.outputInventoryId})</span>
                            )}
                            </td>
                            <td className="px-6 py-3 font-mono">{log.totalPay.toLocaleString()}</td>
                            <td className="px-6 py-3">
                                {log.status === 'paid' ? (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Paid</span>
                                ) : (
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">Pending</span>
                                )}
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PayrollView = () => {
    // ... (existing payroll logic unchanged)
    const [activeTab, setActiveTab] = useState<'calculate' | 'history' | 'deductions'>('calculate');
    const [startDate, setStartDate] = useState('2023-10-01');
    const [endDate, setEndDate] = useState('2023-10-31');
    const [cycle, setCycle] = useState(factoryProfile?.payrollCycle || 'Weekly');
    const [calculatedPayroll, setCalculatedPayroll] = useState<PayrollEntry[]>([]);
    const [selectedWorkerLedger, setSelectedWorkerLedger] = useState<PayrollEntry | null>(null);

    // Deduction State
    const [newDeduction, setNewDeduction] = useState<{worker: string, amount: number, type: DeductionType, reason: string}>({
        worker: '', amount: 0, type: 'advance', reason: ''
    });

    // Unique worker names for dropdowns
    const uniqueWorkers = Array.from(new Set(workerLogs.map(l => l.workerName)));

    const handleCalculate = () => {
        const relevantLogs = workerLogs.filter(log => {
            return log.status === 'pending' && log.date >= startDate && log.date <= endDate;
        });

        const relevantDeductions = deductions.filter(d => {
             return d.date >= startDate && d.date <= endDate; 
        });

        const workerMap = new Map<string, PayrollEntry>();

        relevantLogs.forEach(log => {
            if (!workerMap.has(log.workerName)) {
                workerMap.set(log.workerName, {
                    workerName: log.workerName,
                    grossPay: 0,
                    deductions: 0,
                    netPay: 0,
                    logCount: 0,
                    details: { logs: [], deductionsList: [] }
                });
            }
            const entry = workerMap.get(log.workerName)!;
            entry.grossPay += log.totalPay;
            entry.logCount += 1;
            entry.details.logs.push(log);
        });

        relevantDeductions.forEach(ded => {
            if (workerMap.has(ded.workerName)) {
                const entry = workerMap.get(ded.workerName)!;
                entry.deductions += ded.amount;
                entry.details.deductionsList.push(ded);
            }
        });

        const results: PayrollEntry[] = [];
        workerMap.forEach(entry => {
            entry.netPay = entry.grossPay - entry.deductions;
            results.push(entry);
        });

        setCalculatedPayroll(results);
        addAuditLog("Calculate Payroll", `Calculated payroll from ${startDate} to ${endDate}. Found ${results.length} workers.`);
        showToast(`Calculated payroll for ${results.length} workers.`, 'success');
    };

    const handleFinalize = () => {
        if (calculatedPayroll.length === 0) return;

        const runId = generateId("RUN");
        const newRun: PayrollRun = {
            id: runId,
            startDate,
            endDate,
            totalGross: calculatedPayroll.reduce((acc, curr) => acc + curr.grossPay, 0),
            totalDeductions: calculatedPayroll.reduce((acc, curr) => acc + curr.deductions, 0),
            totalNet: calculatedPayroll.reduce((acc, curr) => acc + curr.netPay, 0),
            workerCount: calculatedPayroll.length,
            status: 'finalized',
            finalizedDate: new Date().toISOString(),
            entries: calculatedPayroll
        };

        setPayrollRuns([newRun, ...payrollRuns]);

        const logIdsToUpdate = new Set<string>();
        calculatedPayroll.forEach(entry => {
            entry.details.logs.forEach(log => logIdsToUpdate.add(log.id));
        });

        setWorkerLogs(prev => prev.map(log => {
            if (logIdsToUpdate.has(log.id)) {
                return { ...log, status: 'paid', payrollRunId: runId };
            }
            return log;
        }));

        setCalculatedPayroll([]);
        addAuditLog("Finalize Payroll", `Finalized payroll run ${runId}. Total Net: ${newRun.totalNet}`);
        showToast("Payroll Finalized Successfully!", 'success');
    };

    const handleAddDeduction = () => {
        if (!newDeduction.worker || newDeduction.amount <= 0) return;
        const d: Deduction = {
            id: generateId("DED"),
            workerName: newDeduction.worker,
            amount: newDeduction.amount,
            type: newDeduction.type,
            reason: newDeduction.reason,
            date: new Date().toISOString().split('T')[0],
            isRecurring: false
        };
        setDeductions([...deductions, d]);
        setNewDeduction({ ...newDeduction, amount: 0, reason: '' });
        addAuditLog("Add Deduction", `Added ${d.type} of ${d.amount} for ${d.workerName}`);
        showToast("Deduction record added.", 'info');
    };

    const CalculateTab = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
            {/* Controls */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cycle</label>
                        <select 
                            className="p-2 border border-slate-300 rounded-lg min-w-[150px]"
                            value={cycle}
                            onChange={(e) => setCycle(e.target.value as any)}
                        >
                            <option value="Weekly">Weekly</option>
                            <option value="Bi-Weekly">Bi-Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Custom">Custom</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                        <input 
                            type="date" 
                            className="p-2 border border-slate-300 rounded-lg"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                        <input 
                            type="date" 
                            className="p-2 border border-slate-300 rounded-lg"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handleCalculate}
                        className="bg-[#1E3A8A] text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 transition shadow-lg shadow-blue-900/20"
                    >
                        Calculate Payroll
                    </button>
                </div>
            </div>

            {/* Summary & Table */}
            {calculatedPayroll.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <p className="text-sm text-slate-500">Total Gross</p>
                            <p className="text-2xl font-bold text-slate-800">{calculatedPayroll.reduce((a, b) => a + b.grossPay, 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <p className="text-sm text-slate-500">Total Deductions</p>
                            <p className="text-2xl font-bold text-red-600">{calculatedPayroll.reduce((a, b) => a + b.deductions, 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm bg-blue-50 border-blue-100">
                            <p className="text-sm text-blue-600 font-medium">Net Payable</p>
                            <p className="text-2xl font-bold text-blue-900">{calculatedPayroll.reduce((a, b) => a + b.netPay, 0).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                             <h3 className="font-bold text-slate-800">Payroll Preview</h3>
                             <button 
                                onClick={handleFinalize}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                             >
                                <CheckCircle className="w-4 h-4" /> Finalize & Pay
                             </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3 whitespace-nowrap">Worker</th>
                                        <th className="px-6 py-3 whitespace-nowrap">Logs</th>
                                        <th className="px-6 py-3 text-right whitespace-nowrap">Gross Pay</th>
                                        <th className="px-6 py-3 text-right whitespace-nowrap">Deductions</th>
                                        <th className="px-6 py-3 text-right whitespace-nowrap">Net Pay</th>
                                        <th className="px-6 py-3 text-center whitespace-nowrap">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {calculatedPayroll.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedWorkerLedger(entry)}>
                                            <td className="px-6 py-3 font-medium text-slate-900">{entry.workerName}</td>
                                            <td className="px-6 py-3 text-slate-500">{entry.logCount} tasks</td>
                                            <td className="px-6 py-3 text-right font-mono text-green-600">{entry.grossPay.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right font-mono text-red-500">({entry.deductions.toLocaleString()})</td>
                                            <td className="px-6 py-3 text-right font-mono font-bold text-slate-900 border-l-2 border-slate-100">{entry.netPay.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-center">
                                                <button className="text-blue-600 hover:underline text-xs">View Ledger</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    const HistoryTab = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
             <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-6 py-3 whitespace-nowrap">Run ID</th>
                                <th className="px-6 py-3 whitespace-nowrap">Period</th>
                                <th className="px-6 py-3 whitespace-nowrap">Workers</th>
                                <th className="px-6 py-3 text-right whitespace-nowrap">Total Net Paid</th>
                                <th className="px-6 py-3 whitespace-nowrap">Finalized On</th>
                                <th className="px-6 py-3 whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payrollRuns.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No finalized payrolls yet.</td></tr>
                            )}
                            {payrollRuns.map(run => (
                                <tr key={run.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{run.id}</td>
                                    <td className="px-6 py-3 font-medium text-slate-700">{run.startDate} - {run.endDate}</td>
                                    <td className="px-6 py-3">{run.workerCount}</td>
                                    <td className="px-6 py-3 text-right font-bold text-[#1E3A8A]">{run.totalNet.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-slate-500">{new Date(run.finalizedDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-3 flex gap-2">
                                        <button onClick={() => triggerExport('Payroll')} className="p-1 hover:bg-slate-100 rounded" title="Export PDF">
                                            <FileText className="w-4 h-4 text-slate-600" />
                                        </button>
                                        <button onClick={() => triggerExport('Payroll')} className="p-1 hover:bg-slate-100 rounded" title="Download CSV">
                                            <Download className="w-4 h-4 text-slate-600" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const DeductionsTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2">
            {/* Add Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
                <h3 className="font-bold text-slate-800 mb-4">Add Deduction / Advance</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Worker</label>
                        <select 
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            value={newDeduction.worker}
                            onChange={(e) => setNewDeduction({...newDeduction, worker: e.target.value})}
                        >
                            <option value="">Select Worker</option>
                            {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                        <select 
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            value={newDeduction.type}
                            onChange={(e) => setNewDeduction({...newDeduction, type: e.target.value as DeductionType})}
                        >
                            <option value="advance">Advance Payment</option>
                            <option value="loan">Loan Repayment</option>
                            <option value="penalty">Penalty</option>
                            <option value="tax">Tax</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                        <input 
                            type="number" 
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            placeholder="0.00"
                            value={newDeduction.amount || ''}
                            onChange={(e) => setNewDeduction({...newDeduction, amount: parseInt(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason / Note</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            placeholder="Optional note"
                            value={newDeduction.reason}
                            onChange={(e) => setNewDeduction({...newDeduction, reason: e.target.value})}
                        />
                    </div>
                    <button 
                        onClick={handleAddDeduction}
                        disabled={!newDeduction.worker || !newDeduction.amount}
                        className="w-full bg-red-600 disabled:bg-slate-300 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition"
                    >
                        Add Entry
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Active Deductions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-6 py-3 whitespace-nowrap">Date</th>
                                <th className="px-6 py-3 whitespace-nowrap">Worker</th>
                                <th className="px-6 py-3 whitespace-nowrap">Type</th>
                                <th className="px-6 py-3 whitespace-nowrap">Amount</th>
                                <th className="px-6 py-3 whitespace-nowrap">Reason</th>
                                <th className="px-6 py-3 text-center whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {deductions.map(d => (
                                <tr key={d.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 text-slate-500">{d.date}</td>
                                    <td className="px-6 py-3 font-medium">{d.workerName}</td>
                                    <td className="px-6 py-3 capitalize text-slate-600">{d.type}</td>
                                    <td className="px-6 py-3 font-bold text-red-600">{d.amount.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">{d.reason}</td>
                                    <td className="px-6 py-3 text-center">
                                        <button className="text-slate-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header Tabs */}
            <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('calculate')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'calculate' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Calculate Payroll
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'history' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Finalized History
                </button>
                <button 
                    onClick={() => setActiveTab('deductions')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'deductions' ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Deductions & Advances
                </button>
            </div>

            {activeTab === 'calculate' && <CalculateTab />}
            {activeTab === 'history' && <HistoryTab />}
            {activeTab === 'deductions' && <DeductionsTab />}

            {/* Ledger Modal */}
            {selectedWorkerLedger && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{selectedWorkerLedger.workerName}</h3>
                                <p className="text-xs text-slate-500">Payroll Ledger Details</p>
                            </div>
                            <button onClick={() => setSelectedWorkerLedger(null)} className="p-2 hover:bg-slate-200 rounded-full">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[60vh]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 whitespace-nowrap">Date</th>
                                        <th className="px-6 py-3 whitespace-nowrap">Description</th>
                                        <th className="px-6 py-3 text-right whitespace-nowrap">Credit (+)</th>
                                        <th className="px-6 py-3 text-right whitespace-nowrap">Debit (-)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* Credits (Logs) */}
                                    {selectedWorkerLedger.details.logs.map(log => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-3 text-slate-500">{log.date}</td>
                                            <td className="px-6 py-3 text-slate-700">Production: {log.quantityCompleted} units</td>
                                            <td className="px-6 py-3 text-right font-mono text-green-600">{log.totalPay.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right font-mono text-slate-300">-</td>
                                        </tr>
                                    ))}
                                    {/* Debits (Deductions) */}
                                    {selectedWorkerLedger.details.deductionsList.map(ded => (
                                        <tr key={ded.id} className="bg-red-50/50">
                                            <td className="px-6 py-3 text-slate-500">{ded.date}</td>
                                            <td className="px-6 py-3 text-slate-700 capitalize">{ded.type}: {ded.reason}</td>
                                            <td className="px-6 py-3 text-right font-mono text-slate-300">-</td>
                                            <td className="px-6 py-3 text-right font-mono text-red-600">{ded.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 font-bold text-slate-800">
                                    <tr>
                                        <td colSpan={2} className="px-6 py-3 text-right">Total</td>
                                        <td className="px-6 py-3 text-right text-green-600">{selectedWorkerLedger.grossPay.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right text-red-600">{selectedWorkerLedger.deductions.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3} className="px-6 py-3 text-right text-lg">Net Payable</td>
                                        <td className="px-6 py-3 text-right text-lg text-[#1E3A8A] border-t-2 border-slate-300">{selectedWorkerLedger.netPay.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="p-4 bg-slate-50 text-right">
                             <button onClick={() => setSelectedWorkerLedger(null)} className="text-sm text-slate-500 hover:text-slate-800 font-medium">Close Ledger</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const SettingsView = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    // Local state for editing
    const [editProfile, setEditProfile] = useState<FactoryProfile>(factoryProfile || {
        name: '', email: '', address: '', phone: '', payrollCycle: 'Weekly', currency: 'MMK', 
        subscription: { plan: 'Trial', status: 'Active', startDate: '', endDate: '', amount: 0 }
    });
    
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [transactionId, setTransactionId] = useState('');

    const handleSaveProfile = () => {
        handleUpdateProfile(editProfile);
    };

    // Subscription Logic
    const handleUpgrade = (plan: SubscriptionPlan) => {
        setSelectedPlan(plan);
        setShowPaymentModal(true);
    };

    const handleSubmitPayment = () => {
        if (!transactionId) {
            showToast("Please enter the Transaction ID from Telegram", "error");
            return;
        }
        // Simulating verification
        const updatedProfile = { ...editProfile };
        updatedProfile.subscription.status = 'Pending_Approval';
        updatedProfile.subscription.transactionId = transactionId;
        updatedProfile.subscription.plan = selectedPlan || 'Monthly';
        
        setEditProfile(updatedProfile);
        handleUpdateProfile(updatedProfile);
        
        setShowPaymentModal(false);
        setTransactionId('');
        showToast("Payment submitted for approval. Status: Pending", "success");
    };

    // Pricing Tiers
    const pricing = [
        { id: 'Monthly', name: 'Monthly Plan', price: '50,000 MMK', features: ['Full ERP Access', 'Up to 50 Workers', 'Priority Support'] },
        { id: 'Yearly', name: 'Yearly Plan', price: '500,000 MMK', features: ['Save 2 Months (17%)', 'Unlimited Workers', 'Dedicated Manager'] }
    ];

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Settings Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 h-fit">
                    <nav className="flex flex-col p-2 space-y-1">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Factory className="w-4 h-4" /> General Profile
                        </button>
                        <button 
                            onClick={() => setActiveTab('config')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'config' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Settings className="w-4 h-4" /> Configuration
                        </button>
                         <button 
                            onClick={() => setActiveTab('team')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'team' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <UserIcon className="w-4 h-4" /> Team & Roles
                        </button>
                        <button 
                            onClick={() => setActiveTab('billing')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'billing' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <CreditCard className="w-4 h-4" /> Billing & Subscription
                        </button>
                    </nav>
                </div>

                {/* Settings Content */}
                <div className="md:col-span-3">
                    {activeTab === 'profile' && (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-6">
                             <div className="border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-bold text-slate-900">Factory Profile</h2>
                                <p className="text-sm text-slate-500">Manage your organization's public details.</p>
                             </div>
                             
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Factory Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-slate-300 rounded-lg"
                                        value={editProfile.name}
                                        onChange={(e) => setEditProfile({...editProfile, name: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            disabled
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500"
                                            value={editProfile.email}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2 border border-slate-300 rounded-lg"
                                            value={editProfile.phone}
                                            onChange={(e) => setEditProfile({...editProfile, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                    <textarea 
                                        className="w-full p-2 border border-slate-300 rounded-lg h-24"
                                        value={editProfile.address}
                                        onChange={(e) => setEditProfile({...editProfile, address: e.target.value})}
                                    />
                                </div>
                             </div>

                             <div className="flex justify-end pt-4">
                                <button onClick={handleSaveProfile} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Save Changes
                                </button>
                             </div>
                        </div>
                    )}

                    {activeTab === 'config' && (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-6">
                             <div className="border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-bold text-slate-900">System Configuration</h2>
                                <p className="text-sm text-slate-500">Set global defaults for payroll and finance.</p>
                             </div>

                             <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <Banknote className="w-4 h-4 text-slate-500" /> Payroll Defaults
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Default Cycle</label>
                                            <select 
                                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                                value={editProfile.payrollCycle}
                                                onChange={(e) => setEditProfile({...editProfile, payrollCycle: e.target.value as PayrollCycle})}
                                            >
                                                <option value="Weekly">Weekly</option>
                                                <option value="Bi-Weekly">Bi-Weekly</option>
                                                <option value="Monthly">Monthly</option>
                                                <option value="Custom">Custom</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Currency</label>
                                            <select 
                                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                                value={editProfile.currency}
                                                onChange={(e) => setEditProfile({...editProfile, currency: e.target.value as Currency})}
                                            >
                                                <option value="MMK">MMK (Myanmar Kyat)</option>
                                                <option value="USD">USD (US Dollar)</option>
                                                <option value="THB">THB (Thai Baht)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                             </div>
                             
                             <div className="flex justify-end pt-4">
                                <button onClick={handleSaveProfile} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Update Config
                                </button>
                             </div>
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Team & Roles</h2>
                                    <p className="text-sm text-slate-500">Manage user access and permissions.</p>
                                </div>
                                <button className="bg-[#1E3A8A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-900 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Invite User
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 whitespace-nowrap">User</th>
                                            <th className="px-6 py-3 whitespace-nowrap">Email</th>
                                            <th className="px-6 py-3 whitespace-nowrap">Role</th>
                                            <th className="px-6 py-3 whitespace-nowrap">Status</th>
                                            <th className="px-6 py-3 text-right whitespace-nowrap">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                                                <td className="px-6 py-4 text-slate-500">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full w-fit
                                                        ${user.role === 'Owner' ? 'bg-purple-100 text-purple-700' : ''}
                                                        ${user.role === 'Admin' ? 'bg-blue-100 text-blue-700' : ''}
                                                        ${user.role === 'Supervisor' ? 'bg-orange-100 text-orange-700' : ''}
                                                    `}>
                                                        <Shield className="w-3 h-3" /> {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-slate-400 hover:text-blue-600 text-xs font-medium">Edit</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Billing & Subscription Tab */}
                    {activeTab === 'billing' && (
                        <div className="space-y-6">
                            {/* Current Status Card */}
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl shadow-lg p-8 text-white relative overflow-hidden">
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className="text-slate-300 text-sm font-medium uppercase tracking-wider mb-1">Current Plan</p>
                                        <h2 className="text-3xl font-bold mb-2">{editProfile.subscription.plan} Plan</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            {editProfile.subscription.status === 'Active' && <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30">Active</span>}
                                            {editProfile.subscription.status === 'Pending_Approval' && <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/30">Pending Approval</span>}
                                            {editProfile.subscription.status === 'Expired' && <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30">Expired</span>}
                                            <span className="text-slate-400 text-sm flex items-center gap-1">
                                                <Timer className="w-4 h-4"/> Expires: {new Date(editProfile.subscription.endDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-lg">
                                        <CreditCard className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pricing.map((plan) => (
                                    <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:border-blue-400 transition hover:shadow-md">
                                        <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                                        <div className="text-3xl font-bold text-[#1E3A8A] my-4">{plan.price}</div>
                                        <ul className="space-y-3 mb-6">
                                            {plan.features.map((feat, idx) => (
                                                <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                                                    <CheckCircle className="w-4 h-4 text-green-500" /> {feat}
                                                </li>
                                            ))}
                                        </ul>
                                        <button 
                                            onClick={() => handleUpgrade(plan.id as SubscriptionPlan)}
                                            className="w-full py-2 rounded-lg border-2 border-[#1E3A8A] text-[#1E3A8A] font-bold hover:bg-[#1E3A8A] hover:text-white transition"
                                        >
                                            Upgrade
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal (Telegram) */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-blue-600 p-6 text-white text-center">
                            <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Send className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold">Pay via Telegram</h3>
                            <p className="text-blue-100 text-sm">Complete payment for {selectedPlan} Plan</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
                                    <p className="font-bold text-slate-800 mb-2">Step 1:</p>
                                    <p>Open our Telegram Bot to make the payment using KPay or Wave Money.</p>
                                    <a 
                                        href="https://t.me/YourFactoryBot" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-3 block w-full bg-[#0088cc] hover:bg-[#0077b5] text-white text-center py-2 rounded-lg font-bold transition flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-4 h-4" /> Open Telegram Bot
                                    </a>
                                </div>
                                
                                <div>
                                    <p className="font-bold text-slate-800 mb-2 text-sm">Step 2:</p>
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Enter Transaction ID</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g., 1234567890"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">The bot will provide this ID after payment.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 py-3 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSubmitPayment}
                                    className="flex-1 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Confirm Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  // ... (Existing SalesView, CrmView logic)
  // Re-insert SalesView and CrmView here as they were...

  const SalesView = () => {
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [cart, setCart] = useState<OrderItem[]>([]);
    
    const finishedGoods = inventory.filter(i => i.type === 'finished_good');

    const addToCart = (item: InventoryItem) => {
      setCart(prev => {
        const existing = prev.find(i => i.itemId === item.itemId);
        if (existing) {
          if (existing.qty + 1 > item.currentStock) return prev; 
          return prev.map(i => i.itemId === item.itemId ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, { itemId: item.itemId, qty: 1, price: 1500, itemName: item.name }];
      });
      showToast(`Added ${item.name} to cart`, 'info');
    };

    const handleCheckout = () => {
      if (!selectedCustomer || cart.length === 0) return;
      handleCreateOrder(selectedCustomer, cart);
      setCart([]);
      setSelectedCustomer('');
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             {finishedGoods.map(item => (
               <div key={item.itemId} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-md transition cursor-pointer group" onClick={() => addToCart(item)}>
                 <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-blue-600">{item.name}</h3>
                      <p className="text-xs text-slate-500 mb-2">{item.itemId}</p>
                      <div className="text-sm font-medium text-slate-600">Stock: <span className={item.currentStock < 10 ? "text-red-500" : "text-green-600"}>{item.currentStock}</span> {item.unit}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-full group-hover:bg-blue-50">
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                    </div>
                 </div>
               </div>
             ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Current Order
              </h2>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer</label>
                 <select 
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white"
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                 >
                   <option value="">Select Customer</option>
                   {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div className="flex-1 overflow-y-auto border-t border-b border-dashed border-slate-200 py-4 space-y-3">
                  {cart.length === 0 && <p className="text-center text-slate-400 text-sm py-10">Cart is empty</p>}
                  {cart.map(item => (
                    <div key={item.itemId} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{item.itemName}</p>
                        <p className="text-xs text-slate-500">x{item.qty} @ {item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">${item.qty * item.price}</span>
                          <button onClick={() => setCart(prev => prev.filter(i => i.itemId !== item.itemId))} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
                      </div>
                    </div>
                  ))}
               </div>
               <div className="space-y-3">
                 <div className="flex justify-between items-center font-bold text-lg text-slate-900">
                   <span>Total</span>
                   <span>${cart.reduce((a, b) => a + (b.qty * b.price), 0).toLocaleString()}</span>
                 </div>
                 <button 
                  onClick={handleCheckout}
                  disabled={!selectedCustomer || cart.length === 0}
                  className="w-full bg-blue-600 disabled:bg-slate-300 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition shadow-lg shadow-blue-500/20"
                 >
                   Confirm Order
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CrmView = () => (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Customer Relations (CRM)</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                <th className="px-6 py-4 whitespace-nowrap">Customer Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Phone</th>
                <th className="px-6 py-4 whitespace-nowrap">Lifetime Value (LTV)</th>
                <th className="px-6 py-4 whitespace-nowrap">Last Order</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                    <td className="px-6 py-4 text-slate-600">{c.phone}</td>
                    <td className="px-6 py-4 font-mono text-green-600 font-bold">${c.totalPurchases.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(c.lastOrderDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Active</span>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
  );

  // ---------------- Auth & Main Render ----------------
  if (!isAuthenticated) {
    return (
        <Auth 
            currentView={authView} 
            setView={setAuthView} 
            onLogin={handleLogin}
            onSignup={handleSignup}
            onSetupComplete={handleSetupComplete}
        />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Global Components */}
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} type={exportType} />

      <main className="flex-1 lg:ml-64 ml-0 p-8 transition-all duration-300">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
                <Menu className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-slate-900 capitalize">{currentView.replace(/_/g, ' ')}</h1>
                <p className="text-slate-500 text-sm mt-1">
                {currentView === 'dashboard' && `Overview of ${factoryProfile?.name || 'factory'} performance.`}
                {currentView === 'inventory' && "Manage raw materials and finished goods."}
                {currentView === 'production' && "Log daily worker output."}
                {currentView === 'sales' && "Process sales orders."}
                {currentView === 'crm' && "Customer insights and history."}
                {currentView === 'payroll' && "Manage earnings, deductions, and payouts."}
                {currentView === 'settings' && "Manage factory profile, users, and configuration."}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Offline Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-800 text-white'}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>
          </div>
        </header>

        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'inventory' && <InventoryView />}
        {currentView === 'production' && <ProductionView />}
        {currentView === 'sales' && <SalesView />}
        {currentView === 'crm' && <CrmView />}
        {currentView === 'payroll' && <PayrollView />}
        {currentView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
