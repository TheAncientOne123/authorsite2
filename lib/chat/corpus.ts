import fs from 'node:fs';
import path from 'node:path';
import type {ChatSource, LoreCorpus, LoreEntry} from './types';

const STOPWORDS = new Set([
  'que', 'como', 'cual', 'cuales', 'quien', 'quienes', 'donde', 'cuando', 'porque', 'para',
  'con', 'sin', 'sobre', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'del', 'las', 'los', 'una', 'uno', 'unos', 'unas', 'por', 'mas', 'muy', 'tan', 'hay',
  'fue', 'ser', 'sus', 'the', 'and', 'what', 'who', 'how',
]);

let cachedCorpus: LoreCorpus | null = null;

function corpusPath(): string {
  return path.join(process.cwd(), 'data', 'lore-corpus.json');
}

export function loadCorpus(): LoreCorpus {
  if (cachedCorpus) return cachedCorpus;
  const raw = fs.readFileSync(corpusPath(), 'utf8');
  cachedCorpus = JSON.parse(raw) as LoreCorpus;
  return cachedCorpus;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function scoreEntry(entry: LoreEntry, tokens: string[]): number {
  if (tokens.length === 0) return 0;

  const titleNorm = entry.title.toLowerCase();
  const categoryNorm = entry.category.toLowerCase();
  const libroNorm = (entry.libro ?? '').toLowerCase();
  const textNorm = entry.text.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (titleNorm.includes(token)) score += 10;
    if (categoryNorm.includes(token)) score += 5;
    if (libroNorm.includes(token)) score += 5;
    if (textNorm.includes(token)) score += 1;
  }
  return score;
}

export function retrieveRelevantEntries(query: string, limit = 8): LoreEntry[] {
  const corpus = loadCorpus();
  const tokens = tokenize(query);
  if (tokens.length === 0) return corpus.entries.slice(0, limit);

  return corpus.entries
    .map((entry) => ({entry, score: scoreEntry(entry, tokens)}))
    .filter(({score}) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({entry}) => entry);
}

export function formatContext(entries: LoreEntry[]): string {
  const chunks = entries.map((entry) => {
    const snippet = entry.text.length > 800 ? `${entry.text.slice(0, 800)}…` : entry.text;
    const libroLine = entry.libro ? `\nLibro: ${entry.libro}` : '';
    return `### ${entry.title}\nCategoría: ${entry.category}${libroLine}\n${snippet}`;
  });
  return chunks.join('\n\n---\n\n');
}

export function entriesToSources(entries: LoreEntry[]): ChatSource[] {
  return entries.map((e) => ({title: e.title, permalink: e.permalink}));
}
