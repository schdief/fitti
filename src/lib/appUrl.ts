/** Absolute URL auf eine Hash-Route dieser App, z. B. für OAuth- und x-callback-Rücksprünge. */
export function appUrl(hashRoute = '/'): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`
  return `${base}#${hashRoute}`
}

/** Basis-URL ohne Fragment. OAuth-Redirect-URIs dürfen kein Fragment enthalten. */
export function appOrigin(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}
