import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import { authRouter } from './routes/auth';
import { settingsRouter } from './routes/settings';
import { productsRouter } from './routes/products';
import { salesRouter } from './routes/sales';
import { shiftsRouter } from './routes/shifts';
import { purchasesRouter } from './routes/purchases';
import { reportsRouter } from './routes/reports';
import { customersRouter } from './routes/customers';
import { grnRouter } from './routes/grn';
import { printerRouter } from './routes/printer';
import { expensesRouter } from './routes/expenses';
import { repRouter } from './routes/rep';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), system: 'Distribution & POS API' });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/grn', grnRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/print', printerRouter);
app.use('/api/rep', repRouter);

// Serve Frontend in Production (Render Single Web Service Deployment)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      // If frontend isn't built or served separately
      next();
    }
  });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Distribution & POS Backend running on port ${PORT}`);
      console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Fatal: Failed to start POS backend:', err);
    process.exit(1);
  }
}

startServer();
