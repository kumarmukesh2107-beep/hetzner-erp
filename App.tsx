
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider, useCompany } from './context/CompanyContext';
import { InventoryProvider } from './context/InventoryContext';
import { SalesProvider } from './context/SalesContext';
import { PurchaseProvider } from './context/PurchaseContext';
import { AccountingProvider } from './context/AccountingContext';
import { PayrollProvider } from './context/PayrollContext';
import { ContactProvider } from './context/ContactContext';
import { SettingsProvider } from './context/SettingsContext';
import { UserRole } from './types';

// Layouts
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import AIAssistantWidget from './components/AI/AIAssistantWidget';

// Pages
import LoginPage from './pages/LoginPage';
import CompanySelectionPage from './pages/CompanySelectionPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import ContactsPage from './pages/ContactsPage';
import AccountingPage from './pages/AccountingPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import PayrollPage from './pages/PayrollPage';
import AIAssistantPage from './pages/AIAssistantPage';
import SettingsPage from './pages/SettingsPage';

// Admin Pages
import CompanyManagement from './pages/Admin/CompanyManagement';
import UserManagement from './pages/Admin/UserManagement';
import DataMigrationPage from './pages/Admin/DataMigrationPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: UserRole[] }> = ({ children, roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { activeCompany, isLoading: companyLoading } = useCompany();

  if (isLoading || companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // User authenticated but no company selected
  if (!activeCompany) return <CompanySelectionPage />;

  if (roles && user && !roles.includes(user.role)) {
    // If not authorized for this specific route, send back home (which might redirect based on role)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-10 relative">
          <div className="max-w-7xl mx-auto">{children}</div>
          {user?.role !== UserRole.STAFF && <AIAssistantWidget />}
        </main>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          {user?.role === UserRole.STAFF ? (
            <Navigate to="/sales" replace />
          ) : (
            <DashboardLayout><DashboardPage /></DashboardLayout>
          )}
        </ProtectedRoute>
      } />
      <Route path="/products" element={<ProtectedRoute><DashboardLayout><ProductsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><DashboardLayout><InventoryPage /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><DashboardLayout><SalesPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}><DashboardLayout><PurchasesPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><DashboardLayout><ContactsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/ai-assistant" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}><DashboardLayout><AIAssistantPage /></DashboardLayout></ProtectedRoute>} />
      
      {/* Financials restricted to Admin and Manager */}
      <Route path="/payroll" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}><DashboardLayout><PayrollPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/accounting" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}><DashboardLayout><AccountingPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}><DashboardLayout><ExpensesPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}><DashboardLayout><ReportsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
      
      {/* Admin Only System Settings */}
      <Route path="/admin/companies" element={<ProtectedRoute roles={[UserRole.ADMIN]}><DashboardLayout><CompanyManagement /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={[UserRole.ADMIN]}><DashboardLayout><UserManagement /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/migration" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}><DashboardLayout><DataMigrationPage /></DashboardLayout></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CompanyProvider>
        <AccountingProvider>
          <InventoryProvider>
            <ContactProvider>
              <PurchaseProvider>
                <SalesProvider>
                  <PayrollProvider>
                    <SettingsProvider>
                      <Router><AppRoutes /></Router>
                    </SettingsProvider>
                  </PayrollProvider>
                </SalesProvider>
              </PurchaseProvider>
            </ContactProvider>
          </InventoryProvider>
        </AccountingProvider>
      </CompanyProvider>
    </AuthProvider>
  );
};

export default App;
