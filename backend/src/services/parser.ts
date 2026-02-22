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
  effects?: string
  powers?: string
  crit?: string
  bonus?: string
  enchant?: string
  gearset?: string
  usable_by?: string
  s_spell?: string
  s_level?: number
  charge?: number
  max_charge?: number
  pick?: number
  break?: number
  holds?: number
  weightless?: number
  pages?: number
  armor?: number
  // Poison
  p_poison?: string
  p_level?: number
  p_apps?: number
  p_hits?: number
  // Instrument
  i_type?: string
  i_quality?: number
  i_stutter?: number
  i_min?: number
  // Spell focus
  sf_ele?: number
  sf_enc?: number
  sf_heal?: number
  sf_ill?: number
  sf_inv?: number
  sf_nat?: number
  sf_nec?: number
  sf_prot?: number
  sf_spi?: number
  sf_sum?: number
  // Weapon
  w_dice_count?: number
  w_dice?: number
  w_type?: string
  w_class?: string
  w_range?: string
  w_bonus?: string
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
  HITPOINTS: 'hp',       // alternate spelling (no underscore)
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
  // MAX_ prefix order
  MAX_STR: 'max_str',
  MAX_AGI: 'max_agi',
  MAX_DEX: 'max_dex',
  MAX_CON: 'max_con',
  MAX_POW: 'max_pow',
  MAX_INT: 'max_int',
  MAX_WIS: 'max_wis',
  MAX_CHA: 'max_cha',
  // _MAX suffix order (alternate game format)
  STR_MAX: 'max_str',
  AGI_MAX: 'max_agi',
  DEX_MAX: 'max_dex',
  CON_MAX: 'max_con',
  POW_MAX: 'max_pow',
  INT_MAX: 'max_int',
  WIS_MAX: 'max_wis',
  CHA_MAX: 'max_cha',
  LUCK: 'luck',
  KARMA: 'karma',
  AGE: 'age',
  WEIGHT: 'weight',
  HEIGHT: 'height',
  ARMOR: 'armor',
  MAGIC_RESISTANCE: 'mr',
  PSP: 'psp',
  SAVING_SPELL: 'sv_spell',
  SAVING_BREATH: 'sv_bre',
  SAVING_PARA: 'sv_para',
  SAVING_PETRI: 'sv_petri',
  SAVING_ROD: 'sv_rod',
  // Short-form saving throw variants
  SV_SPELL: 'sv_spell',
  SV_BRE: 'sv_bre',
  SV_BREATH: 'sv_bre',
  SV_PARA: 'sv_para',
  SV_PETRI: 'sv_petri',
  SV_ROD: 'sv_rod',
  // Spell focus
  SPELL_FOCUS_ELEMENTAL: 'sf_ele',
  SPELL_FOCUS_ENCHANTMENT: 'sf_enc',
  SPELL_FOCUS_HEALING: 'sf_heal',
  SPELL_FOCUS_ILLUSION: 'sf_ill',
  SPELL_FOCUS_INVOCATION: 'sf_inv',
  SPELL_FOCUS_NATURE: 'sf_nat',
  SPELL_FOCUS_NECROMANCY: 'sf_nec',
  SPELL_FOCUS_PROTECTION: 'sf_prot',
  SPELL_FOCUS_SPIRIT: 'sf_spi',
  SPELL_FOCUS_SUMMONING: 'sf_sum',
}

// Maps resist label text to db column
const RESIST_MAP: Record<string, keyof ParsedItem> = {
  fire: 'r_fire',
  cold: 'r_cold',
  acid: 'r_acid',
  electric: 'r_elect',
  elec: 'r_elect',
  elect: 'r_elect',
  poison: 'r_poison',
  sonic: 'r_sonic',
  slash: 'r_slash',
  bludgeon: 'r_bludgn',
  bludg: 'r_bludgn',
  bludgn: 'r_bludgn',
  pierce: 'r_pierce',
  ranged: 'r_ranged',
  range: 'r_ranged',
  spell: 'r_spell',
  unarmed: 'r_unarmd',
  unarmd: 'r_unarmd',
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

// Signals the end of a multi-line lookahead block (Called Effects)
const BLOCK_END_RE = /^(Name|Keyword|Item|Weight|AC-apply|Resists|Can affect|Affects|Effects|Special Effects|Enchantments|Powers|Usable by|Combat Crit|Combat Bonus|Gearset|Has \d|Level \d|This lockpick)/

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

    // Usable by: CLASS
    const usableMatch = line.match(/^Usable by:\s+(.+)/)
    if (usableMatch) { item.usable_by = usableMatch[1].trim(); continue }

    // Weight: X, Value: Y
    const wvMatch = line.match(/Weight:\s*(\d+),\s*Value:\s*(\d+)/)
    if (wvMatch) { item.wt = parseInt(wvMatch[1]); item.VALUE = parseInt(wvMatch[2]); continue }

    // AC-apply is X
    const acMatch = line.match(/AC-apply is\s+(-?\d+)/)
    if (acMatch) { item.ac = parseInt(acMatch[1]); continue }

    // Instrument: "Instrument Type: Lyre, Quality: 12, Stutter: 5, Min Level: 35"
    const instrMatch = line.match(/^Instrument Type:\s*(\S+),\s*Quality:\s*(\d+),\s*Stutter:\s*(\d+),\s*Min Level:\s*(\d+)/i)
    if (instrMatch) {
      item.i_type = instrMatch[1]
      item.i_quality = parseInt(instrMatch[2])
      item.i_stutter = parseInt(instrMatch[3])
      item.i_min = parseInt(instrMatch[4])
      continue
    }

    // Weapon type/class: "Type: Greatsword Class: Martial"
    const weapTypeMatch = line.match(/^Type:\s+(\S+)\s+Class:\s+(\S+)/)
    if (weapTypeMatch) { item.w_type = weapTypeMatch[1]; item.w_class = weapTypeMatch[2]; continue }

    // Weapon damage/crit: "Damage:  6D6  Crit Range: 6%  Crit Bonus: 2x"
    const diceMatch = line.match(/Damage:\s+(\d+)D(\d+)/i)
    const critRangeMatch = line.match(/Crit\s+Range:\s+(\d+)%/i)
    const critBonusMatch = line.match(/Crit\s+Bonus:\s+(\S+)/i)
    if (diceMatch || critRangeMatch || critBonusMatch) {
      if (diceMatch) { item.w_dice_count = parseInt(diceMatch[1]); item.w_dice = parseInt(diceMatch[2]) }
      if (critRangeMatch) item.w_range = critRangeMatch[1] + '%'
      if (critBonusMatch) item.w_bonus = critBonusMatch[1]
      continue
    }

    // Spellbook pages: "Total Pages: 350"
    const pagesMatch = line.match(/^Total Pages:\s*(\d+)/i)
    if (pagesMatch) { item.pages = parseInt(pagesMatch[1]); continue }

    // Container capacity: "Can hold X more lbs with Ylbs weightless." or "Can hold X more lbs."
    const holdsWithMatch = line.match(/^Can hold (\d+) more lbs with (\d+)\s*lbs weightless/i)
    if (holdsWithMatch) { item.holds = parseInt(holdsWithMatch[1]); item.weightless = parseInt(holdsWithMatch[2]); continue }
    const holdsOnlyMatch = line.match(/^Can hold (\d+) more lbs\.?$/i)
    if (holdsOnlyMatch) { item.holds = parseInt(holdsOnlyMatch[1]); continue }

    // Charges: "Has X charges, with Y charges left."
    const chargesMatch = line.match(/^Has (\d+) charges?, with (\d+) charges? left/i)
    if (chargesMatch) { item.max_charge = parseInt(chargesMatch[1]); item.charge = parseInt(chargesMatch[2]); continue }

    // Spell level: "Level X spell(s) of:" — spell name(s) on following line(s)
    const levelSpellsOfMatch = line.match(/^Level (\d+) spells? of:/i)
    if (levelSpellsOfMatch) {
      item.s_level = parseInt(levelSpellsOfMatch[1])
      const spellLines: string[] = []
      while (i + 1 < lines.length && !BLOCK_END_RE.test(lines[i + 1])) {
        spellLines.push(lines[++i])
      }
      item.s_spell = spellLines.join(' - ')
      continue
    }

    // Inline spell level: "Level X <spell name>" (some scroll/item formats)
    const levelInlineMatch = line.match(/^Level (\d+) (?!charges?)(.+)/i)
    if (levelInlineMatch) {
      item.s_level = parseInt(levelInlineMatch[1])
      item.s_spell = levelInlineMatch[2].trim()
      continue
    }

    // Poison: "Poison affects as blindness at level 25."
    const poisonMatch = line.match(/^Poison affects as (.+?) at level (\d+)/i)
    if (poisonMatch) { item.p_poison = poisonMatch[1].trim(); item.p_level = parseInt(poisonMatch[2]); continue }

    // Poison applications: "5 applications remaining with 5 hits per application."
    const poisonAppsMatch = line.match(/^(\d+) applications? remaining with (\d+) hits? per application/i)
    if (poisonAppsMatch) { item.p_apps = parseInt(poisonAppsMatch[1]); item.p_hits = parseInt(poisonAppsMatch[2]); continue }

    // Lockpick: "This lockpick has a X% bonus chance to successfully pick a lock."
    const pickMatch = line.match(/^This lockpick has a (\d+)% bonus chance/i)
    if (pickMatch) { item.pick = parseInt(pickMatch[1]); continue }

    // Break chance: "This X has a Y% chance to break."
    const breakMatch = line.match(/^This \w+ has a (\d+)% chance to break/i)
    if (breakMatch) { item['break'] = parseInt(breakMatch[1]); continue }

    // Resists: parse next line(s) with "Label : X%"
    if (/^Resists:/.test(line)) {
      let resistText = line.replace(/^Resists:/, '')
      while (i + 1 < lines.length && /[A-Za-z]+\s*:\s*-?\d+%/.test(lines[i + 1])) {
        resistText += ' ' + lines[++i]
      }
      parseResists(resistText, item)
      continue
    }

    // Affects : KEYWORD by VALUE  (case-insensitive "by"; handles "By" variant)
    const affectMatch = line.match(/^Affects\s*:\s*(\S+)\s+by\s+(-?\d+)/i)
    if (affectMatch) {
      const col = AFFECT_MAP[affectMatch[1].toUpperCase()]
      if (col) (item as Record<string, unknown>)[col] = parseInt(affectMatch[2])
      continue
    }

    // Effects / Special Effects: "Effects : 'name'" or "Special Effects : Name"
    const effectsMatch = line.match(/^(?:Special\s+)?Effects\s*:\s*(.+)/)
    if (effectsMatch) { item.effects = effectsMatch[1].trim(); continue }

    // Powers: Name of Power
    const powersMatch = line.match(/^Powers:\s*(.+)/)
    if (powersMatch) { item.powers = powersMatch[1].trim(); continue }

    // Combat Crit: Name
    const critMatch = line.match(/^Combat Crit:\s*(.+)/)
    if (critMatch) { item.crit = critMatch[1].trim(); continue }

    // Combat Bonus: description
    const bonusMatch = line.match(/^Combat Bonus:\s*(.+)/)
    if (bonusMatch) { item.bonus = bonusMatch[1].trim(); continue }

    // Gearset Proc: spell1 - spell2 - ...
    const gearsetMatch = line.match(/^Gearset(?:\s+Proc)?:\s*(.+)/)
    if (gearsetMatch) { item.gearset = gearsetMatch[1].trim(); continue }

    // Called Effects : (invoked by 'say'ing them)
    if (/^Called Effects/.test(line)) {
      const calledLines: string[] = []
      while (i + 1 < lines.length && !BLOCK_END_RE.test(lines[i + 1])) {
        calledLines.push(lines[++i])
      }
      item.called = calledLines.join('\n').trim()
      continue
    }
  }

  // Post-process item_flags: strip all occurrences of NOBITS and TWOHANDS
  // If TWOHANDS was present, append " 2H" to worn slot
  if (item.item_flags) {
    const hasTwoHands = item.item_flags.includes('TWOHANDS')
    item.item_flags = (item.item_flags
      .replace(/TWOHANDS/g, '')
      .replace(/NOBITS/g, '')
      .replace(/\s+/g, ' ')
      .trim()) || 'NOBITS'
    if (hasTwoHands && item.worn) {
      item.worn = item.worn.trim() + ' 2H'
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
