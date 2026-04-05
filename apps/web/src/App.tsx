import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { useAuth } from './hooks/useAuth';
import { usePagePermissions } from './hooks/usePagePermissions';
import { AppPage } from '@ejr/shared-types';
import { MainLayout } from './components/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerFormPage } from './pages/CustomerFormPage';
import { QuotesPage } from './pages/QuotesPage';
import { QuoteFormPage } from './pages/QuoteFormPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { SupplierFormPage } from './pages/SupplierFormPage';
import { ReportsPage } from './pages/ReportsPage';
import { ServiceOrdersPage } from './pages/ServiceOrdersPage';
import { ServiceOrderFormPage } from './pages/ServiceOrderFormPage';
import { ServiceOrderDetailPage } from './pages/ServiceOrderDetailPage';
import { OverviewPage } from './pages/OverviewPage';
import { UsersPage } from './pages/UsersPage';
import { UserFormPage } from './pages/UserFormPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { StockAdjustmentPage } from './pages/StockAdjustmentPage';
import StorageLocationsPage from './pages/StorageLocationsPage';

// Manufacturing Pages
import ManufacturingDashboardPage from './pages/ManufacturingDashboardPage';
import { StockReservationsPage } from './pages/StockReservationsPage';
import { PurchaseBudgetsPage } from './pages/PurchaseBudgetsPage';
import { PurchaseBudgetFormPage } from './pages/PurchaseBudgetFormPage';
import { PurchaseBudgetDetailPage } from './pages/PurchaseBudgetDetailPage';
import { ApprovalDelegationsPage } from './pages/ApprovalDelegationsPage';
import { GoodsReceiptsPage } from './pages/GoodsReceiptsPage';
import { GoodsReceiptFormPage } from './pages/GoodsReceiptFormPage';
import { GoodsReceiptDetailPage } from './pages/GoodsReceiptDetailPage';
import { ProductionOrdersPage } from './pages/ProductionOrdersPage';
import { ProductionOrderFormPage } from './pages/ProductionOrderFormPage';
import { ProductionOrderDetailPage } from './pages/ProductionOrderDetailPage';
import { BackupPage } from './pages/BackupPage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceFormPage } from './pages/ServiceFormPage';
import { DocumentSettingsPage } from './pages/DocumentSettingsPage';
import { DocumentSettingsFormPage } from './pages/DocumentSettingsFormPage';
import { SystemSettingsPage } from './pages/SystemSettingsPage';
import { SalesPage } from './pages/SalesPage';
import { SaleDetailPage } from './pages/SaleDetailPage';
import { SaleFormPage } from './pages/SaleFormPage';
import { ProductCategoriesPage } from './pages/ProductCategoriesPage';
import { SupplierOrdersPage } from './pages/SupplierOrdersPage';
import { SupplierOrderDetailPage } from './pages/SupplierOrderDetailPage';
import { PurchaseOrderDetailPage } from './pages/PurchaseOrderDetailPage';
import { GoodsReceiptConferencePage } from './pages/GoodsReceiptConferencePage';
import { ProductionBatchesPage } from './pages/ProductionBatchesPage';
import { ProductionBatchDetailPage } from './pages/ProductionBatchDetailPage';
import { ProductionBatchFormPage } from './pages/ProductionBatchFormPage';
import { MyProductionPage } from './pages/MyProductionPage';
import { ManualPage } from './pages/ManualPage';
import { DigitalFabricationPage } from './pages/DigitalFabricationPage';
import { DigitalFabricationNewPage } from './pages/DigitalFabricationNewPage';
import { DigitalFabricationDetailPage } from './pages/DigitalFabricationDetailPage';
import { FabricationMachinesPage } from './pages/FabricationMachinesPage';

// Financial Pages
import { FinancialDashboardPage } from './pages/FinancialDashboardPage';
import { FinancialCalendarPage } from './pages/FinancialCalendarPage';
import { FinancialReceivablesPage } from './pages/FinancialReceivablesPage';
import { FinancialPayablesPage } from './pages/FinancialPayablesPage';
import { FinancialDebtorsPage } from './pages/FinancialDebtorsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasRoutePermission, hasPermission, isLoading: permissionsLoading } = usePagePermissions();
  const location = useLocation();

  if (isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has permission to access this route
  if (!hasRoutePermission(location.pathname)) {
    // Find the first page the user has access to
    const accessiblePages = [
      { path: '/dashboard', page: AppPage.DASHBOARD },
      { path: '/overview', page: AppPage.OVERVIEW },
      { path: '/manufacturing', page: AppPage.MANUFACTURING },
      { path: '/products', page: AppPage.PRODUCTS },
      { path: '/services', page: AppPage.PRODUCTS }, // Services use products permission
      { path: '/customers', page: AppPage.CUSTOMERS },
      { path: '/quotes', page: AppPage.QUOTES },
      { path: '/sales', page: AppPage.SALES },
      { path: '/service-orders', page: AppPage.SERVICE_ORDERS },
      { path: '/suppliers', page: AppPage.SUPPLIERS },
      { path: '/purchase-budgets', page: AppPage.PURCHASE_BUDGETS },
      { path: '/supplier-orders', page: AppPage.SUPPLIER_ORDERS },
      { path: '/goods-receipts', page: AppPage.GOODS_RECEIPTS },
      { path: '/production-orders', page: AppPage.PRODUCTION_ORDERS },
      { path: '/production-batches', page: AppPage.PRODUCTION_BATCHES },
      { path: '/my-production', page: AppPage.MY_PRODUCTION },
      { path: '/stock-reservations', page: AppPage.STOCK_RESERVATIONS },
      { path: '/reports', page: AppPage.REPORTS },
      { path: '/users', page: AppPage.USERS },
      { path: '/permissions', page: AppPage.USERS }, // Permissions use users permission
      { path: '/storage-locations', page: AppPage.STORAGE_LOCATIONS },
      { path: '/stock-adjustment', page: AppPage.STOCK_ADJUSTMENT },
      { path: '/settings/document-settings', page: AppPage.DOCUMENT_SETTINGS },
      { path: '/backup', page: AppPage.BACKUP },
    ];

    const firstAccessiblePage = accessiblePages.find(p => hasPermission(p.page));

    if (firstAccessiblePage) {
      return <Navigate to={firstAccessiblePage.path} replace />;
    }

    // If user has no access to any page, redirect to a "no access" page
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Sem Acesso</h2>
          <p className="text-gray-600 mb-6">
            Você não tem permissão para acessar nenhuma página do sistema. Entre em contato com o administrador.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { fetchUser, isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Só tenta buscar o usuário se não estiver na página de login
    if (location.pathname !== '/login') {
      fetchUser();
    }
  }, [fetchUser, location.pathname]);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/overview"
        element={
          <ProtectedRoute>
            <MainLayout>
              <OverviewPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manufacturing"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ManufacturingDashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CustomersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CustomerFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CustomerFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotes"
        element={
          <ProtectedRoute>
            <MainLayout>
              <QuotesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotes/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <QuoteFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotes/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <QuoteFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SalesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SaleFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SaleDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Financial (Financeiro) */}
      <Route
        path="/financial"
        element={
          <ProtectedRoute>
            <MainLayout>
              <FinancialDashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financial/calendar"
        element={
          <ProtectedRoute>
            <MainLayout>
              <FinancialCalendarPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financial/receivables"
        element={
          <ProtectedRoute>
            <MainLayout>
              <FinancialReceivablesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financial/payables"
        element={
          <ProtectedRoute>
            <MainLayout>
              <FinancialPayablesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/financial/debtors"
        element={
          <ProtectedRoute>
            <MainLayout>
              <FinancialDebtorsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SuppliersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SupplierFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SupplierFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ReportsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <MainLayout>
              <UsersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <UserFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <UserFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/permissions"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PermissionsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/storage-locations"
        element={
          <ProtectedRoute>
            <MainLayout>
              <StorageLocationsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-adjustment"
        element={
          <ProtectedRoute>
            <MainLayout>
              <StockAdjustmentPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-orders"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ServiceOrdersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-orders/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ServiceOrderFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-orders/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ServiceOrderDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-orders/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ServiceOrderFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Stock Reservations */}
      <Route
        path="/stock-reservations"
        element={
          <ProtectedRoute>
            <MainLayout>
              <StockReservationsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Purchase Budgets (Orçamentos de Compra) */}
      <Route
        path="/purchase-budgets"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PurchaseBudgetsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-budgets/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PurchaseBudgetFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-budgets/delegations"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ApprovalDelegationsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-budgets/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PurchaseBudgetFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-budgets/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PurchaseBudgetDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Goods Receipts */}
      <Route
        path="/goods-receipts"
        element={
          <ProtectedRoute>
            <MainLayout>
              <GoodsReceiptsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/goods-receipts/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <GoodsReceiptFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/goods-receipts/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <GoodsReceiptDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/goods-receipts/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <GoodsReceiptFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Purchase Order Conference (Goods Receipt) */}
      <Route
        path="/purchase-orders/:id/conference"
        element={
          <ProtectedRoute>
            <MainLayout>
              <GoodsReceiptConferencePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Purchase Orders */}
      <Route
        path="/purchase-orders/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PurchaseOrderDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Supplier Orders */}
      <Route
        path="/supplier-orders"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SupplierOrdersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/supplier-orders/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SupplierOrderDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Production Orders */}
      <Route
        path="/production-orders"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductionOrdersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/production-orders/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductionOrderFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/production-orders/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductionOrderFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/production-orders/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductionOrderDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/backup"
        element={
          <ProtectedRoute>
            <MainLayout>
              <BackupPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ServicesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/services/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ServiceFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/services/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ServiceFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Document Settings */}
      <Route
        path="/settings/document-settings"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DocumentSettingsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/document-settings/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DocumentSettingsFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SystemSettingsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/document-settings/edit/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DocumentSettingsFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Product Categories */}
      <Route
        path="/settings/product-categories"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductCategoriesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Production Batches */}
      <Route
        path="/production-batches"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductionBatchesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/production-batches/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductionBatchFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/production-batches/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductionBatchDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* My Production - Worker Page */}
      <Route
        path="/my-production"
        element={
          <ProtectedRoute>
            <MainLayout>
              <MyProductionPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Manual - Admin Only */}
      <Route
        path="/settings/manual"
        element={
          <ProtectedRoute>
            <ManualPage />
          </ProtectedRoute>
        }
      />
      {/* Digital Fabrication (3D & Laser) */}
      <Route
        path="/digital-fabrication"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DigitalFabricationPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/digital-fabrication/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DigitalFabricationNewPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/digital-fabrication/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DigitalFabricationDetailPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fabrication-machines"
        element={
          <ProtectedRoute>
            <MainLayout>
              <FabricationMachinesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
