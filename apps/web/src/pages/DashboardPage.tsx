import React from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useAnalytics, useTodayStats } from "../hooks/useAnalytics";
import { 
  Users, Package, DollarSign, HardHat, Calculator, Settings, LogOut, 
  TrendingUp, Zap, ShoppingCart, BarChart3, Activity 
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { monthlyProduction, workerPerformance, salesVsCost, summary, loading: analyticsLoading } = useAnalytics();
  const { todayProduction, todayWages, todayLogs, loading: todayLoading } = useTodayStats();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // Stats cards with real data
  const stats = [
    {
      label: "Today's Production",
      value: todayLoading ? "..." : todayProduction.toLocaleString(),
      unit: "units",
      icon: Package,
      color: "bg-green-100",
      iconColor: "text-green-600",
      link: "/logs",
      change: "+5.2%",
    },
    {
      label: "Today's Wages",
      value: todayLoading ? "..." : todayWages.toLocaleString(),
      unit: "MMK",
      icon: DollarSign,
      color: "bg-blue-100",
      iconColor: "text-blue-600",
      link: "/payroll",
      change: "+3.1%",
    },
    {
      label: "Monthly Sales",
      value: analyticsLoading ? "..." : summary.totalSales.toLocaleString(),
      unit: "MMK",
      icon: ShoppingCart,
      color: "bg-purple-100",
      iconColor: "text-purple-600",
      link: "/sales",
      change: "+12.5%",
    },
    {
      label: "Active Workers",
      value: analyticsLoading ? "..." : summary.activeWorkers.toString(),
      unit: "this month",
      icon: Users,
      color: "bg-orange-100",
      iconColor: "text-orange-600",
      link: "/workers",
      change: "0%",
    },
  ];

  // Quick action cards
  const quickActions = [
    {
      title: "Manage Workers",
      description: "Add, update, or view your workforce",
      link: "/workers",
      icon: HardHat,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Production Rates",
      description: "Configure task prices and payment rates",
      link: "/rates",
      icon: Zap,
      color: "from-yellow-500 to-yellow-600",
    },
    {
      title: "Run Payroll",
      description: "Calculate and finalize employee payments",
      link: "/payroll",
      icon: Calculator,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Sales & POS",
      description: "Manage customers and create invoices",
      link: "/sales",
      icon: ShoppingCart,
      color: "from-purple-500 to-purple-600",
    },
  ];

  // Pie chart colors
  const COLORS = ['#22c55e', '#ef4444', '#3b82f6'];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Nexus ERP</h1>
              <p className="text-gray-600 text-sm mt-1">Factory Owner Dashboard</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="text-left sm:text-right">
                <p className="text-gray-900 font-medium text-sm sm:text-base">{user?.email}</p>
                <p className="text-gray-500 text-xs sm:text-sm">Owner</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition font-medium text-sm"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <Link
                key={idx}
                to={stat.link}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition p-5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                    <div className="mt-2">
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-gray-500 text-xs">{stat.unit}</p>
                    </div>
                  </div>
                  <div className={`${stat.color} p-2.5 rounded-lg`}>
                    <IconComponent className={`${stat.iconColor}`} size={20} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-green-600 text-xs">
                  <TrendingUp size={14} />
                  <span>{stat.change} from last period</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Production Trend Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Activity size={20} className="text-blue-600" />
                  Production Trend
                </h3>
                <p className="text-gray-500 text-sm">Daily output this month</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{summary.totalProduction.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Units</p>
              </div>
            </div>
            
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Loading chart data...
              </div>
            ) : monthlyProduction.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No production data this month
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyProduction} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(value) => value.split(' ')[1]} // Show only day number
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="quantity" 
                      name="Units"
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Workers Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={20} className="text-green-600" />
                  Top Performers
                </h3>
                <p className="text-gray-500 text-sm">Highest producing workers</p>
              </div>
              <Link to="/workers" className="text-blue-600 text-sm hover:underline">
                View all →
              </Link>
            </div>
            
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Loading chart data...
              </div>
            ) : workerPerformance.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No worker data available
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workerPerformance} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="totalQty" 
                      name="Units"
                      fill="#22c55e" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Second Row: Pie Chart + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue vs Cost Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <DollarSign size={20} className="text-purple-600" />
                Revenue vs Cost
              </h3>
              <p className="text-gray-500 text-sm">This month's financial overview</p>
            </div>
            
            {analyticsLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500">
                Loading...
              </div>
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={salesVsCost}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {salesVsCost.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => value.toLocaleString() + ' MMK'} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                  {salesVsCost.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Profit: <span className={`font-bold ${summary.totalSales - summary.totalWages >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(summary.totalSales - summary.totalWages).toLocaleString()} MMK
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, idx) => {
                const IconComponent = action.icon;
                return (
                  <Link
                    key={idx}
                    to={action.link}
                    className="group relative overflow-hidden rounded-lg shadow-sm hover:shadow-lg transition"
                  >
                    <div className={`bg-gradient-to-br ${action.color} p-5 text-white flex items-center gap-4`}>
                      <div className="bg-white bg-opacity-20 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold">{action.title}</h3>
                        <p className="text-white text-opacity-90 text-sm">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Monthly Summary Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white mb-8">
          <h3 className="text-lg font-bold mb-4">Monthly Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-blue-200 text-sm">Total Production</p>
              <p className="text-2xl font-bold">{summary.totalProduction.toLocaleString()}</p>
              <p className="text-blue-200 text-xs">units</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Total Wages</p>
              <p className="text-2xl font-bold">{summary.totalWages.toLocaleString()}</p>
              <p className="text-blue-200 text-xs">MMK</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Total Sales</p>
              <p className="text-2xl font-bold">{summary.totalSales.toLocaleString()}</p>
              <p className="text-blue-200 text-xs">MMK</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Avg Daily Output</p>
              <p className="text-2xl font-bold">{summary.avgDailyProduction.toLocaleString()}</p>
              <p className="text-blue-200 text-xs">units/day</p>
            </div>
          </div>
        </div>

        {/* Footer tip */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs sm:text-sm text-blue-900">
            <span className="font-semibold">💡 Tip:</span> Use the Quick Actions above to manage workers, run payroll, and adjust factory settings. Charts update in real-time as you add production logs.
          </p>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
