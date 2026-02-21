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

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT \`name\`, \`${statsCol}\` FROM \`eq\` WHERE \`name\` LIKE CONCAT('%', ?, '%') ORDER BY \`name\``,
      [name]
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
