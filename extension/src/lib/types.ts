export interface CardSideMedia {
  /** Image URL. May be a static .jpg/.png or an animated .gif (Quizlet "video" cards). */
  image?: string;
  /** User-recorded audio URL (mp3), when the set creator added voice for this side. */
  audio?: string;
  /** Auto-generated TTS audio URL for the side's text, if Quizlet provides one. */
  tts?: string;
  /** Slow-speed TTS variant of `tts`. */
  ttsSlow?: string;
  /** Language code Quizlet associates with the text (e.g. "en", "es"). */
  language?: string;
}

export interface Flashcard {
  term: string;
  definition: string;
  termMedia?: CardSideMedia;
  definitionMedia?: CardSideMedia;
}

export interface FlashcardSet {
  title: string;
  description: string;
  cards: Flashcard[];
}
