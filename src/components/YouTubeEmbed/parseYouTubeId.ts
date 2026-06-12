/**
 * Extrae el ID de vídeo (11 caracteres) desde un id suelto o una URL de YouTube.
 */
export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const fromQuery = u.searchParams.get('v');
      if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;

      const embed = u.pathname.match(/\/embed\/([\w-]{11})/);
      if (embed) return embed[1];

      const shorts = u.pathname.match(/\/shorts\/([\w-]{11})/);
      if (shorts) return shorts[1];

      const live = u.pathname.match(/\/live\/([\w-]{11})/);
      if (live) return live[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youTubeEmbedUrl(videoId: string, startSeconds?: number): string {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`;
  if (startSeconds != null && startSeconds > 0) {
    return `${base}?start=${Math.floor(startSeconds)}`;
  }
  return base;
}
