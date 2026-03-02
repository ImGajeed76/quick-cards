export interface Flashcard {
  term: string;
  definition: string;
}

export interface FlashcardSet {
  title: string;
  description: string;
  cards: Flashcard[];
}
