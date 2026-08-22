export function safeSourceUrl(value: string, base?: string): string | undefined {
  try {
    const url = base === undefined ? new URL(value.trim()) : new URL(value.trim(), base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;

    url.username = '';
    url.password = '';
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export function safeCanonicalUrl(value: string, actualUrl: string): string | undefined {
  const safeActual = safeSourceUrl(actualUrl);
  if (safeActual === undefined) return undefined;

  const safeCanonical = safeSourceUrl(value, safeActual);
  if (safeCanonical === undefined) return undefined;

  return new URL(safeCanonical).origin === new URL(safeActual).origin ? safeCanonical : undefined;
}
