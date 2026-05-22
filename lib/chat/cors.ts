/** Orígenes normalizados (host en minúsculas) permitidos para el chat API. */
const ALLOWED_ORIGIN_KEYS = new Set([
  'https://theancientone123.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function normalizeOriginKey(origin: string): string | null {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host.toLowerCase()}`;
  } catch {
    return null;
  }
}

export function isAllowedOrigin(
  origin: string | undefined,
  options?: {allowMissing?: boolean},
): boolean {
  if (!origin) return options?.allowMissing === true;
  const key = normalizeOriginKey(origin);
  return key !== null && ALLOWED_ORIGIN_KEYS.has(key);
}

export function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = isAllowedOrigin(origin);
  return {
    ...(allowed && origin ? {'Access-Control-Allow-Origin': origin} : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
