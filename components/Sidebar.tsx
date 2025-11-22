import React from 'react';
import { LayoutDashboard, Package, Factory, ShoppingCart, Users, Settings, Box, Banknote, LogOut } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'payroll', label: 'Payroll', icon: Banknote },
    { id: 'sales', label: 'Sales Orders', icon: ShoppingCart },
    { id: 'crm', label: 'Customers', icon: Users },
    { id: 'settings', label: 'Master Data', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 border-r border-slate-800 shadow-xl z-20">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg">
            <Box className="w-6 h-6 text-white" />
        </div>
        <div>
            <h1 className="text-xl font-bold tracking-tight">Nexus ERP</h1>
            <p className="text-xs text-slate-400">V2.0 Enterprise</p>
        </div>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20 translate-x-1' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              SU
            </div>
            <div>
              <p className="text-sm font-medium">Super User</p>
              <p className="text-xs text-slate-500">Admin Access</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 rounded-lg text-slate-500 hover:bg-red-900/20 hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;