import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET /api/eq/search?name=<name>&stats=long|short
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const name = req.query.name;
  const stats = req.query.stats;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Query parameter "name" is required' });
    return;
  }

  const statsCol = stats === 'long' ? 'long_stats' : 'short_stats';

  const words = name.trim().split(/\s+/).filter(Boolean);

  let conn;
  try {
    conn = await pool.getConnection();
    const conditions = words.map(() => '`name` LIKE CONCAT(\'%\', ?, \'%\')').join(' AND ');
    const rows = await conn.query(
      `SELECT \`name\`, \`${statsCol}\` FROM \`eq\` WHERE ${conditions} ORDER BY \`name\``,
      words
    );
    res.json({ results: [...rows], stats: statsCol });
  } catch (err) {
    console.error('eq search error:', err);
    res.status(500).json({ error: 'Failed to search eq table' });
  } finally {
    if (conn) conn.release();
  }
});

export default router;
