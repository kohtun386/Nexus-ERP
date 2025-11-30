import React, { JSX } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import DashboardPage from "./pages/DashboardPage";
import WorkersPage from "./pages/WorkersPage";
import RatesPage from "./pages/RatesPage";
import ProductionLogPage from "./pages/ProductionLogPage";
import PayrollPage from "./pages/PayrollPage";
import InventoryPage from "./pages/InventoryPage";
import InventoryTransactionsPage from "./pages/InventoryTransactionsPage";
import SalesPage from "./pages/SalesPage";
import DataLogPage from "./pages/DataLogPage";
import SettingsPage from "./pages/SettingsPage";

// Loading Component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-blue-900 text-lg font-semibold animate-pulse">Loading Nexus ERP...</div>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, requiredRole }: { children: JSX.Element, requiredRole?: "owner" | "supervisor" }) => {
  const { user, role, loading } = useAuth();

  // Show loading screen while authenticating
  if (loading) return <LoadingScreen />;
  
  // Not logged in - redirect to login
  if (!user) return <Navigate to="/login" replace />;
  
  // Logged in but no role assigned yet - show access denied (don't redirect to avoid loop)
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">Your account role has not been assigned yet. Please contact your administrator.</p>
        </div>
      </div>
    );
  }
  
  // Role doesn't match required role
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === "owner" ? "/dashboard" : "/datalog"} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Owner Routes */}
           <Route path="/dashboard" element={<ProtectedRoute requiredRole="owner"><DashboardPage /></ProtectedRoute>} />
           <Route path="/workers" element={<ProtectedRoute requiredRole="owner"><WorkersPage /></ProtectedRoute>} />
           <Route path="/rates" element={<ProtectedRoute requiredRole="owner"><RatesPage /></ProtectedRoute>} />
           <Route path="/logs" element={<ProtectedRoute requiredRole="owner"><ProductionLogPage /></ProtectedRoute>} />
           <Route path="/payroll" element={<ProtectedRoute requiredRole="owner"><PayrollPage /></ProtectedRoute>} />
           <Route path="/inventory" element={<ProtectedRoute requiredRole="owner"><InventoryPage /></ProtectedRoute>} />
           <Route path="/inventory/transactions" element={<ProtectedRoute requiredRole="owner"><InventoryTransactionsPage /></ProtectedRoute>} />
           <Route path="/sales" element={<ProtectedRoute requiredRole="owner"><SalesPage /></ProtectedRoute>} />
           <Route path="/settings" element={<ProtectedRoute requiredRole="owner"><SettingsPage /></ProtectedRoute>} />

           {/* Supervisor Routes */}
           <Route path="/datalog" element={<ProtectedRoute requiredRole="supervisor"><ProductionLogPage /></ProtectedRoute>} />

          {/* Default */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;