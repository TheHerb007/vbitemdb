import pool from '../db';
import { findTable } from './introspection';
import { SearchParams, PaginatedResult, ColumnFilter } from '../types';

export async function searchTable(params: SearchParams): Promise<PaginatedResult> {
  const table = findTable(params.tableName);
  if (!table) {
    throw new Error(`Table not found: ${params.tableName}`);
  }

  const quotedTable = `\`${params.tableName}\``;
  const whereClauses: string[] = [];
  const queryValues: unknown[] = [];

  // Full-text search
  if (params.query && params.query.trim()) {
    const searchTerm = params.query.trim();

    // Check if table has a FULLTEXT index
    if (table.fulltextColumns.length > 0) {
      // Use the first fulltext index
      const ftCols = table.fulltextColumns[0].map(c => `\`${c}\``).join(', ');
      whereClauses.push(`MATCH(${ftCols}) AGAINST (? IN BOOLEAN MODE)`);
      queryValues.push(searchTerm);
    } else {
      // Fall back to LIKE across all text columns
      const textCols = table.columns.filter(c => c.filterType === 'text');
      if (textCols.length > 0) {
        const likeClauses = textCols.map(c => `\`${c.name}\` LIKE CONCAT('%', ?, '%')`);
        whereClauses.push(`(${likeClauses.join(' OR ')})`);
        for (let i = 0; i < textCols.length; i++) {
          queryValues.push(searchTerm);
        }
      }
    }
  }

  // Per-column filters
  for (const filter of params.filters) {
    const col = table.columns.find(c => c.name === filter.column);
    if (!col) continue; // skip unknown columns

    const quotedCol = `\`${filter.column}\``;
    switch (filter.type) {
      case 'exact':
        whereClauses.push(`${quotedCol} = ?`);
        queryValues.push(filter.value);
        break;
      case 'like':
        whereClauses.push(`${quotedCol} LIKE CONCAT('%', ?, '%')`);
        queryValues.push(filter.value);
        break;
      case 'min':
        whereClauses.push(`${quotedCol} >= ?`);
        queryValues.push(filter.value);
        break;
      case 'max':
        whereClauses.push(`${quotedCol} <= ?`);
        queryValues.push(filter.value);
        break;
    }
  }

  const whereStr = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  // Sorting
  let orderStr = '';
  if (params.sort) {
    const sortCol = table.columns.find(c => c.name === params.sort);
    if (sortCol) {
      const dir = params.order === 'desc' ? 'DESC' : 'ASC';
      orderStr = `ORDER BY \`${params.sort}\` ${dir}`;
    }
  }

  // Pagination
  const pageSize = Math.min(Math.max(params.pageSize, 1), 500);
  const offset = (Math.max(params.page, 1) - 1) * pageSize;

  let conn;
  try {
    conn = await pool.getConnection();

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM ${quotedTable} ${whereStr}`;
    const countResult = await conn.query(countSql, queryValues);
    const total = Number(countResult[0].total);

    // Get rows
    const dataSql = `SELECT * FROM ${quotedTable} ${whereStr} ${orderStr} LIMIT ? OFFSET ?`;
    const rows = await conn.query(dataSql, [...queryValues, pageSize, offset]);

    // mariadb driver returns rows with a 'meta' property — filter it out
    const cleanRows = Array.isArray(rows) ? [...rows] : [];

    return {
      rows: cleanRows,
      total,
      page: params.page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } finally {
    if (conn) conn.release();
  }
}
