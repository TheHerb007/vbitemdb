import { Router, Request, Response } from 'express';
import pool from '../db';
import { findTable } from '../services/introspection';

const router = Router();

router.get('/:tableName/columns/:columnName/values', async (req: Request, res: Response): Promise<void> => {
  const tableName = req.params.tableName as string;
  const columnName = req.params.columnName as string;

  const table = findTable(tableName);
  if (!table) {
    res.status(404).json({ error: `Table not found: ${tableName}` });
    return;
  }

  const column = table.columns.find(c => c.name === columnName);
  if (!column) {
    res.status(404).json({ error: `Column not found: ${columnName}` });
    return;
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // First check cardinality
    const countResult = await conn.query(
      `SELECT COUNT(DISTINCT \`${columnName}\`) as cnt FROM \`${tableName}\``
    );
    const count = Number(countResult[0].cnt);

    if (count > 200) {
      res.json({ values: [], count, truncated: true });
      return;
    }

    const valuesResult = await conn.query(
      `SELECT DISTINCT \`${columnName}\` as val FROM \`${tableName}\` WHERE \`${columnName}\` IS NOT NULL ORDER BY \`${columnName}\` LIMIT 200`
    );

    const values = valuesResult.map((r: { val: unknown }) => r.val);
    res.json({ values, count });
  } catch (err) {
    console.error('Column values error:', err);
    res.status(500).json({ error: 'Failed to fetch column values' });
  } finally {
    if (conn) conn.release();
  }
});

export default router;
