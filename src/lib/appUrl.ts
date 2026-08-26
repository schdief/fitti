/** Absolute URL auf eine Hash-Route dieser App, z. B. für OAuth- und x-callback-Rücksprünge. */
export function appUrl(hashRoute = '/'): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`
  return `${base}#${hashRoute}`
}

/** Basis-URL ohne Fragment. OAuth-Redirect-URIs dürfen kein Fragment enthalten. */
export function appOrigin(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

/**
 * Läuft die App vom Home-Bildschirm? Wichtig für den Kurzbefehl-Aufruf: Ein
 * https-Rücksprung öffnet dort immer Safari statt der App, deshalb verzichten
 * wir in diesem Fall auf x-callback.
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
