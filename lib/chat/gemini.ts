import {GoogleGenerativeAI} from '@google/generative-ai';
import type {ChatRole} from './types';

const SYSTEM_PROMPT = `Eres un asistente del compendio "El Códice", especializado en Crónicas de Sangre y Sombra.
Responde SIEMPRE en español.

Reglas:
- Usa ÚNICAMENTE la información del contexto proporcionado.
- Si el contexto no alcanza, dilo claramente. No inventes personajes, eventos ni relaciones.
- Las respuestas pueden contener spoilers; no los ocultes si el usuario pregunta directamente.
- Sé conciso pero informativo (2–4 párrafos como máximo salvo que pidan detalle).
- Si mencionas un artículo del compendio, usa el nombre exacto del título.`;

type HistoryTurn = {role: ChatRole; content: string};

export async function generateReply(
  context: string,
  message: string,
  history: HistoryTurn[] = [],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada');
  }

  const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({model: modelName});

  const parts: string[] = [
    `${SYSTEM_PROMPT}\n\n--- CONTEXTO DEL COMPENDIO ---\n${context}`,
  ];

  for (const turn of history.slice(-8)) {
    const label = turn.role === 'user' ? 'Usuario' : 'Asistente';
    parts.push(`${label}: ${turn.content}`);
  }

  parts.push(`Usuario: ${message}`);

  const result = await model.generateContent({
    contents: [{role: 'user', parts: [{text: parts.join('\n\n')}]}],
  });

  const text = result.response.text()?.trim();
  if (!text) {
    throw new Error('Gemini devolvió una respuesta vacía');
  }
  return text;
}
