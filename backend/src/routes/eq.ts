import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

const TEXT_FIELDS = [
  'name', 'keywords', 'zone', 'load', 'quest', 'no_id', 'bound',
  'TYPE', 'worn', 'w_type', 'w_class', 'w_range', 'w_bonus',
  'p_poison', 'enchant', 'crit', 'bonus', 'effects', 'called',
  'powers', 'gearset', 's_spell', 'item_flags', 'affect_flags', 'usable_by',
];

const NUMERIC_FIELDS = new Set([
  'wt', 'VALUE', 'ac', 'armor', 'pages', 'hp', 'p_hp',
  'w_dice_count', 'w_dice', 'hit', 'dam',
  'sv_spell', 'sv_bre', 'sv_para', 'sv_petri', 'sv_rod',
  'str', 'agi', 'dex', 'con', 'POW', 'int', 'wis', 'cha',
  'max_str', 'max_agi', 'max_dex', 'max_con', 'max_pow', 'max_int', 'max_wis', 'max_cha',
  'luck', 'karma', 'mana', 'move', 'age', 'weight', 'height', 'mr',
  'sf_ele', 'sf_enc', 'sf_heal', 'sf_ill', 'sf_inv', 'sf_nat', 'sf_nec', 'sf_prot', 'sf_spi', 'sf_sum',
  'psp', 'i_quality', 'i_stutter', 'i_min', 'holds', 'weightless',
  'pick', 'break', 'p_level', 'p_apps', 'p_hits',
  'charge', 'max_charge', 's_level',
  'r_unarmd', 'r_slash', 'r_bludgn', 'r_pierce', 'r_ranged', 'r_spell',
  'r_sonic', 'r_pos', 'r_neg', 'r_psi', 'r_mental', 'r_good', 'r_evil',
  'r_law', 'r_chaos', 'r_force', 'r_fire', 'r_cold', 'r_elect', 'r_acid', 'r_poison',
]);

// Lookup map: lowercase canonical name AND underscore-stripped alias → canonical field name.
// Allows e.g. "maxagi" and "max_agi" to resolve to the same "max_agi" column.
const FIELD_LOOKUP = new Map<string, string>();
for (const field of NUMERIC_FIELDS) {
  FIELD_LOOKUP.set(field.toLowerCase(), field);
  if (field.includes('_')) {
    FIELD_LOOKUP.set(field.replace(/_/g, '').toLowerCase(), field);
  }
}

// Parse inline "field:value" tokens from a name query string.
// Supports: field:N (=N), field:>N (>N), field:>=N (>=N), field:<N (<N), field:<=N (<=N), field:N-M (>=N AND <=M)
// Field names are matched case-insensitively; underscores are optional (maxagi = max_agi).
interface InlineFilter { field: string; op: string; value: number }

function parseInlineFilters(raw: string): { textTokens: string[]; inlineFilters: InlineFilter[] } {
  const textTokens: string[] = [];
  const inlineFilters: InlineFilter[] = [];
  for (const token of raw.trim().split(/\s+/).filter(Boolean)) {
    const colon = token.indexOf(':');
    if (colon > 0) {
      const fieldRaw = token.slice(0, colon);
      const val = token.slice(colon + 1);
      const field = FIELD_LOOKUP.get(fieldRaw.toLowerCase()) ?? null;
      if (field !== null && val !== '') {
        const rangeMatch = val.match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);
        if (rangeMatch) {
          inlineFilters.push({ field, op: '>=', value: parseFloat(rangeMatch[1]) });
          inlineFilters.push({ field, op: '<=', value: parseFloat(rangeMatch[2]) });
        } else if (val.startsWith('>=')) {
          const n = parseFloat(val.slice(2));
          if (!isNaN(n)) inlineFilters.push({ field, op: '>=', value: n });
        } else if (val.startsWith('>')) {
          const n = parseFloat(val.slice(1));
          if (!isNaN(n)) inlineFilters.push({ field, op: '>', value: n });
        } else if (val.startsWith('<=')) {
          const n = parseFloat(val.slice(2));
          if (!isNaN(n)) inlineFilters.push({ field, op: '<=', value: n });
        } else if (val.startsWith('<')) {
          const n = parseFloat(val.slice(1));
          if (!isNaN(n)) inlineFilters.push({ field, op: '<', value: n });
        } else {
          const n = parseFloat(val);
          if (!isNaN(n)) inlineFilters.push({ field, op: '=', value: n });
        }
        continue;
      }
    }
    // No colon — check if token is a bare numeric field name (means field > 0)
    const bareField = FIELD_LOOKUP.get(token.toLowerCase()) ?? null;
    if (bareField !== null) {
      inlineFilters.push({ field: bareField, op: '>', value: 0 });
      continue;
    }
    textTokens.push(token);
  }
  return { textTokens, inlineFilters };
}

// GET /api/eq/search?name=<text>&stats=long|short&min_hit=1&max_wt=10&...
// Inline syntax in name: str:5  str:>5  str:<10  str:5-10
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const name = req.query.name;
  const stats = req.query.stats;
  const statsCol = stats === 'long' ? 'long_stats' : 'short_stats';

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Parse inline filters out of the name param, then text-search remaining tokens
  if (name && typeof name === 'string' && name.trim()) {
    const { textTokens, inlineFilters } = parseInlineFilters(name);
    for (const word of textTokens) {
      const wordConds = TEXT_FIELDS.map(f => `\`${f}\` LIKE CONCAT('%', ?, '%')`).join(' OR ');
      conditions.push(`(${wordConds})`);
      params.push(...TEXT_FIELDS.map(() => word));
    }
    // Inline filters — use the exact operator parsed from the syntax
    for (const f of inlineFilters) {
      conditions.push(`\`${f.field}\` ${f.op} ?`);
      params.push(f.value);
    }
  }

  // Explicit numeric range filters: min_<field>, max_<field>, or exact <field>=N
  for (const [key, val] of Object.entries(req.query)) {
    if (key === 'name' || key === 'stats') continue;
    const value = parseFloat(val as string);
    if (isNaN(value)) continue;

    if (key.startsWith('min_')) {
      const field = key.slice(4);
      if (NUMERIC_FIELDS.has(field)) {
        conditions.push(`\`${field}\` >= ?`);
        params.push(value);
      }
    } else if (key.startsWith('max_')) {
      const field = key.slice(4);
      if (NUMERIC_FIELDS.has(field)) {
        conditions.push(`\`${field}\` <= ?`);
        params.push(value);
      }
    } else if (NUMERIC_FIELDS.has(key)) {
      conditions.push(`\`${key}\` = ?`);
      params.push(value);
    }
  }

  if (conditions.length === 0) {
    res.status(400).json({ error: 'At least one search parameter is required' });
    return;
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT \`name\`, \`${statsCol}\` FROM \`eq\` WHERE ${conditions.join(' AND ')} ORDER BY \`name\``,
      params
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
