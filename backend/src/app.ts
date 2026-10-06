import express from 'express';
import cors from 'cors';
import path from 'path';

// Routes imports
import authRoutes from './modules/auth/authRoutes';
import customersRoutes from './modules/customers/customersRoutes';
import vehiclesRoutes from './modules/vehicles/vehiclesRoutes';
import visitsRoutes from './modules/visits/visitsRoutes';
import workOrdersRoutes from './modules/workOrders/workOrdersRoutes';
import diagnosticsRoutes from './modules/diagnostics/diagnosticsRoutes';
import fluidsRoutes from './modules/fluids/fluidsRoutes';
import inventoryRoutes from './modules/inventory/inventoryRoutes';
import invoicesRoutes from './modules/invoices/invoicesRoutes';
import reportsRoutes from './modules/reports/reportsRoutes';
import attachmentsRoutes from './modules/attachments/attachmentsRoutes';
import syncRoutes from './modules/sync/syncRoutes';
import backupRoutes from './modules/backup/backupRoutes';
import purchasesRoutes from './modules/purchases/purchasesRoutes';
import workshopRoutes from './modules/workshop/workshopRoutes';
import searchRoutes from './modules/search/searchRoutes';

export const app = express();

// Global Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads directory for media, inspection photos, and PDF scanner reports
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Static frontend build directory (serves complete SPA on same port)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'نظام إدارة ورشة السيارات المتكامل',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/work-orders', workOrdersRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/fluids', fluidsRoutes);
app.use('/api/parts', inventoryRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/attachments', attachmentsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/workshop', workshopRoutes);
app.use('/api/search', searchRoutes);

// Catch-all 404 handler for unhandled API endpoints - guarantees JSON response instead of default HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `المسار المطلوب غير موجود: [${req.method}] ${req.path}`,
    code: 'NOT_FOUND'
  });
});

// SPA fallback for non-API requests
if (require('fs').existsSync(frontendDist)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global Error Handler (Arabic friendly)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'حدث خطأ غير متوقع في الخادم',
    code: err.code || 'INTERNAL_ERROR'
  });
});

export default app;
