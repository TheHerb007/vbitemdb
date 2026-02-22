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
}

// ── Add Item Modal ────────────────────────────────────────────────────────────

function AddItemModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/neweq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Failed to save item')
      } else {
        setStatus('success')
        setMessage(`Saved: ${data.name}`)
        setText('')
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
          <label className="add-label">Paste item data below</label>
          <textarea
            className="add-textarea"
            rows={8}
            value={text}
            onChange={e => { setText(e.target.value); setStatus('idle'); setMessage('') }}
            placeholder="Paste item text here..."
            autoFocus
          />
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

// ── Approve Items Modal ───────────────────────────────────────────────────────

function ApproveItemsModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const approve = async (name: string) => {
    setBusy(name)
    setActionError('')
    try {
      const res = await fetch(`/api/neweq/${encodeURIComponent(name)}/approve`, { method: 'POST' })
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
      const res = await fetch(`/api/neweq/${encodeURIComponent(name)}`, { method: 'DELETE' })
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

  return (
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
              <div key={item.name} className="approve-row">
                <div className="approve-info">
                  <span className="approve-name">{item.name}</span>
                  <span className="approve-meta">
                    {[item.TYPE, item.worn, item.hit != null ? `Hit:${item.hit}` : null, item.dam != null ? `Dam:${item.dam}` : null, item.ac != null ? `AC:${item.ac}` : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                </div>
                <div className="approve-btns">
                  <button
                    className="approve-btn"
                    disabled={busy === item.name}
                    onClick={() => approve(item.name)}
                  >
                    Approve
                  </button>
                  <button
                    className="reject-btn"
                    disabled={busy === item.name}
                    onClick={() => reject(item.name)}
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
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EqResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/eq/search?name=${encodeURIComponent(query)}&stats=long`)
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
  }, [query])

  return (
    <div className="app">
      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} />}
      {showApproveModal && <ApproveItemsModal onClose={() => setShowApproveModal(false)} />}

      <header className="header">
        <div>
          <h1 className="logo">TorilDB</h1>
          <p className="subtitle">Equipment Search</p>
        </div>
        <div className="header-btns">
          <button className="add-btn" onClick={() => setShowAddModal(true)}>+ Add New Item</button>
          <button className="approve-header-btn" onClick={() => setShowApproveModal(true)}>✓ Approve New Items</button>
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
            placeholder="Search equipment by name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button className="clear-btn" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {error && <p className="error">{error}</p>}
      </div>

      <main className="results-section">
        {loading && <div className="status">Searching...</div>}

        {!loading && searched && (
          <div className="result-count">
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
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
          <div className="status">No results found for "{query}"</div>
        )}

        {!searched && !loading && (
          <div className="empty-state">
            <p>Enter a name above to search equipment</p>
          </div>
        )}
      </main>
    </div>
  )
}
