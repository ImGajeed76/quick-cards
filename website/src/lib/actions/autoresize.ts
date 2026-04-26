/**
 * Svelte action that grows a textarea to fit its content. Pass the bound
 * value as the parameter so external changes (undo/redo, programmatic edits)
 * trigger a re-measure.
 *
 * Usage: `<textarea bind:value use:autoresize={value} />`
 */

export function autoresize(
  node: HTMLTextAreaElement,
  _value: string,
): { update(value: string): void; destroy(): void } {
  function resize(): void {
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }

  resize();
  node.addEventListener("input", resize);

  return {
    update() {
      // Wait for the bound value to land on the DOM, then re-measure.
      requestAnimationFrame(resize);
    },
    destroy() {
      node.removeEventListener("input", resize);
    },
  };
}
