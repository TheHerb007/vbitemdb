/**
 * Generates short_stats and long_stats strings matching the eq table format.
 */
import { ParsedItem } from './parser';

export interface ItemMeta {
  zone?: string
  load?: string
  quest?: string
}

// Stat fields: [column, label] — does NOT include hit/dam (handled separately)
const STAT_LABELS: Array<[keyof ParsedItem, string]> = [
  ['ac', 'AC'],
  ['armor', 'Armor'],
  ['hp', 'Hp'],
  ['mana', 'Mana'],
  ['move', 'Move'],
  ['str', 'Str'],
  ['agi', 'Agi'],
  ['dex', 'Dex'],
  ['con', 'Con'],
  ['POW', 'Pow'],
  ['int', 'Int'],
  ['wis', 'Wis'],
  ['cha', 'Cha'],
  ['max_str', 'MaxStr'],
  ['max_agi', 'MaxAgi'],
  ['max_dex', 'MaxDex'],
  ['max_con', 'MaxCon'],
  ['max_pow', 'MaxPow'],
  ['max_int', 'MaxInt'],
  ['max_wis', 'MaxWis'],
  ['max_cha', 'MaxCha'],
  ['luck', 'Luck'],
  ['karma', 'Karma'],
  ['age', 'Age'],
  ['weight', 'Weight'],
  ['height', 'Height'],
  ['mr', 'MR'],
  ['psp', 'Psp'],
  ['sv_spell', 'SvSp'],
  ['sv_bre', 'SvBr'],
  ['sv_para', 'SvPa'],
  ['sv_petri', 'SvPe'],
  ['sv_rod', 'SvRo'],
  ['sf_ele', 'SfEle'],
  ['sf_enc', 'SfEnc'],
  ['sf_heal', 'SfHeal'],
  ['sf_ill', 'SfIll'],
  ['sf_inv', 'SfInv'],
  ['sf_nat', 'SfNat'],
  ['sf_nec', 'SfNec'],
  ['sf_prot', 'SfProt'],
  ['sf_spi', 'SfSpi'],
  ['sf_sum', 'SfSum'],
]

const RESIST_LABELS: Array<[keyof ParsedItem, string]> = [
  ['r_fire', 'Fire'],
  ['r_cold', 'Cold'],
  ['r_acid', 'Acid'],
  ['r_elect', 'Elect'],
  ['r_poison', 'Poison'],
  ['r_sonic', 'Sonic'],
  ['r_slash', 'Slash'],
  ['r_bludgn', 'Bludgn'],
  ['r_pierce', 'Pierce'],
  ['r_ranged', 'Ranged'],
  ['r_spell', 'Spell'],
  ['r_unarmd', 'Unarmd'],
  ['r_pos', 'Pos'],
  ['r_neg', 'Neg'],
  ['r_psi', 'Psi'],
  ['r_mental', 'Mental'],
  ['r_good', 'Good'],
  ['r_evil', 'Evil'],
  ['r_law', 'Law'],
  ['r_chaos', 'Chaos'],
  ['r_force', 'Force'],
]

// Types that display a label in short_stats
const TYPE_SHORT: Record<string, string> = {
  LIQUID_CONT: 'DRINK',
  SCROLL: 'SCROLL',
  WAND: 'WAND',
  STAFF: 'STAFF',
  POTION: 'POTION',
  FOOD: 'FOOD',
  LIGHT: 'LIGHT',
  SUMMON: 'SUMMON',
  NOTE: 'NOTE',
  TRASH: 'TRASH',
}

// NO-X class flags → display name
const CLASS_NO: Record<string, string> = {
  'NO-WARRIOR': 'FIGHTER',
  'NO-CLERIC': 'PRIEST',
  'NO-THIEF': 'THIEF',
  'NO-MAGE': 'MAGE',
}

// ANTI-X class flags → display name
const CLASS_ANTI: Record<string, string> = {
  'ANTI-WARRIOR': 'FIGHTER',
  'ANTI-CLERIC': 'PRIEST',
  'ANTI-THIEF': 'THIEF',
  'ANTI-MAGE': 'MAGE',
  'ANTI-RANGER': 'RANGER',
  'ANTI-PALADIN': 'PALADIN',
  'ANTI-BARD': 'BARD',
  'ANTI-DRUID': 'DRUID',
  'ANTI-SHAMAN': 'SHAMAN',
  'ANTI-PSIONICIST': 'PSIONICIST',
  'ANTI-ELEMENTALIST': 'ELEMENTALIST',
  'ANTI-ENCHANTER': 'ENCHANTER',
  'ANTI-ILLUSIONIST': 'ILLUSIONIST',
  'ANTI-INVOKER': 'INVOKER',
  'ANTI-NECROMANCER': 'NECROMANCER',
  'ANTI-BLACKGUARD': 'BLACKGUARD',
}

// Race/gender ANTI-X flags (displayed as !X)
const RACE_GENDER_FLAGS = new Set([
  'ANTI-BARBARIAN', 'ANTI-DROW', 'ANTI-DROWELF', 'ANTI-DUERGAR',
  'ANTI-DWARF', 'ANTI-GNOME', 'ANTI-GREYELF', 'ANTI-HALFELF',
  'ANTI-HALFLING', 'ANTI-HALFORC', 'ANTI-HUMAN', 'ANTI-ILLITHID',
  'ANTI-LICH', 'ANTI-OGRE', 'ANTI-ORC', 'ANTI-TROLL', 'ANTI-YUANTI',
  'ANTI-MALE', 'ANTI-FEMALE', 'ANTI-PLAYER',
])

// Alignment ANTI-X flags
const ALIGN_FLAGS = ['ANTI-GOOD', 'ANTI-NEUTRAL', 'ANTI-EVIL']
const ALIGN_NAMES: Record<string, string> = {
  'ANTI-GOOD': 'GOOD',
  'ANTI-NEUTRAL': 'NEUTRAL',
  'ANTI-EVIL': 'EVIL',
}

// Non-class, non-race item_flags hidden from short_stats
const ITEM_FLAGS_HIDDEN = new Set([
  'MAGIC', 'BLESS', 'NOBURN', 'NOSELL', 'NORENT', 'NOLOCATE', 'NOTAKE',
  'NODROP', 'NO-DROP', 'NO-PC', 'NO-PLAYER', 'AGRESSIVE', 'SONIC',
  'TRANSIENT', 'STATS-UNKNOWN', 'NOBITS', 'DARK', 'SECRET', 'KEEN',
  'INVISIBLE', 'WATERBREATH',
])

// Affect flags substitutions for display
const AFFECT_FLAG_SUB: Record<string, string> = {
  'NOSLEEP': '!SLEEP',
  'NOCHARM': '!CHARM',
  'NOBITS': '',
}

// The 4 main classes tracked for X-ONLY display
const MAIN_CLASS_NO_FLAGS = Object.keys(CLASS_NO)

function formatValue(val: number): string {
  if (!val) return '0'
  if (val >= 1000) return `${Math.round(val / 1000)}p`
  if (val >= 100) return `${Math.round(val / 100)}g`
  return `${val}`
}

function buildStatFields(item: Record<string, unknown>): string {
  return STAT_LABELS
    .filter(([col]) => {
      const v = item[col as string]
      return v != null && v !== 0
    })
    .map(([col, label]) => `${label}:${item[col as string]}`)
    .join(' ')
}

function buildResists(item: Record<string, unknown>): string {
  return RESIST_LABELS
    .filter(([col]) => {
      const v = item[col as string]
      return v != null && v !== 0
    })
    .map(([col, label]) => `${label}:${item[col as string]}%`)
    .join(' ')
}

function buildAffectDisplay(affectFlags: string): string {
  if (!affectFlags || affectFlags === 'NOBITS') return ''
  return affectFlags.split(' ')
    .filter(Boolean)
    .map(f => f in AFFECT_FLAG_SUB ? AFFECT_FLAG_SUB[f] : f)
    .filter(Boolean)
    .join(' ')
}

function buildClassAlignFlags(itemFlags: string): { visibleFlags: string; classAlignFlags: string } {
  if (!itemFlags || itemFlags === 'NOBITS') return { visibleFlags: '', classAlignFlags: '' }

  const flags = itemFlags.split(' ').filter(Boolean)

  // Alignment restrictions
  const restrictedAligns = flags.filter(f => ALIGN_FLAGS.includes(f))
  const allowedAligns = ALIGN_FLAGS.filter(f => !restrictedAligns.includes(f))

  // Class restrictions via NO-X
  const restrictedNoFlags = flags.filter(f => f in CLASS_NO)
  const restrictedNoNames = restrictedNoFlags.map(f => CLASS_NO[f])

  // Class restrictions via ANTI-X
  const restrictedAntiClassFlags = flags.filter(f => f in CLASS_ANTI)
  const restrictedAntiClassNames = restrictedAntiClassFlags.map(f => CLASS_ANTI[f])

  // All restricted class names
  const allRestrictedClassNames = [...new Set([...restrictedNoNames, ...restrictedAntiClassNames])]

  // Race/gender restrictions
  const raceGenderFlags = flags.filter(f => RACE_GENDER_FLAGS.has(f))
  const racePart = raceGenderFlags.map(f => '!' + f.replace('ANTI-', '')).join(' ')

  // Alignment display
  let alignPrefix = ''
  let alignIndividual = ''
  if (restrictedAligns.length >= 2 && allowedAligns.length === 1) {
    alignPrefix = ALIGN_NAMES[allowedAligns[0]] + '-'
  } else if (restrictedAligns.length === 1) {
    alignIndividual = '!' + ALIGN_NAMES[restrictedAligns[0]]
  }

  // Class display
  let classPart = ''
  const mainRestrictedCount = restrictedNoFlags.filter(f => MAIN_CLASS_NO_FLAGS.includes(f)).length
  if (mainRestrictedCount >= 3) {
    // Only one main class left → X-ONLY
    const mainAllowed = MAIN_CLASS_NO_FLAGS
      .filter(f => !restrictedNoFlags.includes(f))
      .map(f => CLASS_NO[f])
    if (mainAllowed.length === 1) {
      classPart = mainAllowed[0] + '-ONLY'
    } else {
      classPart = allRestrictedClassNames.map(c => '!' + c).join(' ')
    }
  } else if (allRestrictedClassNames.length > 0) {
    classPart = allRestrictedClassNames.map(c => '!' + c).join(' ')
  }

  // Visible non-class/align/race flags (FLOAT, GLOW, etc.)
  const visibleFlagList = flags.filter(f =>
    !ALIGN_FLAGS.includes(f) &&
    !(f in CLASS_NO) &&
    !(f in CLASS_ANTI) &&
    !RACE_GENDER_FLAGS.has(f) &&
    !ITEM_FLAGS_HIDDEN.has(f)
  )
  const visibleFlags = visibleFlagList.join(' ')

  // Build class/align flags segment
  const classAlignParts: string[] = []
  if (alignPrefix) {
    classAlignParts.push(racePart, alignPrefix + classPart)
  } else {
    if (alignIndividual) classAlignParts.push(alignIndividual)
    if (racePart) classAlignParts.push(racePart)
    if (classPart) classAlignParts.push(classPart)
  }
  const classAlignFlags = classAlignParts.filter(Boolean).join(' ')

  return { visibleFlags, classAlignFlags }
}

export function generateStats(item: ParsedItem & ItemMeta): { short_stats: string; long_stats: string } {
  const zone = item.zone || ''
  const load = item.load || 'N'
  const quest = item.quest || ''

  const rec = item as Record<string, unknown>
  const isWeapon = item.TYPE === 'WEAPON' || item.w_dice_count != null
  const isContainer = item.TYPE === 'CONTAINER'
  const isInstrument = item.TYPE === 'INSTRUMENT'

  const wornRaw = item.worn || ''
  const wornDisplay = (wornRaw && wornRaw !== 'NOBITS')
    ? `(${wornRaw.split(' ').join(', ')})`
    : ''

  const statFields = buildStatFields(rec)
  const resists = buildResists(rec)
  const affectDisplay = buildAffectDisplay(item.affect_flags || '')
  const { visibleFlags, classAlignFlags } = buildClassAlignFlags(item.item_flags || '')

  // hit/dam compact pair for non-weapons
  const hit = (item.hit ?? 0) as number
  const dam = (item.dam ?? 0) as number
  const hitDamCompact = (!isWeapon && (hit !== 0 || dam !== 0)) ? `${hit}/${dam}` : ''

  const valShort = formatValue((item.VALUE ?? 0) as number)

  // Zone: hide load for N and C
  const showLoad = load && load !== 'N' && load !== 'C'
  const zoneShort = zone ? (showLoad ? `${zone} (${load})` : zone) : ''
  const zoneLong = zone ? `${zone} (${load})` : ''

  const today = new Date().toISOString().slice(0, 10)

  // ── Short stats ─────────────────────────────────────────────────────────
  const shortParts: string[] = []

  shortParts.push([item.name, wornDisplay].filter(Boolean).join(' '))

  if (item.TYPE && TYPE_SHORT[item.TYPE]) {
    shortParts.push(TYPE_SHORT[item.TYPE])
  }

  if (isContainer && item.holds != null) {
    shortParts.push(`CONTAINER (${item.holds} lbs)`)
  }

  if (isInstrument && item.i_type) {
    shortParts.push(`INSTRUMENT (${item.i_type}: Quality ${item.i_quality ?? 0}, Stutter ${item.i_stutter ?? 0})`)
  }

  if (isWeapon) {
    const w: string[] = []
    if (item.w_dice_count && item.w_dice) w.push(`${item.w_dice_count}D${item.w_dice}`)
    w.push(`${hit}/${dam}`)
    if (item.w_range && item.w_bonus) w.push(`${item.w_range}/${item.w_bonus}`)
    shortParts.push(w.join(' '))
  }

  const shortStatLine = [statFields, hitDamCompact].filter(Boolean).join(' ')
  if (shortStatLine) shortParts.push(shortStatLine)

  if (resists) shortParts.push(resists)
  if (affectDisplay) shortParts.push(affectDisplay)
  if (item.powers) shortParts.push(`Powers: ${item.powers}`)
  if (item.gearset) shortParts.push(`Proc: ${item.gearset}`)
  if (visibleFlags) shortParts.push(visibleFlags)
  if (classAlignFlags) shortParts.push(classAlignFlags)

  shortParts.push(`Wt:${item.wt ?? 0} Val:${valShort}`)

  if (quest === 'X') shortParts.push('QUEST-ITEM')
  if (zoneShort) shortParts.push(zoneShort)

  const short_stats = shortParts.join(' * ')

  // ── Long stats ───────────────────────────────────────────────────────────
  const longParts: string[] = []

  const kw = item.keywords ? `(${item.keywords})` : ''
  longParts.push([item.name, kw].filter(Boolean).join(' '))

  const wornLong = item.worn || 'NOBITS'
  longParts.push(`${item.TYPE || 'UNKNOWN'} (${wornLong})`)

  if (item.holds != null) longParts.push(`Holds:${item.holds}`)

  longParts.push(`Wt:${item.wt ?? 0} Val:${item.VALUE ?? 0}`)

  if (isWeapon) {
    const wl: string[] = []
    if (item.w_type && item.w_class) wl.push(`Type:${item.w_type} Class:${item.w_class}`)
    if (item.w_dice_count && item.w_dice) wl.push(`Dice:${item.w_dice_count}D${item.w_dice}`)
    if (item.hit != null) wl.push(`Hit:${item.hit}`)
    if (item.dam != null) wl.push(`Dam:${item.dam}`)
    if (item.w_range) wl.push(`CritRange:${item.w_range}`)
    if (item.w_bonus) wl.push(`CritBonus:${item.w_bonus}`)
    if (wl.length) longParts.push(wl.join(' '))
  }

  // Stat fields for long (include hit/dam for non-weapons)
  const longStatParts = STAT_LABELS
    .filter(([col]) => {
      const v = rec[col as string]
      return v != null && v !== 0
    })
    .map(([col, label]) => `${label}:${rec[col as string]}`)

  if (!isWeapon) {
    if (hit !== 0) longStatParts.push(`Hit:${hit}`)
    if (dam !== 0) longStatParts.push(`Dam:${dam}`)
  }

  if (longStatParts.length) longParts.push(longStatParts.join(' '))

  if (resists) longParts.push(resists)
  if (item.powers) longParts.push(`Powers: ${item.powers}`)
  if (item.gearset) longParts.push(`Proc: ${item.gearset}`)

  longParts.push(item.item_flags || 'NOBITS')

  if (item.affect_flags && item.affect_flags !== 'NOBITS') {
    longParts.push(item.affect_flags)
  }

  if (quest === 'X') longParts.push('QUEST-ITEM')
  if (zoneLong) longParts.push(zoneLong)

  longParts.push(today)

  const long_stats = longParts.join(' * ')

  return { short_stats, long_stats }
}
