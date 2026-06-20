// Carte de chaleur clavier : colore chaque touche selon tes erreurs cumulées
// (données player.weakKeys). Purement visuel, ne touche pas la boucle de frappe.

const ROWS = [
  '1234567890'.split(''),
  'qwertyuiop'.split(''),
  'asdfghjkl'.split(''),
  'zxcvbnm'.split(''),
]

/** Erreurs agrégées pour une touche physique (minuscule + majuscule). */
function keyIntensity(weak: Record<string, number>, key: string): number {
  let sum = weak[key] ?? 0
  if (key >= 'a' && key <= 'z') sum += weak[key.toUpperCase()] ?? 0
  return sum
}

export default function KeyboardHeatmap({ weak }: { weak: Record<string, number> }) {
  let max = 1
  for (const row of ROWS) {
    for (const k of row) max = Math.max(max, keyIntensity(weak, k))
  }
  const hasData = Object.keys(weak).length > 0
  if (!hasData) return null

  return (
    <div className="kb">
      <div className="prof-weak-title">carte de chaleur clavier</div>
      <div className="kb-rows">
        {ROWS.map((row, i) => (
          <div key={i} className="kb-row" style={{ paddingLeft: `${i * 12}px` }}>
            {row.map((k) => {
              const n = keyIntensity(weak, k)
              const t = n / max // 0..1
              return (
                <span
                  key={k}
                  className={`kb-key ${n > 0 ? 'hot' : ''}`}
                  style={
                    n > 0
                      ? {
                          background: `rgba(var(--accent-rgb), ${0.12 + t * 0.55})`,
                          borderColor: `rgba(var(--accent-rgb), ${0.3 + t * 0.5})`,
                        }
                      : undefined
                  }
                  title={n > 0 ? `${n} erreur${n > 1 ? 's' : ''}` : 'aucune erreur'}
                >
                  {k}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
