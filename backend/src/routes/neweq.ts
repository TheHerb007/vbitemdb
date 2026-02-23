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

      // Discover all neweq columns, excluding metadata and location fields
      const EXCLUDE = new Set(['DATE', 'long_stats', 'short_stats', 'load', 'zone', 'quest']);
      const colRows = await conn.query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'neweq'
         ORDER BY ORDINAL_POSITION`
      );
      const NUMERIC_TYPES = new Set(['tinyint','smallint','mediumint','int','bigint','float','double','decimal']);
      const cols = (colRows as Array<{ COLUMN_NAME: string; DATA_TYPE: string }>)
        .filter(r => !EXCLUDE.has(r.COLUMN_NAME));

      // COALESCE normalises NULL to the column's natural default (0 or '')
      // so that neweq nulls match eq's stored zero/empty-string defaults
      const joinCond = cols.map(r => {
        const c = `\`${r.COLUMN_NAME}\``;
        const def = NUMERIC_TYPES.has(r.DATA_TYPE) ? '0' : "''";
        return `COALESCE(e.${c}, ${def}) <=> COALESCE(n.${c}, ${def})`;
      }).join(' AND ');
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

  const item: Record<string, unknown> = { ...parsed, ...meta };

  let conn;
  try {
    conn = await pool.getConnection();

    // Fill in defaults for every column not set by the parser,
    // so neweq rows have the same 0/"" defaults as eq rows
    const NUMERIC_TYPES = new Set(['tinyint','smallint','mediumint','int','bigint','float','double','decimal']);
    const ALREADY_SET = new Set(['DATE', 'short_stats', 'long_stats']);
    const schemaRows = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'neweq'
       ORDER BY ORDINAL_POSITION`
    );
    for (const row of schemaRows as Array<{ COLUMN_NAME: string; DATA_TYPE: string }>) {
      if (ALREADY_SET.has(row.COLUMN_NAME)) continue;
      if (!(row.COLUMN_NAME in item)) {
        item[row.COLUMN_NAME] = NUMERIC_TYPES.has(row.DATA_TYPE) ? 0 : '';
      }
    }

    const columns = Object.keys(item);
    const values = columns.map(c => item[c]);
    const colList = columns.map(c => `\`${c}\``).join(', ');
    const placeholders = columns.map(() => '?').join(', ');

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
