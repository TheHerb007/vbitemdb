import { useState, useEffect, useRef } from 'react'

interface EqResult {
  name: string
  long_stats?: string
}

interface SearchResponse {
  results: EqResult[]
}

interface PendingItem {
  name: string
  TYPE?: string
  worn?: string
  wt?: number
  VALUE?: number
  ac?: number
  hit?: number
  dam?: number
  keywords?: string
  long_stats?: string
  duplicate?: boolean
}

// ── Filter Groups ─────────────────────────────────────────────────────────────

const FILTER_GROUPS = [
  { title: 'Combat', fields: [
    { field: 'hit',   label: 'Hitroll' },
    { field: 'dam',   label: 'Damroll' },
    { field: 'armor', label: 'Armor' },
    { field: 'ac',    label: 'AC' },
    { field: 'hp',    label: 'HP' },
    { field: 'mana',  label: 'Mana' },
    { field: 'move',  label: 'Move' },
    { field: 'mr',    label: 'Magic Resist' },
  ]},
  { title: 'Stats', fields: [
    { field: 'str', label: 'STR' },
    { field: 'agi', label: 'AGI' },
    { field: 'dex', label: 'DEX' },
    { field: 'con', label: 'CON' },
    { field: 'POW', label: 'POW' },
    { field: 'int', label: 'INT' },
    { field: 'wis', label: 'WIS' },
    { field: 'cha', label: 'CHA' },
  ]},
  { title: 'Max Stats', fields: [
    { field: 'max_str', label: 'Max STR' },
    { field: 'max_agi', label: 'Max AGI' },
    { field: 'max_dex', label: 'Max DEX' },
    { field: 'max_con', label: 'Max CON' },
    { field: 'max_pow', label: 'Max POW' },
    { field: 'max_int', label: 'Max INT' },
    { field: 'max_wis', label: 'Max WIS' },
    { field: 'max_cha', label: 'Max CHA' },
  ]},
  { title: 'Saves', fields: [
    { field: 'sv_spell', label: 'vs Spell' },
    { field: 'sv_bre',   label: 'vs Breath' },
    { field: 'sv_para',  label: 'vs Paralysis' },
    { field: 'sv_petri', label: 'vs Petrification' },
    { field: 'sv_rod',   label: 'vs Rod/Staff' },
  ]},
  { title: 'Spell Focus', fields: [
    { field: 'sf_ele',  label: 'Elemental' },
    { field: 'sf_enc',  label: 'Enchantment' },
    { field: 'sf_heal', label: 'Healing' },
    { field: 'sf_ill',  label: 'Illusion' },
    { field: 'sf_inv',  label: 'Invocation' },
    { field: 'sf_nat',  label: 'Nature' },
    { field: 'sf_nec',  label: 'Necromancy' },
    { field: 'sf_prot', label: 'Protection' },
    { field: 'sf_spi',  label: 'Spirit' },
    { field: 'sf_sum',  label: 'Summoning' },
  ]},
  { title: 'Resists (Physical)', fields: [
    { field: 'r_unarmd', label: 'Unarmed' },
    { field: 'r_slash',  label: 'Slash' },
    { field: 'r_bludgn', label: 'Bludgeon' },
    { field: 'r_pierce', label: 'Pierce' },
    { field: 'r_ranged', label: 'Ranged' },
  ]},
  { title: 'Resists (Magical)', fields: [
    { field: 'r_spell',  label: 'Spell' },
    { field: 'r_sonic',  label: 'Sonic' },
    { field: 'r_fire',   label: 'Fire' },
    { field: 'r_cold',   label: 'Cold' },
    { field: 'r_elect',  label: 'Electric' },
    { field: 'r_acid',   label: 'Acid' },
    { field: 'r_poison', label: 'Poison' },
  ]},
  { title: 'Resists (Alignment/Psionic)', fields: [
    { field: 'r_pos',    label: 'Positive' },
    { field: 'r_neg',    label: 'Negative' },
    { field: 'r_psi',    label: 'Psionic' },
    { field: 'r_mental', label: 'Mental' },
    { field: 'r_good',   label: 'Good' },
    { field: 'r_evil',   label: 'Evil' },
    { field: 'r_law',    label: 'Lawful' },
    { field: 'r_chaos',  label: 'Chaotic' },
    { field: 'r_force',  label: 'Force' },
  ]},
  { title: 'Misc', fields: [
    { field: 'luck',   label: 'Luck' },
    { field: 'karma',  label: 'Karma' },
    { field: 'psp',    label: 'PSP' },
    { field: 'age',    label: 'Age' },
    { field: 'weight', label: 'Weight Mod' },
    { field: 'height', label: 'Height Mod' },
    { field: 'wt',     label: 'Item Weight' },
    { field: 'VALUE',  label: 'Gold Value' },
    { field: 'pages',  label: 'Pages' },
  ]},
  { title: 'Weapon', fields: [
    { field: 'w_dice_count', label: 'Dice Count' },
    { field: 'w_dice',       label: 'Dice Sides' },
    { field: 's_level',      label: 'Scroll/Wand Level' },
    { field: 'charge',       label: 'Charges' },
    { field: 'max_charge',   label: 'Max Charges' },
  ]},
  { title: 'Instrument', fields: [
    { field: 'i_quality', label: 'Quality' },
    { field: 'i_stutter', label: 'Stutter' },
    { field: 'i_min',     label: 'Min Level' },
  ]},
  { title: 'Container', fields: [
    { field: 'holds',      label: 'Max Weight (lbs)' },
    { field: 'weightless', label: 'Weightless' },
    { field: 'pick',       label: 'Pick Bonus' },
  ]},
  { title: 'Poison', fields: [
    { field: 'p_level', label: 'Poison Level' },
    { field: 'p_apps',  label: 'Applications' },
    { field: 'p_hits',  label: 'Hits' },
  ]},
]

// ── Help Modal ────────────────────────────────────────────────────────────────

function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal help-modal">
        <div className="modal-header">
          <h2 className="modal-title">Search Help</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="help-section">
          <div className="help-section-title">Text Search</div>
          <p className="help-prose">
            Type one or more keywords in the search box. Every keyword must match — but they can appear in any order and in any of the following fields:
          </p>
          <div className="help-text-fields">
            {['name','keywords','zone','load','quest','no_id','bound','TYPE','worn',
              'w_type','w_class','w_range','w_bonus','p_poison','enchant','crit',
              'bonus','effects','called','powers','gearset','s_spell','item_flags',
              'affect_flags','usable_by'].map(f => (
              <span key={f} className="help-tag">{f}</span>
            ))}
          </div>
          <p className="help-prose help-example">
            Example: <em>"paws cheetah"</em> finds "the paws of the cheetah" because both words appear somewhere in the item's fields.
          </p>
        </div>

        <div className="help-section">
          <div className="help-section-title">Inline Numeric Filters</div>
          <p className="help-prose">
            Add stat constraints directly in the search box using <code className="help-code">field:value</code> syntax.
            These can be combined freely with text keywords.
          </p>
          <div className="help-inline-table">
            <div className="help-inline-row"><span className="help-code">str:5</span><span>STR = 5 (exactly 5)</span></div>
            <div className="help-inline-row"><span className="help-code">str:&gt;5</span><span>STR &gt; 5 (strictly greater than 5)</span></div>
            <div className="help-inline-row"><span className="help-code">str:&gt;=5</span><span>STR &ge; 5 (at least 5)</span></div>
            <div className="help-inline-row"><span className="help-code">str:&lt;10</span><span>STR &lt; 10 (strictly less than 10)</span></div>
            <div className="help-inline-row"><span className="help-code">str:&lt;=10</span><span>STR &le; 10 (at most 10)</span></div>
            <div className="help-inline-row"><span className="help-code">str:5-10</span><span>STR between 5 and 10 (inclusive range)</span></div>
          </div>
          <p className="help-prose help-example">
            Example: <em>"cheetah str:&gt;=3 hit:&gt;2"</em> — finds items matching "cheetah" with STR &ge; 3 and HITROLL &gt; 2.
          </p>
          <p className="help-prose">
            Any field listed in the Numeric Filters section below can be used inline. The Filters panel and inline syntax can be used simultaneously.
          </p>
        </div>

        <div className="help-section">
          <div className="help-section-title">Numeric Filters</div>
          <p className="help-prose">
            Use the <strong>Filters</strong> panel below the search box to add min/max constraints on any numeric field.
            Text search and numeric filters can be combined — all active conditions must match.
            Leave min or max blank to apply only one bound.
          </p>
          {FILTER_GROUPS.map(group => (
            <div key={group.title} className="help-group">
              <div className="help-group-title">{group.title}</div>
              <div className="help-field-list">
                {group.fields.map(({ field, label }) => (
                  <div key={field} className="help-field-row">
                    <span className="help-field-name">{field}</span>
                    <span className="help-field-desc">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Zone Select ──────────────────────────────────────────────────────────────

function ZoneSelect({ zones, value, onChange }: { zones: string[]; value: string; onChange: (v: string) => void }) {
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const display = value || ''
  const filtered = filter
    ? zones.filter(z => z.toLowerCase().includes(filter.toLowerCase()))
    : zones

  const select = (z: string) => {
    onChange(z)
    setFilter('')
    setOpen(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="zone-select-wrap" ref={containerRef}>
      <div
        className={`zone-select-trigger${open ? ' zone-select-open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="zone-select-value">{display || '— Select zone —'}</span>
        <span className="zone-select-arrow">▾</span>
      </div>
      {open && (
        <div className="zone-select-dropdown">
          <input
            className="zone-select-filter"
            placeholder="Filter zones..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
          <div className="zone-select-list">
            <div className="zone-select-item zone-select-blank" onClick={() => select('')}>
              — Select zone —
            </div>
            {filtered.map(z => (
              <div
                key={z}
                className={`zone-select-item${z === value ? ' zone-select-item-active' : ''}`}
                onClick={() => select(z)}
              >
                {z}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="zone-select-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Item Modal ────────────────────────────────────────────────────────────

const LOAD_OPTIONS = [
  { value: 'R', label: 'R — Random' },
  { value: 'Q', label: 'Q — Quest' },
  { value: 'N', label: 'N — Normal' },
  { value: 'S', label: 'S — Store' },
  { value: 'X', label: 'X — Other' },
]

function AddItemModal({ token, onClose, onAuthFailed }: { token: string; onClose: () => void; onAuthFailed: () => void }) {
  const [text, setText] = useState('')
  const [load, setLoad] = useState('R')
  const [zone, setZone] = useState('')
  const [zones, setZones] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/zones')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.zones)) setZones(d.zones) })
      .catch(() => {})
  }, [])

  // Debounced preview: fires 400ms after text/load/zone change
  useEffect(() => {
    if (previewDebounce.current) clearTimeout(previewDebounce.current)
    if (!text.trim()) { setPreview(null); return }
    previewDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/neweq/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, load, zone }),
        })
        const data = await res.json()
        setPreview(data.preview ?? null)
      } catch { setPreview(null) }
    }, 400)
    return () => { if (previewDebounce.current) clearTimeout(previewDebounce.current) }
  }, [text, load, zone])

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/neweq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text, load, zone }),
      })
      if (res.status === 401) { onAuthFailed(); return }
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Failed to save item')
      } else {
        setStatus('success')
        setMessage(`Saved: ${data.name}`)
        setText('')
        setPreview(null)
      }
    } catch {
      setStatus('error')
      setMessage('Could not reach the server')
    }
  }

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add New Item</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="add-fields-row">
            <div className="add-field">
              <label className="add-label">Load</label>
              <select className="add-select" value={load} onChange={e => setLoad(e.target.value)}>
                {LOAD_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="add-field add-field-wide">
              <label className="add-label">Zone</label>
              <ZoneSelect zones={zones} value={zone} onChange={setZone} />
            </div>
          </div>
          <label className="add-label">Paste item data below</label>
          <textarea
            className="add-textarea"
            rows={8}
            value={text}
            onChange={e => { setText(e.target.value); setStatus('idle'); setMessage('') }}
            placeholder="Paste item text here..."
            autoFocus
          />
          {preview && (
            <div className="item-preview">
              <span className="item-preview-label">Preview</span>
              <span className="item-preview-text">{preview}</span>
            </div>
          )}
          {status === 'error' && <p className="modal-error">{message}</p>}
          {status === 'success' && <p className="modal-success">{message}</p>}
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={!text.trim() || status === 'loading'}>
              {status === 'loading' ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Password Modal ────────────────────────────────────────────────────────────

function PasswordModal({ onSuccess, onClose }: { onSuccess: (token: string) => void; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Incorrect password')
      } else {
        onSuccess(data.token)
      }
    } catch {
      setError('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal modal-narrow">
        <div className="modal-header">
          <h2 className="modal-title">Admin Access</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="add-label">Password</label>
          <input
            className="pw-input"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="Enter admin password"
            autoFocus
          />
          {error && <p className="modal-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={!password || busy}>
              {busy ? 'Checking...' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Approve Items Modal ───────────────────────────────────────────────────────

type PendingAction = { type: 'approve'; item: PendingItem } | { type: 'reject'; item: PendingItem }

function ApproveItemsModal({ token, onClose, onAuthFailed }: { token: string; onClose: () => void; onAuthFailed: () => void }) {
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const authHeaders = { 'Authorization': `Bearer ${token}` }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/neweq')
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      setActionError('Could not load pending items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingAction) setPendingAction(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, pendingAction])

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const approve = async (name: string) => {
    setBusy(name)
    setActionError('')
    try {
      const res = await fetch(`/api/neweq/${encodeURIComponent(name)}/approve`, { method: 'POST', headers: authHeaders })
      if (res.status === 401) { onAuthFailed(); return }
      if (!res.ok) {
        const d = await res.json()
        setActionError(d.error || 'Approve failed')
      } else {
        setItems(prev => prev.filter(i => i.name !== name))
      }
    } catch {
      setActionError('Could not reach the server')
    } finally {
      setBusy(null)
    }
  }

  const reject = async (name: string) => {
    setBusy(name)
    setActionError('')
    try {
      const res = await fetch(`/api/neweq/${encodeURIComponent(name)}`, { method: 'DELETE', headers: authHeaders })
      if (res.status === 401) { onAuthFailed(); return }
      if (!res.ok) {
        const d = await res.json()
        setActionError(d.error || 'Reject failed')
      } else {
        setItems(prev => prev.filter(i => i.name !== name))
      }
    } catch {
      setActionError('Could not reach the server')
    } finally {
      setBusy(null)
    }
  }

  const handleApproveClick = (item: PendingItem) => {
    if (item.duplicate) {
      setPendingAction({ type: 'approve', item })
    } else {
      approve(item.name)
    }
  }

  const handleRejectClick = (item: PendingItem) => {
    setPendingAction({ type: 'reject', item })
  }

  const handleConfirm = () => {
    if (!pendingAction) return
    if (pendingAction.type === 'approve') approve(pendingAction.item.name)
    else reject(pendingAction.item.name)
    setPendingAction(null)
  }

  return (
    <>
      {pendingAction && (
        <div className="modal-backdrop confirm-backdrop" onClick={() => setPendingAction(null)}>
          <div className="modal modal-narrow" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {pendingAction.type === 'approve' ? 'Confirm Overwrite' : 'Confirm Deletion'}
              </h2>
              <button className="modal-close" onClick={() => setPendingAction(null)}>✕</button>
            </div>
            <p className="confirm-msg">
              {pendingAction.type === 'approve'
                ? <>
                    <strong>{pendingAction.item.name}</strong> already exists in the eq table.
                    Approving will replace the existing entry. Continue?
                  </>
                : <>
                    Delete pending item <strong>{pendingAction.item.name}</strong>? This cannot be undone.
                  </>
              }
            </p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setPendingAction(null)}>Cancel</button>
              <button
                className={pendingAction.type === 'approve' ? 'approve-btn confirm-action-btn' : 'reject-btn confirm-action-btn'}
                onClick={handleConfirm}
              >
                {pendingAction.type === 'approve' ? 'Yes, Replace' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="modal-backdrop" onClick={handleBackdrop}>
        <div className="modal modal-wide">
          <div className="modal-header">
            <h2 className="modal-title">Approve New Items</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          {actionError && <p className="modal-error">{actionError}</p>}

          {loading && <p className="approve-status">Loading...</p>}

          {!loading && items.length === 0 && (
            <p className="approve-status">No pending items.</p>
          )}

          {!loading && items.length > 0 && (
            <div className="approve-list">
              {items.map(item => (
                <div key={item.name} className={`approve-row${item.duplicate ? ' approve-row-dup' : ''}`}>
                  <div className="approve-info">
                    <span className="approve-name">
                      {item.name}
                      {item.duplicate && <span className="dup-badge" title="Already exists in eq table">⚠ duplicate</span>}
                    </span>
                    {item.long_stats && (
                      <span className="approve-meta approve-long-stats">{item.long_stats}</span>
                    )}
                  </div>
                  <div className="approve-btns">
                    <button
                      className="approve-btn"
                      disabled={busy === item.name}
                      onClick={() => handleApproveClick(item)}
                    >
                      Approve
                    </button>
                    <button
                      className="reject-btn"
                      disabled={busy === item.name}
                      onClick={() => handleRejectClick(item)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [results, setResults] = useState<EqResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [pendingModal, setPendingModal] = useState<'add' | 'approve' | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAddClick = () => {
    if (adminToken) {
      setShowAddModal(true)
    } else {
      setPendingModal('add')
      setShowPasswordModal(true)
    }
  }

  const handleApproveClick = () => {
    if (adminToken) {
      setShowApproveModal(true)
    } else {
      setPendingModal('approve')
      setShowPasswordModal(true)
    }
  }

  const handleAuthSuccess = (token: string) => {
    setAdminToken(token)
    setShowPasswordModal(false)
    if (pendingModal === 'add') setShowAddModal(true)
    else setShowApproveModal(true)
    setPendingModal(null)
  }

  const handleAuthFailed = () => {
    setAdminToken(null)
    setShowAddModal(false)
    setShowApproveModal(false)
    setShowPasswordModal(true)
  }

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => setFilters({})

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const hasSearch = query.trim() !== '' || Object.values(filters).some(v => v !== '')

    if (!hasSearch) {
      setResults([])
      setSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        if (query.trim()) params.set('name', query.trim())
        params.set('stats', 'long')
        for (const [key, val] of Object.entries(filters)) {
          if (val !== '') params.set(key, val)
        }
        const res = await fetch(`/api/eq/search?${params}`)
        if (!res.ok) throw new Error('Search failed')
        const data: SearchResponse = await res.json()
        setResults(data.results)
        setSearched(true)
      } catch {
        setError('Failed to reach the server. Is the backend running?')
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query, filters])

  return (
    <div className="app">
      {showAddModal && adminToken && <AddItemModal token={adminToken} onClose={() => setShowAddModal(false)} onAuthFailed={handleAuthFailed} />}
      {showPasswordModal && <PasswordModal onSuccess={handleAuthSuccess} onClose={() => setShowPasswordModal(false)} />}
      {showApproveModal && adminToken && <ApproveItemsModal token={adminToken} onClose={() => setShowApproveModal(false)} onAuthFailed={handleAuthFailed} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <header className="header">
        <div>
          <h1 className="logo">TorilDB</h1>
          <p className="subtitle">Equipment Search</p>
        </div>
        <div className="header-btns">
          <button className="help-btn" onClick={() => setShowHelp(true)}>? Help</button>
          <button className="add-btn" onClick={handleAddClick}>+ Add New Item</button>
          <button className="approve-header-btn" onClick={handleApproveClick}>✓ Approve New Items</button>
        </div>
      </header>

      <div className="search-section">
        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search by name, keywords, zone, effects..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button className="clear-btn" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <button
          className={`filters-toggle${showFilters ? ' active' : ''}`}
          onClick={() => setShowFilters(v => !v)}
        >
          <span>⚙ Filters</span>
          {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          <span className="filters-toggle-arrow">{showFilters ? '▲' : '▼'}</span>
        </button>

        {showFilters && (
          <div className="filter-panel">
            <div className="filter-panel-header">
              <span className="filter-panel-title">Numeric Filters — set min and/or max for any stat</span>
              {activeFilterCount > 0 && (
                <button className="filter-clear-btn" onClick={clearFilters}>Clear all</button>
              )}
            </div>
            <div className="filter-groups">
              {FILTER_GROUPS.map(group => (
                <div key={group.title} className="filter-group">
                  <div className="filter-group-title">{group.title}</div>
                  <div className="filter-fields">
                    {group.fields.map(({ field, label }) => (
                      <div key={field} className="filter-field">
                        <span className="filter-field-label">{label}</span>
                        <input
                          type="number"
                          className="filter-num-input"
                          placeholder="min"
                          value={filters[`min_${field}`] ?? ''}
                          onChange={e => updateFilter(`min_${field}`, e.target.value)}
                        />
                        <input
                          type="number"
                          className="filter-num-input"
                          placeholder="max"
                          value={filters[`max_${field}`] ?? ''}
                          onChange={e => updateFilter(`max_${field}`, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>

      <main className="results-section">
        {loading && <div className="status">Searching...</div>}

        {!loading && searched && (
          <div className="result-count">
            {results.length} result{results.length !== 1 ? 's' : ''}
            {query ? ` for "${query}"` : ''}
            {activeFilterCount > 0 ? ` (${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active)` : ''}
          </div>
        )}

        {!loading && results.length > 0 && (
          <ul className="results-list">
            {results.map((item, i) => (
              <li key={i} className="result-card">
                <span className="item-name">{item.name}</span>
                <span className="item-stats">{item.long_stats ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="status">No results found{query ? ` for "${query}"` : ''}</div>
        )}

        {!searched && !loading && (
          <div className="empty-state">
            <p>Enter a name or use filters to search equipment</p>
          </div>
        )}
      </main>
    </div>
  )
}
