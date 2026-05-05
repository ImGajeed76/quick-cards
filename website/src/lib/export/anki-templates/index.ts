// Re-exports the template files as plain strings.
//
// Bun honors `with { type: "text" }` at runtime (the imported value IS a
// string), but bun-types declares `*.html` as `HTMLBundle` for the dev-server
// HTML-bundling path, so TypeScript flags the imports here. We cast through
// `unknown` once and expose typed string constants for the rest of the code.

import card1FrontRaw from "./card1-front.html" with { type: "text" };
import card1BackRaw from "./card1-back.html" with { type: "text" };
import card2FrontRaw from "./card2-front.html" with { type: "text" };
import card2BackRaw from "./card2-back.html" with { type: "text" };
import card3FrontRaw from "./card3-front.html" with { type: "text" };
import card3BackRaw from "./card3-back.html" with { type: "text" };
import card4FrontRaw from "./card4-front.html" with { type: "text" };
import card4BackRaw from "./card4-back.html" with { type: "text" };
import stylingRaw from "./styling.css" with { type: "text" };

export const card1Front = card1FrontRaw as unknown as string;
export const card1Back = card1BackRaw as unknown as string;
export const card2Front = card2FrontRaw as unknown as string;
export const card2Back = card2BackRaw as unknown as string;
export const card3Front = card3FrontRaw as unknown as string;
export const card3Back = card3BackRaw as unknown as string;
export const card4Front = card4FrontRaw as unknown as string;
export const card4Back = card4BackRaw as unknown as string;
export const styling = stylingRaw as unknown as string;
