// Re-exports the template files as plain strings.
//
// Vite resolves the `?raw` suffix natively, returning the file's content as a
// string at build time. The extension's copy of this module uses Bun's
// `with { type: "text" }` form because Bun bundles the extension; the two
// dialects are different but the runtime shape is the same.

import card1Front from "./card1-front.html?raw";
import card1Back from "./card1-back.html?raw";
import card2Front from "./card2-front.html?raw";
import card2Back from "./card2-back.html?raw";
import card3Front from "./card3-front.html?raw";
import card3Back from "./card3-back.html?raw";
import card4Front from "./card4-front.html?raw";
import card4Back from "./card4-back.html?raw";
import styling from "./styling.css?raw";

export {
  card1Front,
  card1Back,
  card2Front,
  card2Back,
  card3Front,
  card3Back,
  card4Front,
  card4Back,
  styling,
};
