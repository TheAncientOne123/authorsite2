const ALLOWED_ORIGINS = new Set([
  'https://TheAncientOne123.github.io',
  'http://localhost:3000',
]);

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}

export function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = isAllowedOrigin(origin);
  return {
    ...(allowed ? {'Access-Control-Allow-Origin': origin!} : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}
