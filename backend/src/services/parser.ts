/**
 * Parses the TorilMUD item text format into a neweq row object.
 */

export interface ParsedItem {
  name?: string
  keywords?: string
  TYPE?: string
  worn?: string
  affect_flags?: string
  item_flags?: string
  wt?: number
  VALUE?: number
  ac?: number
  called?: string
  // Affects
  hit?: number
  dam?: number
  hp?: number
  mana?: number
  move?: number
  str?: number
  agi?: number
  dex?: number
  con?: number
  POW?: number
  int?: number
  wis?: number
  cha?: number
  max_str?: number
  max_agi?: number
  max_dex?: number
  max_con?: number
  max_pow?: number
  max_int?: number
  max_wis?: number
  max_cha?: number
  luck?: number
  karma?: number
  age?: number
  weight?: number
  height?: number
  mr?: number
  psp?: number
  sv_spell?: number
  sv_bre?: number
  sv_para?: number
  sv_petri?: number
  sv_rod?: number
  // Resists
  r_fire?: number
  r_cold?: number
  r_acid?: number
  r_elect?: number
  r_poison?: number
  r_sonic?: number
  r_slash?: number
  r_bludgn?: number
  r_pierce?: number
  r_ranged?: number
  r_spell?: number
  r_unarmd?: number
  r_pos?: number
  r_neg?: number
  r_psi?: number
  r_mental?: number
  r_good?: number
  r_evil?: number
  r_law?: number
  r_chaos?: number
  r_force?: number
}

// Maps "Affects : KEYWORD" to the db column name
const AFFECT_MAP: Record<string, keyof ParsedItem> = {
  HITROLL: 'hit',
  DAMROLL: 'dam',
  HIT_POINTS: 'hp',
  MANA: 'mana',
  MOVE: 'move',
  STR: 'str',
  AGI: 'agi',
  DEX: 'dex',
  CON: 'con',
  POW: 'POW',
  INT: 'int',
  WIS: 'wis',
  CHA: 'cha',
  MAX_STR: 'max_str',
  MAX_AGI: 'max_agi',
  MAX_DEX: 'max_dex',
  MAX_CON: 'max_con',
  MAX_POW: 'max_pow',
  MAX_INT: 'max_int',
  MAX_WIS: 'max_wis',
  MAX_CHA: 'max_cha',
  LUCK: 'luck',
  KARMA: 'karma',
  AGE: 'age',
  WEIGHT: 'weight',
  HEIGHT: 'height',
  MAGIC_RESISTANCE: 'mr',
  PSP: 'psp',
  SAVING_SPELL: 'sv_spell',
  SAVING_BREATH: 'sv_bre',
  SAVING_PARA: 'sv_para',
  SAVING_PETRI: 'sv_petri',
  SAVING_ROD: 'sv_rod',
}

// Maps resist label text to db column
const RESIST_MAP: Record<string, keyof ParsedItem> = {
  fire: 'r_fire',
  cold: 'r_cold',
  acid: 'r_acid',
  electric: 'r_elect',
  elec: 'r_elect',
  poison: 'r_poison',
  sonic: 'r_sonic',
  slash: 'r_slash',
  bludgeon: 'r_bludgn',
  bludg: 'r_bludgn',
  pierce: 'r_pierce',
  ranged: 'r_ranged',
  spell: 'r_spell',
  unarmed: 'r_unarmd',
  positive: 'r_pos',
  pos: 'r_pos',
  negative: 'r_neg',
  neg: 'r_neg',
  psi: 'r_psi',
  mental: 'r_mental',
  good: 'r_good',
  evil: 'r_evil',
  law: 'r_law',
  chaos: 'r_chaos',
  force: 'r_force',
}

export function parseItemText(raw: string): ParsedItem {
  const item: ParsedItem = {}
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Name 'item name here'
    const nameMatch = line.match(/^Name\s+'(.+)'/)
    if (nameMatch) { item.name = nameMatch[1]; continue }

    // Keyword 'kw1 kw2', Item type: TYPE
    const kwMatch = line.match(/^Keyword\s+'([^']+)'/)
    if (kwMatch) item.keywords = kwMatch[1]
    const typeMatch = line.match(/Item type:\s+(\S+)/)
    if (typeMatch) item.TYPE = typeMatch[1]
    if (kwMatch || typeMatch) continue

    // Item can be worn on: LOCATIONS
    const wornMatch = line.match(/^Item can be worn on:\s+(.+)/)
    if (wornMatch) { item.worn = wornMatch[1].trim(); continue }

    // Item will give you following abilities: FLAGS
    const abilMatch = line.match(/^Item will give you following abilities:\s+(.+)/)
    if (abilMatch) { item.affect_flags = abilMatch[1].trim(); continue }

    // Item is: FLAGS
    const flagsMatch = line.match(/^Item is:\s+(.+)/)
    if (flagsMatch) { item.item_flags = flagsMatch[1].trim(); continue }

    // Weight: X, Value: Y
    const wvMatch = line.match(/Weight:\s*(\d+),\s*Value:\s*(\d+)/)
    if (wvMatch) { item.wt = parseInt(wvMatch[1]); item.VALUE = parseInt(wvMatch[2]); continue }

    // AC-apply is X
    const acMatch = line.match(/AC-apply is\s+(-?\d+)/)
    if (acMatch) { item.ac = parseInt(acMatch[1]); continue }

    // Resists: parse next line(s) with "Label : X%"
    if (/^Resists:/.test(line)) {
      // Resists may be on the same line or subsequent lines
      // Collect all text after "Resists:" until a non-resist line
      let resistText = line.replace(/^Resists:/, '')
      // Look ahead for continuation lines
      while (i + 1 < lines.length && /[A-Za-z]+\s*:\s*\d+%/.test(lines[i + 1])) {
        resistText += ' ' + lines[++i]
      }
      parseResists(resistText, item)
      continue
    }

    // Affects : KEYWORD by VALUE
    const affectMatch = line.match(/^Affects\s*:\s*(\S+)\s+by\s+(-?\d+)/)
    if (affectMatch) {
      const col = AFFECT_MAP[affectMatch[1].toUpperCase()]
      if (col) (item as Record<string, unknown>)[col] = parseInt(affectMatch[2])
      continue
    }

    // Called Effects : (invoked by 'say'ing them)
    if (/^Called Effects/.test(line)) {
      const calledLines: string[] = []
      while (i + 1 < lines.length && !/^(Name|Keyword|Item|Weight|AC-apply|Resists|Can affect|Affects)/.test(lines[i + 1])) {
        calledLines.push(lines[++i])
      }
      item.called = calledLines.join('\n').trim()
      continue
    }
  }

  return item
}

function parseResists(text: string, item: ParsedItem) {
  // Matches patterns like: "Fire  :    5%"
  const pattern = /([A-Za-z]+)\s*:\s*(-?\d+)%/g
  let m
  while ((m = pattern.exec(text)) !== null) {
    const col = RESIST_MAP[m[1].toLowerCase()]
    if (col) (item as Record<string, unknown>)[col] = parseInt(m[2])
  }
}
