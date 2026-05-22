import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type {ChatApiError, ChatRequest, ChatResponse} from './types';

const DEFAULT_TIMEOUT_MS = 45_000;

function getChatApiUrl(customFields: Record<string, unknown> | undefined): string {
  const url = customFields?.chatApiUrl;
  return typeof url === 'string' ? url.trim() : '';
}

export function useChatApiUrl(): string {
  const {siteConfig} = useDocusaurusContext();
  return getChatApiUrl(siteConfig.customFields as Record<string, unknown> | undefined);
}

export async function postChatMessage(
  apiUrl: string,
  payload: ChatRequest,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  if (!apiUrl) {
    const err: ChatApiError = {
      error: 'El chat no está configurado. Falta CHAT_API_URL en el despliegue.',
    };
    throw err;
  }

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      signal,
    });
  } catch (cause) {
    const err: ChatApiError = {
      error:
        cause instanceof DOMException && cause.name === 'AbortError'
          ? 'La solicitud tardó demasiado. Inténtalo de nuevo.'
          : 'No se pudo conectar con el servicio de chat. Comprueba que la API esté desplegada.',
    };
    throw err;
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Error del servidor (${response.status}).`;
    const err: ChatApiError = {error: message, status: response.status};
    throw err;
  }

  if (!body || typeof body !== 'object' || !('reply' in body) || typeof body.reply !== 'string') {
    const err: ChatApiError = {error: 'Respuesta inválida del servicio de chat.'};
    throw err;
  }

  const sources =
    'sources' in body && Array.isArray(body.sources)
      ? body.sources.filter(
          (s): s is {title: string; permalink: string} =>
            !!s &&
            typeof s === 'object' &&
            typeof s.title === 'string' &&
            typeof s.permalink === 'string',
        )
      : undefined;

  return {reply: body.reply, sources};
}

export function createChatAbortSignal(timeoutMs = DEFAULT_TIMEOUT_MS): {
  signal: AbortSignal;
  cancel: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}
