/**
 * Gets the clean current URL without search params or hash
 */
export function getCurrentCleanUrl(): string {
  const url = new URL(window.location.href);
  return `${url.origin}${url.pathname}`;
}
