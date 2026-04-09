import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import permissionsRoutes from './permissions.routes';
import productsRoutes from './products.routes';
import productPartsRoutes from './product-parts.routes';
import productSuppliersRoutes from './product-suppliers.routes';
import customersRoutes from './customers.routes';
import quotesRoutes from './quotes.routes';
import salesRoutes from './sales.routes';
import salesOrdersRoutes from './sales-orders.routes';
import serviceOrdersRoutes from './service-orders.routes';
import dashboardRoutes from './dashboard.routes';
import notificationsRoutes from './notifications.routes';
import reportsRoutes from './reports.routes';
import suppliersRoutes from './suppliers.routes';
import stockReservationsRoutes from './stock-reservations.routes';
import productionOrdersRoutes from './production-orders.routes';
import purchaseOrdersRoutes from './purchase-orders.routes';
import purchaseRequestsRoutes from './purchase-requests.routes';
import goodsReceiptsRoutes from './goods-receipts.routes';
import bomAnalysisRoutes from './bomAnalysis.routes';
import storageLocationRoutes from './storage-location.routes';
import backupRoutes from './backup.routes';
import servicesRoutes from './services.routes';
import documentSettingsRoutes from './document-settings.routes';
import productCategoriesRoutes from './product-categories.routes';
import productFamiliesRoutes from './product-families.routes';
import supplierOrdersRoutes from './supplier-orders.routes';
import productionBatchesRoutes from './production-batches.routes';
import digitalFabricationRoutes from './digital-fabrication.routes';
import systemSettingsRoutes from './system-settings.routes';
import purchaseBudgetsRoutes from './purchase-budgets.routes';
import approvalDelegationsRoutes from './approval-delegations.routes';
import inventoryMovementsRoutes from './inventory-movements.routes';
import financialRoutes from './financial.routes';
import sellersRoutes from './sellers.routes';
import mobileAppRoutes from './mobile-app.routes';
import collectionsRoutes from './collections.routes';
import commissionsRoutes from './commissions.routes';
import gpsRoutes from './gps.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/products', productsRoutes);
router.use('/products', productPartsRoutes);
router.use('/products', productSuppliersRoutes);
router.use('/customers', customersRoutes);
router.use('/quotes', quotesRoutes);
router.use('/sales', salesRoutes);
router.use('/sales-orders', salesOrdersRoutes);
router.use('/service-orders', serviceOrdersRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reports', reportsRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/stock-reservations', stockReservationsRoutes);
router.use('/production-orders', productionOrdersRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/purchase-requests', purchaseRequestsRoutes);
router.use('/goods-receipts', goodsReceiptsRoutes);
router.use('/bom-analysis', bomAnalysisRoutes);
router.use('/storage-locations', storageLocationRoutes);
router.use('/backup', backupRoutes);
router.use('/services', servicesRoutes);
router.use('/document-settings', documentSettingsRoutes);
router.use('/product-categories', productCategoriesRoutes);
router.use('/product-families', productFamiliesRoutes);
router.use('/supplier-orders', supplierOrdersRoutes);
router.use('/production-batches', productionBatchesRoutes);
router.use('/digital-fabrication', digitalFabricationRoutes);
router.use('/system-settings', systemSettingsRoutes);
router.use('/purchase-budgets', purchaseBudgetsRoutes);
router.use('/approval-delegations', approvalDelegationsRoutes);
router.use('/inventory-movements', inventoryMovementsRoutes);
router.use('/financial', financialRoutes);
router.use('/sellers', sellersRoutes);
router.use('/mobile-app', mobileAppRoutes);
router.use('/collections', collectionsRoutes);
router.use('/commissions', commissionsRoutes);
router.use('/gps', gpsRoutes);

export default router;
