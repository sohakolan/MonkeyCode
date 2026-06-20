// Confettis de célébration (canvas plein écran, isolé). Monté ponctuellement
// sur l'écran de résultats lors d'un record ou d'un passage de niveau.
import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  color: string
  life: number
}

export default function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const accent =
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
      '#ffb454'
    const palette = [accent, '#ffd479', '#7fc8b6', '#d2a6ff', '#ff8fb0', '#ffffff']

    const cx = W / 2
    const cy = H * 0.34
    const particles: Particle[] = Array.from({ length: 150 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 8
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        size: 5 + Math.random() * 6,
        color: palette[Math.floor(Math.random() * palette.length)],
        life: 1,
      }
    })

    let raf = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const elapsed = t - start
      ctx.clearRect(0, 0, W, H)
      let alive = false
      for (const p of particles) {
        p.vy += 0.18 // gravité
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        p.life -= 0.008
        if (p.life <= 0) continue
        alive = true
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
      if (alive && elapsed < 3200) {
        raf = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, W, H)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}
