export type ChatRole = 'user' | 'assistant';

export type ChatRequest = {
  message: string;
  history?: Array<{role: ChatRole; content: string}>;
};

export type ChatSource = {
  title: string;
  permalink: string;
};

export type ChatResponse = {
  reply: string;
  sources?: ChatSource[];
};

export type LoreEntry = {
  id: string;
  title: string;
  category: string;
  libro?: string;
  permalink: string;
  text: string;
  excerpt: string;
};

export type LoreCorpus = {
  generatedAt: string;
  universe: string;
  entries: LoreEntry[];
};
