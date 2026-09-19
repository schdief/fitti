/**
 * Safari liefert beim ersten Zeichnen eine falsche Viewporthöhe: `100dvh` ist
 * dann größer als der sichtbare Bereich, wodurch die untere Leiste über dem
 * Bildschirmrand schwebt. Erst eine Scrollbewegung korrigiert das.
 *
 * Deshalb wird die Höhe gemessen und als `--app-height` bereitgestellt. Die
 * Utility `min-h-app` nutzt den Wert und fällt auf `100dvh` zurück, solange
 * noch nichts gemessen wurde.
 */
export function trackAppHeight(): void {
  const apply = () => {
    const height = window.visualViewport?.height ?? window.innerHeight
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`)
  }

  apply()

  // iOS meldet direkt nach dem Start gelegentlich noch die alte Höhe, ohne dass
  // ein Ereignis folgt. Deshalb kurz nach dem ersten Zeichnen erneut messen.
  requestAnimationFrame(apply)
  window.setTimeout(apply, 300)

  window.addEventListener('load', apply)
  window.addEventListener('resize', apply)
  window.addEventListener('orientationchange', apply)
  window.addEventListener('pageshow', apply)
  window.visualViewport?.addEventListener('resize', apply)
}
