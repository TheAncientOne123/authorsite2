export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
};

export type ChatSource = {
  title: string;
  permalink: string;
};

/** Payload enviado a POST /api/chat (repo authorsite-chat-api en Vercel). */
export type ChatRequest = {
  message: string;
  history?: Array<{role: ChatRole; content: string}>;
};

/** Respuesta esperada del endpoint /api/chat. */
export type ChatResponse = {
  reply: string;
  sources?: ChatSource[];
};

export type ChatApiError = {
  error: string;
  status?: number;
};
