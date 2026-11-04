/**
 * Safari liefert beim ersten Zeichnen eine falsche Viewporthöhe, wodurch die
 * untere Leiste über dem Bildschirmrand schwebt. Erst eine Scrollbewegung des
 * Dokuments korrigiert das – die gibt es hier nicht, weil nur Bereiche im
 * Inneren scrollen.
 *
 * Deshalb wird die Höhe gemessen und als `--app-height` bereitgestellt. Die
 * Utility `min-h-app` nutzt den Wert und fällt auf `100dvh` zurück, solange
 * noch nichts gemessen wurde.
 */
export interface ViewportReading {
  innerWidth: number
  innerHeight: number
  clientHeight: number
  visualHeight: number
  screenWidth: number
  screenHeight: number
  /** Vom Home-Bildschirm gestartet, auf einem iPhone. */
  iphoneStandalone: boolean
}

export function appHeightFrom(reading: ViewportReading): number {
  // Die größte der drei Angaben nehmen: eine zu kleine Höhe lässt die untere
  // Leiste über dem Bildschirmrand schweben, was deutlich störender ist als
  // ein paar Pixel zu viel.
  const measured = Math.max(reading.innerHeight, reading.clientHeight, reading.visualHeight)
  if (!reading.iphoneStandalone) return measured

  // Als Home-Screen-App füllt fitti auf dem iPhone immer den ganzen Bildschirm,
  // auch wenn iOS beim Start weniger meldet. iOS dreht screen.width/height
  // nicht mit, im Querformat ist die kürzere Seite die Höhe.
  const landscape = reading.innerWidth > reading.innerHeight
  const screenSide = landscape
    ? Math.min(reading.screenWidth, reading.screenHeight)
    : Math.max(reading.screenWidth, reading.screenHeight)

  return Math.max(measured, screenSide)
}

function isIphoneStandalone(): boolean {
  const { standalone } = navigator as Navigator & { standalone?: boolean }
  // Nur iPhone: auf dem iPad kann das Fenster kleiner als der Bildschirm sein.
  return standalone === true && /iPhone/.test(navigator.userAgent)
}

export function trackAppHeight(): void {
  const apply = () => {
    const height = appHeightFrom({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      clientHeight: document.documentElement.clientHeight,
      visualHeight: window.visualViewport?.height ?? 0,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      iphoneStandalone: isIphoneStandalone(),
    })

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
