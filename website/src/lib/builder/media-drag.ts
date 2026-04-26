/**
 * Custom dataTransfer MIME type for media drags from the sidebar to a card
 * field. The payload is the Anki reference string to insert at the cursor
 * (e.g. `<img src="...">` or `[sound:...]`), produced from the media's
 * filename + mimeType.
 */
export const MEDIA_DRAG_TYPE = "application/x-quickcards-media";

import type { BuilderMedia } from "./types";

/** Build the Anki reference token for a media file based on its mime type. */
export function referenceFor(media: BuilderMedia): string {
  if (media.mimeType.startsWith("image/")) return `<img src="${media.filename}">`;
  if (media.mimeType.startsWith("audio/")) return `[sound:${media.filename}]`;
  return media.filename;
}
