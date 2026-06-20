// Panneau export / import / reset de la progression locale (onglet compte).
import { useRef, useState } from 'react'
import { exportData, importData, resetProgress } from './data'

export default function DataManager() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const stamp = new Date().toISOString().slice(0, 10)
    a.download = `monkeycode-progress-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ kind: 'ok', text: 'progression exportée' })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importData(String(reader.result))
      if (ok) {
        setMsg({ kind: 'ok', text: 'import réussi — rechargement…' })
        setTimeout(() => location.reload(), 600)
      } else {
        setMsg({ kind: 'err', text: 'fichier invalide' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const doReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    resetProgress()
    location.reload()
  }

  return (
    <div className="prof-data">
      <div className="prof-data-title">données locales</div>
      <p className="prof-offline-dim">
        Sauvegarde ou transfère ta progression (profil, historique, records, ghosts).
      </p>
      <div className="prof-data-actions">
        <button className="prof-theme-btn" onClick={download}>
          ↓ exporter
        </button>
        <button className="prof-theme-btn" onClick={() => fileRef.current?.click()}>
          ↑ importer
        </button>
        <button
          className={`prof-theme-btn ${confirmReset ? 'danger' : ''}`}
          onClick={doReset}
          onBlur={() => setConfirmReset(false)}
        >
          {confirmReset ? 'confirmer la remise à zéro' : '⟲ réinitialiser'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        onChange={onFile}
        hidden
      />
      {msg && (
        <div className={msg.kind === 'ok' ? 'prof-data-ok' : 'prof-auth-err'}>{msg.text}</div>
      )}
    </div>
  )
}
