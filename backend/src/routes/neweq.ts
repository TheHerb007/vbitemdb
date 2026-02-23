import { Router, Request, Response } from 'express';
import pool from '../db';
import { parseItemText } from '../services/parser';
import { generateStats } from '../services/stats';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/neweq — list all pending items, flagging names that already exist in eq
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT name, TYPE, worn, wt, VALUE, ac, hit, dam, keywords, long_stats FROM neweq ORDER BY name'
    );
    const items = [...rows] as Array<Record<string, unknown>>;
    if (items.length > 0) {
      const names = items.map(r => r.name as string);
      const placeholders = names.map(() => '?').join(', ');

      // Discover all neweq columns, excluding metadata/derived fields
      const EXCLUDE = new Set(['DATE', 'long_stats', 'short_stats']);
      const colRows = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'neweq'
         ORDER BY ORDINAL_POSITION`
      );
      const cols = (colRows as Array<{ COLUMN_NAME: string }>)
        .map(r => r.COLUMN_NAME)
        .filter(c => !EXCLUDE.has(c));

      // NULL-safe equality join on every non-metadata column
      const joinCond = cols.map(c => `e.\`${c}\` <=> n.\`${c}\``).join(' AND ');
      const existing = await conn.query(
        `SELECT n.name FROM neweq n
         INNER JOIN eq e ON ${joinCond}
         WHERE n.name IN (${placeholders})`,
        names
      );
      const existingSet = new Set((existing as Array<{ name: string }>).map(r => r.name));
      items.forEach(item => { item.duplicate = existingSet.has(item.name as string); });
    }
    res.json({ items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to fetch neweq items', detail: msg });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/neweq/preview — parse text and return long_stats without inserting
router.post('/preview', async (req: Request, res: Response): Promise<void> => {
  const { text, zone, load, quest } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    res.json({ preview: null }); return;
  }
  const parsed = parseItemText(text);
  if (!parsed.name) {
    res.json({ preview: null }); return;
  }
  const fullItem = {
    ...parsed,
    zone: typeof zone === 'string' ? zone : undefined,
    load: typeof load === 'string' ? load : undefined,
    quest: typeof quest === 'string' ? quest : undefined,
  };
  const { long_stats } = generateStats(fullItem);
  res.json({ preview: long_stats });
});

// POST /api/neweq — parse raw item text and insert into neweq table (auth required)
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { text, zone, load, quest } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Request body must include a "text" field' });
    return;
  }

  const parsed = parseItemText(text);

  if (!parsed.name) {
    res.status(400).json({ error: 'Could not parse item name from text' });
    return;
  }

  // Merge metadata from the form
  const meta: Record<string, unknown> = {};
  if (zone && typeof zone === 'string') meta.zone = zone;
  if (load && typeof load === 'string') meta.load = load;
  if (quest && typeof quest === 'string') meta.quest = quest;
  meta.DATE = new Date().toISOString().slice(0, 10);

  // Generate short_stats and long_stats
  const fullItem = { ...parsed, zone: meta.zone as string | undefined, load: meta.load as string | undefined, quest: meta.quest as string | undefined };
  const { short_stats, long_stats } = generateStats(fullItem);
  meta.short_stats = short_stats;
  meta.long_stats = long_stats;

  const item = { ...parsed, ...meta };
  const columns = Object.keys(item);
  const values = columns.map(c => (item as Record<string, unknown>)[c]);
  const colList = columns.map(c => `\`${c}\``).join(', ');
  const placeholders = columns.map(() => '?').join(', ');

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO neweq (${colList}) VALUES (${placeholders})`,
      values
    );
    res.json({ success: true, name: parsed.name, parsed: item });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('neweq insert error:', msg);
    res.status(500).json({ error: 'Failed to insert item', detail: msg });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/neweq/:name/approve — copy row to eq then delete from neweq (auth required)
router.post('/:name/approve', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

// DELETE /api/neweq/:name — reject and remove from neweq (auth required)
router.delete('/:name', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
