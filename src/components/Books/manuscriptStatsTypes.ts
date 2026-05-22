export type CharacterTotal = {
  id: string;
  label: string;
  count: number;
  share_percent: number;
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
    }[];
  };
  top_words: {word: string; count: number}[];
};
