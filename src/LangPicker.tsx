// Sélecteur de langage façon monkeytype : un bouton central ouvre une liste
// de tous les langages. Recherche au clavier, flèches pour naviguer, ↵ pour
// valider, échap pour fermer.
import { useEffect, useRef, useState } from 'react'
import type { Lang } from './types'
import { LANGS, LANG_LABEL } from './types'

interface Props {
  current: Lang
  onPick: (lang: Lang) => void
  onClose: () => void
}

export default function LangPicker({ current, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = LANGS.filter((l) =>
    LANG_LABEL[l].toLowerCase().includes(query.trim().toLowerCase()),
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // L'index actif reste dans les bornes quand la recherche filtre la liste.
  const activeIdx = Math.min(active, Math.max(0, matches.length - 1))

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(Math.min(activeIdx + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(Math.max(activeIdx - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const lang = matches[activeIdx]
      if (lang) onPick(lang)
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="langpick"
        role="dialog"
        aria-modal="true"
        aria-label="choisir un langage"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="langpick-search"
          type="text"
          placeholder="langage…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          aria-label="filtrer les langages"
        />
        <ul className="langpick-list" role="listbox">
          {matches.map((lang, i) => (
            <li key={lang} role="option" aria-selected={lang === current}>
              <button
                className={`langpick-item${i === activeIdx ? ' active' : ''}${
                  lang === current ? ' current' : ''
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(lang)}
              >
                <span className="langpick-name">{LANG_LABEL[lang]}</span>
                {lang === current && <span className="langpick-tag">actuel</span>}
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="langpick-empty">aucun langage</li>
          )}
        </ul>
      </div>
    </div>
  )
}
