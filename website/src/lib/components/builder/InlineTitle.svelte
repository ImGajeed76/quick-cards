<script lang="ts">
  import { tick } from "svelte";

  interface Props {
    value: string;
    onSave: (next: string) => void;
    /** Tailwind classes that style the heading. Applied to both the display
     * span and the edit-mode input so they look identical. */
    class?: string;
    placeholder?: string;
    ariaLabel?: string;
  }

  let { value, onSave, class: className = "", placeholder, ariaLabel }: Props = $props();

  let editing = $state(false);
  // svelte-ignore state_referenced_locally
  let local = $state(value);
  let inputEl = $state<HTMLInputElement | null>(null);

  async function start() {
    local = value;
    editing = true;
    await tick();
    inputEl?.focus();
    inputEl?.select();
  }

  function commit() {
    const next = local.trim();
    if (next && next !== value) onSave(next);
    editing = false;
  }

  function cancel() {
    local = value;
    editing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }
</script>

{#if editing}
  <input
    bind:this={inputEl}
    bind:value={local}
    onblur={commit}
    onkeydown={handleKeydown}
    aria-label={ariaLabel}
    type="text"
    class="w-full bg-transparent p-0 outline-none focus:outline-none {className}"
  />
{:else}
  <button
    type="button"
    onclick={start}
    aria-label={ariaLabel ? `${ariaLabel} (click to edit)` : "Edit title"}
    class="block w-full cursor-text bg-transparent p-0 text-left {className}"
  >
    {#if value}
      {value}
    {:else}
      <span class="text-muted-foreground">{placeholder ?? "Untitled"}</span>
    {/if}
  </button>
{/if}
