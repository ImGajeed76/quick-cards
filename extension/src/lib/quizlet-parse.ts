import type { CardSideMedia, Flashcard } from "./types";

// Media type IDs returned by Quizlet's studiable-item-documents endpoint.
// 1 = text (with optional auto TTS), 2 = image, 4 = user-recorded audio.
// Type 3 has not been observed in the wild.
type ApiMediaText = {
  type: 1;
  plainText?: string | null;
  languageCode?: string | null;
  ttsUrl?: string | null;
  ttsSlowUrl?: string | null;
  richText?: string | null;
};
type ApiMediaImage = {
  type: 2;
  url?: string | null;
  width?: number;
  height?: number;
  code?: string;
};
type ApiMediaAudio = {
  type: 4;
  url?: string | null;
  code?: string;
};
type ApiMedia = ApiMediaText | ApiMediaImage | ApiMediaAudio | { type: number };

interface ApiCardSide {
  sideId?: number;
  label?: string;
  media?: ApiMedia[];
}

export interface StudiableItem {
  cardSides?: ApiCardSide[];
}

interface ExtractedSide {
  text: string;
  media: CardSideMedia;
}

function extractSide(side: ApiCardSide | undefined): ExtractedSide {
  const media: CardSideMedia = {};
  let text = "";

  for (const entry of side?.media ?? []) {
    if (entry.type === 1) {
      const t = entry as ApiMediaText;
      if (!text && t.plainText) text = t.plainText;
      if (t.ttsUrl && !media.tts) media.tts = t.ttsUrl;
      if (t.ttsSlowUrl && !media.ttsSlow) media.ttsSlow = t.ttsSlowUrl;
      if (t.languageCode && !media.language) media.language = t.languageCode;
    } else if (entry.type === 2) {
      const i = entry as ApiMediaImage;
      if (i.url && !media.image) media.image = i.url;
    } else if (entry.type === 4) {
      const a = entry as ApiMediaAudio;
      if (a.url && !media.audio) media.audio = a.url;
    }
  }

  return { text, media };
}

function hasMedia(media: CardSideMedia): boolean {
  return Boolean(media.image || media.audio || media.tts || media.ttsSlow);
}

/**
 * Convert one studiable item from Quizlet's API into a Flashcard, or null if
 * both sides are completely empty (no text and no media worth keeping).
 */
export function extractCardFromItem(item: StudiableItem): Flashcard | null {
  const front = extractSide(item.cardSides?.[0]);
  const back = extractSide(item.cardSides?.[1]);

  const card: Flashcard = {
    term: front.text,
    definition: back.text,
  };
  if (hasMedia(front.media)) card.termMedia = front.media;
  if (hasMedia(back.media)) card.definitionMedia = back.media;

  if (!card.term && !card.definition && !card.termMedia && !card.definitionMedia) {
    return null;
  }
  return card;
}
