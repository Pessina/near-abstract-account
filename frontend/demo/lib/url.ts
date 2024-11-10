/**
 * Gets the clean current URL without search params or hash
 */
export function getCurrentCleanUrl(): string {
  const url = new URL(window.location.href);
  // Keep only origin and pathname
  return `${url.origin}${url.pathname}`;
}
