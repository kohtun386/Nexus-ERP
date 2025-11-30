import React from 'react';

// Placeholder for a desktop header
const Header: React.FC = () => {
  return (
    <header className="hidden md:block bg-brand-primary text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">Nexus ERP</h1>
        <nav>
          {/* Desktop navigation links can go here */}
        </nav>
      </div>
    </header>
  );
};

// Placeholder for a mobile/tablet bottom navigation bar
const BottomNav: React.FC = () => {
  return (
    <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-2">
      <div className="container mx-auto flex justify-around items-center">
        {/* Mobile navigation icons can go here */}
        <div className="text-center">Home</div>
        <div className="text-center">Logs</div>
        <div className="text-center">Menu</div>
      </div>
    </footer>
  );
};

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * MainLayout provides the consistent structure for the application,
 * including a responsive header for desktop and a bottom navigation for mobile.
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default MainLayout;
