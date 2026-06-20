import { memo } from 'react'
import type { GameMode } from './types'

interface Props {
  mode: GameMode
  target: string
  typed: string
}

interface Segment {
  start: number
  status: 'ok' | 'err' | 'pending'
  text: string
}

function segment(target: string, typed: string): Segment[] {
  const n = typed.length
  const segs: Segment[] = []
  let i = 0
  while (i < target.length) {
    const at = (k: number): Segment['status'] =>
      k < n ? (typed[k] === target[k] ? 'ok' : 'err') : 'pending'
    const status = at(i)
    let j = i + 1
    while (j < target.length && at(j) === status) j++
    segs.push({ start: i, status, text: target.slice(i, j) })
    i = j
  }
  return segs
}

const RewriteTarget = memo(function RewriteTarget({
  target,
  typed,
}: {
  target: string
  typed: string
}) {
  const segs = segment(target, typed)
  const caretAt = Math.min(typed.length, target.length)
  const out: React.ReactNode[] = []
  for (const seg of segs) {
    if (seg.start === caretAt) out.push(<span key="caret" className="ghost-caret" />)
    out.push(
      <span key={seg.start} className={`ghost-${seg.status}`}>
        {seg.status === 'err' ? seg.text.replace(/\n/g, '⏎\n') : seg.text}
      </span>,
    )
  }
  if (caretAt >= target.length)
    out.push(<span key="caret" className="ghost-caret" />)
  return <pre className="ghost">{out}</pre>
})

const RefactorTarget = memo(function RefactorTarget({
  target,
  typed,
}: {
  target: string
  typed: string
}) {
  const targetLines = target.split('\n')
  const typedLines = typed.split('\n')
  return (
    <pre className="ghost ghost-lines">
      {targetLines.map((line, i) => {
        const done = typedLines[i] === line
        return (
          <div key={i} className={`ghost-line ${done ? 'is-done' : 'is-todo'}`}>
            <span className="ghost-mark">{done ? '✓' : '·'}</span>
            <span>{line === '' ? ' ' : line}</span>
          </div>
        )
      })}
    </pre>
  )
})

export default function TargetPanel({ mode, target, typed }: Props) {
  return mode === 'rewrite' ? (
    <RewriteTarget target={target} typed={typed} />
  ) : (
    <RefactorTarget target={target} typed={typed} />
  )
}
