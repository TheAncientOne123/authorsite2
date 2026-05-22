import type {VercelRequest, VercelResponse} from '@vercel/node';
import {corsHeaders, isAllowedOrigin} from '../lib/chat/cors';
import {entriesToSources, formatContext, retrieveRelevantEntries} from '../lib/chat/corpus';
import {generateReply} from '../lib/chat/gemini';
import type {ChatRequest, ChatRole} from '../lib/chat/types';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 10;
const MAX_TURN_LENGTH = 2000;

function json(res: VercelResponse, status: number, body: unknown, origin?: string) {
  res.status(status).setHeader('Content-Type', 'application/json');
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    res.setHeader(key, value);
  }
  res.json(body);
}

function isValidRole(role: unknown): role is ChatRole {
  return role === 'user' || role === 'assistant';
}

function parseBody(body: unknown): ChatRequest | null {
  if (!body || typeof body !== 'object') return null;
  const {message, history} = body as ChatRequest;
  if (typeof message !== 'string' || !message.trim()) return null;
  if (message.length > MAX_MESSAGE_LENGTH) return null;

  if (history !== undefined) {
    if (!Array.isArray(history) || history.length > MAX_HISTORY_TURNS) return null;
    for (const turn of history) {
      if (!turn || typeof turn !== 'object') return null;
      if (!isValidRole(turn.role) || typeof turn.content !== 'string') return null;
      if (turn.content.length > MAX_TURN_LENGTH) return null;
    }
  }

  return {
    message: message.trim(),
    history: history?.map((t) => ({role: t.role, content: t.content.trim()})),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;

  if (req.method === 'OPTIONS') {
    if (!isAllowedOrigin(origin)) {
      return res.status(403).end();
    }
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      res.setHeader(key, value);
    }
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, {error: 'Método no permitido'}, origin);
  }

  if (!isAllowedOrigin(origin)) {
    return json(res, 403, {error: 'Origen no permitido'}, origin);
  }

  const payload = parseBody(req.body);
  if (!payload) {
    return json(res, 400, {error: 'Solicitud inválida'}, origin);
  }

  try {
    const entries = retrieveRelevantEntries(payload.message);
    if (entries.length === 0) {
      return json(
        res,
        200,
        {
          reply:
            'No encontré información suficiente en el compendio para responder esa pregunta. Prueba reformularla o pregunta por un personaje, lugar o evento concreto de Crónicas de Sangre y Sombra.',
          sources: [],
        },
        origin,
      );
    }

    const context = formatContext(entries);
    const reply = await generateReply(context, payload.message, payload.history ?? []);

    return json(
      res,
      200,
      {
        reply,
        sources: entriesToSources(entries),
      },
      origin,
    );
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes('GEMINI_API_KEY')
        ? 'Servicio de chat no configurado.'
        : 'Error interno al procesar la pregunta.';
    console.error('[api/chat]', err);
    return json(res, 500, {error: message}, origin);
  }
}
