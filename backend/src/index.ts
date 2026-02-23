import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { introspectSchema } from './services/introspection';
import authRoutes from './routes/auth';
import schemaRoutes from './routes/schema';
import tablesRoutes from './routes/tables';
import columnsRoutes from './routes/columns';
import eqRoutes from './routes/eq';
import neweqRoutes from './routes/neweq';
import zonesRoutes from './routes/zones';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown';
  const timestamp = new Date().toISOString();
  const query = Object.keys(req.query).length ? ' ' + new URLSearchParams(req.query as Record<string, string>).toString() : '';
  console.log(`[${timestamp}] - [${ip}] - ${req.method} ${req.path}${query}`);
  next();
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/eq', eqRoutes);
app.use('/api/neweq', neweqRoutes);
app.use('/api/zones', zonesRoutes);

// Protected routes
app.use('/api/schema', authMiddleware, schemaRoutes);
app.use('/api/tables', authMiddleware, tablesRoutes);
app.use('/api/tables', authMiddleware, columnsRoutes);

async function start() {
  try {
    console.log('Introspecting database schema...');
    const tables = await introspectSchema();
    console.log(`Discovered ${tables.length} table(s): ${tables.map(t => t.name).join(', ')}`);

    app.listen(config.port, () => {
      console.log(`Backend running on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
