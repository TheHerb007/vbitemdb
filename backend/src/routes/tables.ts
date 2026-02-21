import { Router, Request, Response } from 'express';
import { findTable } from '../services/introspection';
import { searchTable } from '../services/search';
import { ColumnFilter } from '../types';

const router = Router();

function parseFilters(query: Record<string, unknown>): ColumnFilter[] {
  const filters: ColumnFilter[] = [];

  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^filter\[(\w+)\](?:\[(\w+)\])?$/);
    if (!match) continue;

    const column = match[1];
    const modifier = match[2]; // 'min', 'max', 'like', or undefined (exact)

    if (typeof value !== 'string') continue;

    if (!modifier) {
      filters.push({ column, type: 'exact', value });
    } else if (modifier === 'min') {
      filters.push({ column, type: 'min', value });
    } else if (modifier === 'max') {
      filters.push({ column, type: 'max', value });
    } else if (modifier === 'like') {
      filters.push({ column, type: 'like', value });
    }
  }

  return filters;
}

router.get('/:tableName/rows', async (req: Request, res: Response): Promise<void> => {
  const tableName = req.params.tableName as string;

  const table = findTable(tableName);
  if (!table) {
    res.status(404).json({ error: `Table not found: ${tableName}` });
    return;
  }

  try {
    const result = await searchTable({
      tableName,
      query: typeof req.query.q === 'string' ? req.query.q : undefined,
      filters: parseFilters(req.query as Record<string, unknown>),
      sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
      order: req.query.order === 'desc' ? 'desc' : 'asc',
      page: parseInt(req.query.page as string, 10) || 1,
      pageSize: parseInt(req.query.pageSize as string, 10) || 50,
    });

    res.json(result);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to query table' });
  }
});

export default router;
