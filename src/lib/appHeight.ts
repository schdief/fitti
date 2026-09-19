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
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
  }

  apply()

  window.addEventListener('resize', apply)
  window.addEventListener('orientationchange', apply)
  window.addEventListener('pageshow', apply)
  window.visualViewport?.addEventListener('resize', apply)
}
