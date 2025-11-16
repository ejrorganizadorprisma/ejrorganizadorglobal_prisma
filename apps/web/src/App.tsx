import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { useAuth } from './hooks/useAuth';
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

// Manufacturing Pages
import ManufacturingDashboardPage from './pages/ManufacturingDashboardPage';
import { StockReservationsPage } from './pages/StockReservationsPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { PurchaseOrderFormPage } from './pages/PurchaseOrderFormPage';
import { GoodsReceiptsPage } from './pages/GoodsReceiptsPage';
import { GoodsReceiptFormPage } from './pages/GoodsReceiptFormPage';
import { ProductionOrdersPage } from './pages/ProductionOrdersPage';
import { ProductionOrderFormPage } from './pages/ProductionOrderFormPage';
import { ProductionOrderDetailPage } from './pages/ProductionOrderDetailPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { fetchUser, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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
      {/* Purchase Orders */}
      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PurchaseOrdersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders/new"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PurchaseOrderFormPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders/:id/edit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PurchaseOrderFormPage />
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
        path="/production-orders/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductionOrderDetailPage />
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
