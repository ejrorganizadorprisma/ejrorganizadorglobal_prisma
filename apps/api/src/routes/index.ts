import { Router } from 'express';
import authRoutes from './auth.routes';
import productsRoutes from './products.routes';
import productPartsRoutes from './product-parts.routes';
import customersRoutes from './customers.routes';
import quotesRoutes from './quotes.routes';
import salesRoutes from './sales.routes';
import serviceOrdersRoutes from './service-orders.routes';
import dashboardRoutes from './dashboard.routes';
import notificationsRoutes from './notifications.routes';
import reportsRoutes from './reports.routes';
import suppliersRoutes from './suppliers.routes';
import stockReservationsRoutes from './stock-reservations.routes';
import productionOrdersRoutes from './production-orders.routes';
import purchaseOrdersRoutes from './purchase-orders.routes';
import goodsReceiptsRoutes from './goods-receipts.routes';
import bomAnalysisRoutes from './bomAnalysis.routes';

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
router.use('/products', productsRoutes);
router.use('/products', productPartsRoutes);
router.use('/customers', customersRoutes);
router.use('/quotes', quotesRoutes);
router.use('/sales', salesRoutes);
router.use('/service-orders', serviceOrdersRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reports', reportsRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/stock-reservations', stockReservationsRoutes);
router.use('/production-orders', productionOrdersRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/goods-receipts', goodsReceiptsRoutes);
router.use('/bom-analysis', bomAnalysisRoutes);

export default router;
