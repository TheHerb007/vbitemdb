import pool from '../db';
import { config } from '../config';
import { TableSchema, ColumnSchema, FilterType, SchemaCache } from '../types';

let schemaCache: SchemaCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function computeFilterType(dataType: string): FilterType {
  if (dataType === 'enum' || dataType === 'set') {
    return 'enum';
  }
  if (['int', 'bigint', 'smallint', 'tinyint', 'mediumint', 'float', 'double', 'decimal'].includes(dataType)) {
    return 'range';
  }
  if (['date', 'datetime', 'timestamp'].includes(dataType)) {
    return 'daterange';
  }
  if (['varchar', 'char', 'text', 'mediumtext', 'longtext', 'tinytext'].includes(dataType)) {
    return 'text';
  }
  return 'none';
}

function parseEnumValues(columnType: string): string[] {
  const match = columnType.match(/^enum\((.+)\)$/i);
  if (!match) return [];
  return match[1].split(',').map(v => v.replace(/^'|'$/g, ''));
}

export async function introspectSchema(force = false): Promise<TableSchema[]> {
  if (!force && schemaCache && Date.now() - schemaCache.fetchedAt < CACHE_TTL_MS) {
    return schemaCache.tables;
  }

  const dbName = config.db.database;
  let conn;
  try {
    conn = await pool.getConnection();

    const columns = await conn.query(`
      SELECT
        TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE,
        IS_NULLABLE, COLUMN_KEY, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `, [dbName]);

    const indexes = await conn.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND INDEX_TYPE = 'FULLTEXT'
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `, [dbName]);

    // Group columns by table
    const tableMap = new Map<string, ColumnSchema[]>();
    for (const row of columns) {
      const tableName = row.TABLE_NAME;
      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, []);
      }

      const filterType = computeFilterType(row.DATA_TYPE);
      const col: ColumnSchema = {
        name: row.COLUMN_NAME,
        dataType: row.DATA_TYPE,
        columnType: row.COLUMN_TYPE,
        isNullable: row.IS_NULLABLE === 'YES',
        columnKey: row.COLUMN_KEY,
        extra: row.EXTRA,
        filterType,
      };

      if (filterType === 'enum') {
        col.enumValues = parseEnumValues(row.COLUMN_TYPE);
      }

      tableMap.get(tableName)!.push(col);
    }

    // Group fulltext indexes by table -> index_name -> columns
    const ftMap = new Map<string, Map<string, string[]>>();
    for (const row of indexes) {
      const tableName = row.TABLE_NAME;
      const indexName = row.INDEX_NAME;
      if (!ftMap.has(tableName)) {
        ftMap.set(tableName, new Map());
      }
      const tMap = ftMap.get(tableName)!;
      if (!tMap.has(indexName)) {
        tMap.set(indexName, []);
      }
      tMap.get(indexName)!.push(row.COLUMN_NAME);
    }

    const tables: TableSchema[] = [];
    for (const [name, cols] of tableMap) {
      const ftIndexes = ftMap.get(name);
      const fulltextColumns: string[][] = [];
      if (ftIndexes) {
        for (const colGroup of ftIndexes.values()) {
          fulltextColumns.push(colGroup);
        }
      }
      tables.push({ name, columns: cols, fulltextColumns });
    }

    schemaCache = { tables, fetchedAt: Date.now() };
    return tables;
  } finally {
    if (conn) conn.release();
  }
}

export function getCachedSchema(): TableSchema[] | null {
  return schemaCache?.tables ?? null;
}

export function findTable(tableName: string): TableSchema | undefined {
  return schemaCache?.tables.find(t => t.name === tableName);
}
