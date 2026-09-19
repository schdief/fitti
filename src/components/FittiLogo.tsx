/**
 * Die Hantel aus dem App-Symbol (assets/icon.svg), ohne Hintergrund und auf das
 * Motiv zugeschnitten, damit sie neben einer Überschrift sitzen kann.
 *
 * Breite und Höhe stehen bewusst als Attribute und als feste Klasse: Safari
 * leitet aus einer reinen viewBox in einem Flex-Container keine Breite ab und
 * zeichnet das Bild sonst gar nicht.
 */
export function FittiLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="108 188 296 136"
      width="296"
      height="136"
      role="img"
      aria-label="fitti"
      className={`text-accent ${className}`}
    >
      <g stroke="currentColor" strokeLinecap="round" fill="none">
        <line x1="188" y1="256" x2="324" y2="256" strokeWidth="26" />
        <line x1="176" y1="212" x2="176" y2="300" strokeWidth="34" />
        <line x1="336" y1="212" x2="336" y2="300" strokeWidth="34" />
        <line x1="130" y1="228" x2="130" y2="284" strokeWidth="30" opacity="0.7" />
        <line x1="382" y1="228" x2="382" y2="284" strokeWidth="30" opacity="0.7" />
      </g>
    </svg>
  )
}
