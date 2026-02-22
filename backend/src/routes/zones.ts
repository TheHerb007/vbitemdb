import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET /api/zones — return all zone names from the zones table
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT name FROM zones ORDER BY name');
    res.json({ zones: [...rows].map((r: { name: string }) => r.name) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to fetch zones', detail: msg });
  } finally {
    if (conn) conn.release();
  }
});

export default router;
