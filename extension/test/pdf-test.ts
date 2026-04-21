import { saveFlashcardsPDF } from "../src/lib/pdf-flashcards";
import { saveListPDF } from "../src/lib/pdf-list";
import type { FlashcardSet } from "../src/lib/types";

// Mock data with various lengths to test text fitting
const mockSet: FlashcardSet = {
  title: "Spanish Vocabulary - Chapter 5",
  description:
    "Common Spanish words and phrases for everyday conversation. This set covers greetings, basic questions, and essential vocabulary for beginners.",
  cards: [
    { term: "Hola", definition: "Hello" },
    { term: "Buenos dias", definition: "Good morning" },
    { term: "Buenas tardes", definition: "Good afternoon" },
    { term: "Buenas noches", definition: "Good night / Good evening" },
    { term: "Adios", definition: "Goodbye" },
    { term: "Hasta luego", definition: "See you later" },
    { term: "Por favor", definition: "Please" },
    { term: "Gracias", definition: "Thank you" },
    { term: "De nada", definition: "You're welcome" },
    { term: "Lo siento", definition: "I'm sorry" },
    {
      term: "Como estas?",
      definition: "How are you? (informal)",
    },
    {
      term: "Como se llama usted?",
      definition: "What is your name? (formal)",
    },
    {
      term: "Me llamo...",
      definition: "My name is...",
    },
    {
      term: "Mucho gusto",
      definition: "Nice to meet you / Pleased to meet you",
    },
    { term: "Si", definition: "Yes" },
    { term: "No", definition: "No" },
    {
      term: "No entiendo",
      definition: "I don't understand",
    },
    {
      term: "Puede repetir, por favor?",
      definition: "Can you repeat that, please?",
    },
    {
      term: "Donde esta el bano?",
      definition: "Where is the bathroom?",
    },
    {
      term: "Cuanto cuesta?",
      definition: "How much does it cost?",
    },
    // A longer example to test wrapping
    {
      term: "El perro corre rapidamente por el parque",
      definition:
        "The dog runs quickly through the park. This is a longer definition to test how the text wrapping works in the PDF generator.",
    },
    {
      term: "Necesito ayuda con mi tarea de espanol",
      definition: "I need help with my Spanish homework",
    },
  ],
};

// Mock data with really long sentences to stress test
const longSentencesSet: FlashcardSet = {
  title: "Complex Medical Terminology and Definitions",
  description:
    "This is a comprehensive set of advanced medical terminology designed to test the PDF generator's ability to handle extremely long terms and definitions that require significant text wrapping and font size adjustments.",
  cards: [
    {
      term: "Pneumonoultramicroscopicsilicovolcanoconiosis",
      definition:
        "A lung disease caused by the inhalation of very fine silica dust, causing inflammation in the lungs. This is one of the longest words in the English language and is used to describe a type of pneumoconiosis.",
    },
    {
      term: "Electroencephalographically",
      definition:
        "In a manner relating to the recording and measurement of electrical activity in different parts of the brain using electrodes placed on the scalp, which produces a tracing called an electroencephalogram.",
    },
    {
      term: "The mitochondria is the powerhouse of the cell and is responsible for producing ATP through cellular respiration",
      definition:
        "Mitochondria are membrane-bound organelles found in the cytoplasm of eukaryotic cells that generate most of the cell's supply of adenosine triphosphate (ATP), which is used as a source of chemical energy. They are sometimes referred to as the 'powerhouses' of the cell.",
    },
    {
      term: "Deoxyribonucleic acid (DNA) double helix structure discovered by Watson and Crick",
      definition:
        "The molecular structure of DNA consists of two polynucleotide chains that coil around each other to form a double helix, with the chains running in opposite directions (antiparallel). The structure was famously discovered by James Watson and Francis Crick in 1953, building on X-ray diffraction data from Rosalind Franklin.",
    },
    {
      term: "Supercalifragilisticexpialidocious",
      definition:
        "A nonsense word from the 1964 Disney musical film Mary Poppins, used especially by children to express approval or to represent the longest word one knows. Even though the sound of it is something quite atrocious, if you say it loud enough you'll always sound precocious!",
    },
    {
      term: "Antidisestablishmentarianism in nineteenth-century British politics",
      definition:
        "A political position that originated in 19th-century Britain in opposition to proposals for the disestablishment of the Church of England, meaning the removal of the Anglican Church's status as the state church of England, Ireland, and Wales.",
    },
    {
      term: "Floccinaucinihilipilification",
      definition:
        "The action or habit of estimating something as worthless. This word is often cited as one of the longest non-technical words in the English language, and is derived from four Latin words meaning 'little', 'nothing', 'nothing', and 'a hair'.",
    },
    {
      term: "Hippopotomonstrosesquippedaliophobia is the fear of long words which is quite ironic when you think about it",
      definition:
        "An informal term for the irrational fear of long words, characterized by anxiety, avoidance behavior, and panic attacks when confronted with lengthy vocabulary. The term itself is deliberately ironic, being an extremely long word used to describe the fear of long words.",
    },
  ],
};

async function runTests() {
  console.log("Generating test PDFs...\n");

  // Ensure output directory exists
  await Bun.write("test/output/.gitkeep", "");

  // Generate flashcards PDF
  console.log("1. Generating flashcards PDF (2x4 grid, double-sided)...");
  await saveFlashcardsPDF(mockSet, "test/output/flashcards.pdf");
  console.log("   -> Saved to test/output/flashcards.pdf");

  // Generate vocabulary list PDF
  console.log("\n2. Generating vocabulary list PDF (table format)...");
  await saveListPDF(mockSet, "test/output/vocab-list.pdf");
  console.log("   -> Saved to test/output/vocab-list.pdf");

  // Generate PDFs with long sentences
  console.log("\n3. Generating flashcards PDF with LONG sentences...");
  await saveFlashcardsPDF(longSentencesSet, "test/output/flashcards-long.pdf");
  console.log("   -> Saved to test/output/flashcards-long.pdf");

  console.log("\n4. Generating vocabulary list PDF with LONG sentences...");
  await saveListPDF(longSentencesSet, "test/output/vocab-list-long.pdf");
  console.log("   -> Saved to test/output/vocab-list-long.pdf");

  console.log("\nDone! Open the PDF files to verify the output.");
}

runTests().catch(console.error);
