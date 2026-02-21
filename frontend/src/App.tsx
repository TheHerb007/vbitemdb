import { useState, useEffect, useRef } from 'react'

type StatsMode = 'short' | 'long'

interface EqResult {
  name: string
  short_stats?: string
  long_stats?: string
}

interface SearchResponse {
  results: EqResult[]
  stats: string
}

export default function App() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<StatsMode>('short')
  const [results, setResults] = useState<EqResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
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
        const res = await fetch(`/api/eq/search?name=${encodeURIComponent(query)}&stats=${mode}`)
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
  }, [query, mode])

  const statsKey = mode === 'long' ? 'long_stats' : 'short_stats'

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">TorilDB</h1>
        <p className="subtitle">Equipment Search</p>
      </header>

      <div className="search-section">
        <div className="search-row">
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

          <div className="toggle">
            <button
              className={`toggle-btn ${mode === 'short' ? 'active' : ''}`}
              onClick={() => setMode('short')}
            >
              Short
            </button>
            <button
              className={`toggle-btn ${mode === 'long' ? 'active' : ''}`}
              onClick={() => setMode('long')}
            >
              Long
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
      </div>

      <main className="results-section">
        {loading && (
          <div className="status">Searching...</div>
        )}

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
                <span className="item-stats">{item[statsKey] ?? '—'}</span>
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
