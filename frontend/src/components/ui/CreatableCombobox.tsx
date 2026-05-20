'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface ComboOption {
  value: string
  label: string
}

// ── Utilities ──────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ── Single-select Creatable Combobox ──────────────────────────────────────

interface CreatableComboboxProps {
  options:     ComboOption[]
  value:       string
  onChange:    (value: string) => void
  /** Called when user creates a new option. Return the created option. */
  onCreate?:   (inputValue: string) => Promise<ComboOption>
  placeholder?: string
  label?:       string
  disabled?:    boolean
  className?:   string
}

export function CreatableCombobox({
  options: initialOptions,
  value,
  onChange,
  onCreate,
  placeholder = 'Select or type…',
  disabled,
  className = '',
}: CreatableComboboxProps) {
  const [options, setOptions] = useState<ComboOption[]>(initialOptions)
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError]     = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  // Keep options in sync if parent refreshes the list
  useEffect(() => {
    setOptions(prev => {
      const existingValues = new Set(prev.map(o => o.value))
      const newOpts = initialOptions.filter(o => !existingValues.has(o.value))
      return newOpts.length ? [...prev, ...newOpts] : prev
    })
  }, [initialOptions])

  const selected = options.find(o => o.value === value)

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const exactMatch = options.some(o => o.label.toLowerCase() === query.toLowerCase())
  const canCreate  = !!onCreate && query.trim().length > 0 && !exactMatch

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function openDropdown() {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setError('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function selectOption(opt: ComboOption) {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  async function handleCreate() {
    if (!onCreate || !query.trim()) return
    setCreating(true)
    setError('')
    try {
      const created = await onCreate(query.trim())
      setOptions(prev => [...prev, created])
      onChange(created.value)
      setOpen(false)
      setQuery('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length === 1) { selectOption(filtered[0]); return }
      if (canCreate) handleCreate()
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className="w-full flex items-center justify-between rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? 'text-zinc-800' : 'text-zinc-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-zinc-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type to search or create…"
              className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Options list */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && !canCreate && (
              <li className="px-3 py-2 text-sm text-zinc-400 text-center">No options found</li>
            )}
            {filtered.map(opt => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => selectOption(opt)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                    opt.value === value
                      ? 'bg-primary/10 text-zinc-900 font-medium'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {opt.label}
                  {opt.value === value && (
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </li>
            ))}

            {/* Create option */}
            {canCreate && (
              <li className="border-t border-zinc-100 mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-primary/5 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {creating ? (
                    <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  )}
                  {creating ? 'Creating…' : `Create "${query.trim()}"`}
                </button>
              </li>
            )}
          </ul>

          {error && (
            <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Multi-select Creatable Combobox ────────────────────────────────────────

interface CreatableMultiComboboxProps {
  options:     ComboOption[]
  value:       string[]
  onChange:    (value: string[]) => void
  onCreate?:   (inputValue: string) => Promise<ComboOption>
  placeholder?: string
  disabled?:   boolean
  className?:  string
}

export function CreatableMultiCombobox({
  options: initialOptions,
  value,
  onChange,
  onCreate,
  placeholder = 'Select or type…',
  disabled,
  className = '',
}: CreatableMultiComboboxProps) {
  const [options, setOptions] = useState<ComboOption[]>(initialOptions)
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError]     = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setOptions(prev => {
      const existingValues = new Set(prev.map(o => o.value))
      const newOpts = initialOptions.filter(o => !existingValues.has(o.value))
      return newOpts.length ? [...prev, ...newOpts] : prev
    })
  }, [initialOptions])

  const selectedOptions = options.filter(o => value.includes(o.value))

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const exactMatch = options.some(o => o.label.toLowerCase() === query.toLowerCase())
  const canCreate  = !!onCreate && query.trim().length > 0 && !exactMatch

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function toggle(opt: ComboOption) {
    const has = value.includes(opt.value)
    onChange(has ? value.filter(v => v !== opt.value) : [...value, opt.value])
  }

  function removeSelected(v: string) {
    onChange(value.filter(x => x !== v))
  }

  async function handleCreate() {
    if (!onCreate || !query.trim()) return
    setCreating(true)
    setError('')
    try {
      const created = await onCreate(query.trim())
      setOptions(prev => [...prev, created])
      onChange([...value, created.value])
      setQuery('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length === 1 && !value.includes(filtered[0].value)) { toggle(filtered[0]); return }
      if (canCreate) handleCreate()
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger / selected pills */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => { if (!disabled) { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) } }}
        onKeyDown={e => e.key === 'Enter' && setOpen(true)}
        className={`min-h-[38px] w-full flex flex-wrap gap-1.5 items-center rounded-lg border border-zinc-300 px-2.5 py-1.5 bg-white cursor-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-400'}`}
      >
        {selectedOptions.map(opt => (
          <span key={opt.value} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
            {opt.label}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeSelected(opt.value) }}
              className="text-zinc-400 hover:text-zinc-700"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        {selectedOptions.length === 0 && (
          <span className="text-sm text-zinc-400">{placeholder}</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type to search or create…"
              className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && !canCreate && (
              <li className="px-3 py-2 text-sm text-zinc-400 text-center">No options found</li>
            )}
            {filtered.map(opt => {
              const selected = value.includes(opt.value)
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => toggle(opt)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      selected ? 'bg-primary/10 text-zinc-900 font-medium' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-primary border-primary' : 'border-zinc-300'}`}>
                      {selected && (
                        <svg className="w-2.5 h-2.5 text-zinc-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    {opt.label}
                  </button>
                </li>
              )
            })}
            {canCreate && (
              <li className="border-t border-zinc-100 mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-primary/5 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {creating ? (
                    <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  )}
                  {creating ? 'Creating…' : `Create "${query.trim()}"`}
                </button>
              </li>
            )}
          </ul>

          {error && (
            <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{error}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tag Input (free-form + predefined pills) ───────────────────────────────

interface TagInputProps {
  value:    string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
}

export function TagInput({ value, onChange, suggestions = [] }: TagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase()
    if (!trimmed || value.includes(trimmed)) { setInput(''); return }
    onChange([...value, trimmed])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && input === '' && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  const unusedSuggestions = suggestions.filter(s => !value.includes(s))

  return (
    <div className="space-y-2">
      {/* Input area with selected tags */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="min-h-[38px] flex flex-wrap gap-1.5 items-center rounded-lg border border-zinc-300 px-2.5 py-1.5 bg-white cursor-text focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-colors"
      >
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-white">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-white/60 hover:text-white">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => input.trim() && addTag(input)}
          placeholder={value.length === 0 ? 'Type a tag and press Enter…' : ''}
          className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder-zinc-400"
        />
      </div>

      {/* Suggestion pills */}
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-600 hover:border-primary hover:text-zinc-900 hover:bg-primary/5 transition-colors"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-xs text-zinc-400">
          {value.length} tag{value.length !== 1 ? 's' : ''}. Press Backspace to remove the last one.
        </p>
      )}
    </div>
  )
}

export { slugify }
