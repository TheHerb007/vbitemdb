import { Router, Request, Response } from 'express';
import pool from '../db';
import { parseItemText } from '../services/parser';

const router = Router();

// GET /api/neweq — list all pending items
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT name, TYPE, worn, wt, VALUE, ac, hit, dam, keywords FROM neweq ORDER BY name'
    );
    res.json({ items: [...rows] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to fetch neweq items', detail: msg });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/neweq — parse raw item text and insert into neweq table
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Request body must include a "text" field' });
    return;
  }

  const item = parseItemText(text);

  if (!item.name) {
    res.status(400).json({ error: 'Could not parse item name from text' });
    return;
  }

  const columns = Object.keys(item) as (keyof typeof item)[];
  const values = columns.map(c => item[c]);
  const colList = columns.map(c => `\`${c}\``).join(', ');
  const placeholders = columns.map(() => '?').join(', ');

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO neweq (${colList}) VALUES (${placeholders})`,
      values
    );
    res.json({ success: true, name: item.name, parsed: item });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('neweq insert error:', msg);
    res.status(500).json({ error: 'Failed to insert item', detail: msg });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/neweq/:name/approve — copy row to eq then delete from neweq
router.post('/:name/approve', async (req: Request, res: Response): Promise<void> => {
  const name = req.params.name as string;
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Copy all columns from neweq to eq
    await conn.query(
      'INSERT INTO eq SELECT * FROM neweq WHERE name = ?',
      [name]
    );
    await conn.query('DELETE FROM neweq WHERE name = ?', [name]);

    await conn.commit();
    res.json({ success: true, name });
  } catch (err: unknown) {
    if (conn) await conn.rollback();
    const msg = err instanceof Error ? err.message : String(err);
    console.error('approve error:', msg);
    res.status(500).json({ error: 'Failed to approve item', detail: msg });
  } finally {
    if (conn) conn.release();
  }
});

// DELETE /api/neweq/:name — reject and remove from neweq
router.delete('/:name', async (req: Request, res: Response): Promise<void> => {
  const name = req.params.name as string;
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM neweq WHERE name = ?', [name]);
    res.json({ success: true, name });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('reject error:', msg);
    res.status(500).json({ error: 'Failed to reject item', detail: msg });
  } finally {
    if (conn) conn.release();
  }
});

export default router;
