export type CharacterTotal = {
  id: string;
  label: string;
  count: number;
  share_percent: number;
};

export type VocabularyTerm = {
  word: string;
  count: number;
  chapters?: number;
};

export type ChapterVocabulary = {
  index: number;
  title: string;
  unique_words: number;
  lexical_richness_ttr: number;
  top_terms: {word: string; count: number}[];
};

export type ManuscriptStats = {
  title: string;
  analyzed_at: string;
  lang: string;
  global: {
    words: number;
    characters_with_spaces: number;
    characters_without_spaces: number;
    lines: number;
    sentences: number;
    paragraphs: number;
    reading_time_minutes: number;
    avg_words_per_sentence: number;
    chapters_detected: number;
    chapters_reliable?: boolean;
  };
  extremes: {
    longest_chapter: {title: string; words: number} | null;
    longest_paragraph_words: number;
    longest_paragraph_preview: string;
    longest_sentence_words: number;
    longest_sentence_preview: string;
  };
  chapters: {
    index: number;
    title: string;
    words: number;
    page_start?: number;
    page_end?: number;
  }[];
  chapters_source?: string;
  characters: {
    totals: CharacterTotal[];
    by_chapter: {
      index: number;
      title: string;
      mentions: Record<string, {label: string; count: number}>;
      characters_present?: string[];
    }[];
  };
  vocabulary?: {
    unique_words: number;
    hapax_legomena: number;
    frequent_terms: VocabularyTerm[];
    by_chapter: ChapterVocabulary[];
  };
};
