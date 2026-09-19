import { useEffect, useState } from 'react'

const COLORS = ['var(--color-accent)', 'var(--color-warn)', '#7cc7ff', '#ff8fb1', '#c6f36a']
const PIECES = 60

interface Piece {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  size: number
  drift: number
}

function build(): Piece[] {
  return Array.from({ length: PIECES }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 2.4 + Math.random() * 1.8,
    color: COLORS[id % COLORS.length]!,
    size: 6 + Math.random() * 8,
    drift: (Math.random() - 0.5) * 120,
  }))
}

/**
 * Konfetti für den Abschluss. Bewusst ohne Zusatzbibliothek: ein paar absolut
 * positionierte Schnipsel mit CSS-Animation reichen und kosten kein Gewicht im
 * Bundle. Räumt sich nach dem Durchlauf selbst ab.
 */
export function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>(build)

  useEffect(() => {
    const timer = window.setTimeout(() => setPieces([]), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  if (pieces.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 animate-confetti rounded-[2px]"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 1.6,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ['--drift' as string]: `${piece.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
