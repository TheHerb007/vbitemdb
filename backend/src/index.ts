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

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/eq', eqRoutes);
app.use('/api/neweq', neweqRoutes);

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
