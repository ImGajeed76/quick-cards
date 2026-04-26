<script lang="ts">
  import { Plus, X } from "@lucide/svelte";

  interface Props {
    tags: string[];
    onAdd: (tag: string) => void;
    onRemove: (tag: string) => void;
  }

  let { tags, onAdd, onRemove }: Props = $props();

  let editing = $state(false);
  let input = $state("");
  let inputEl = $state<HTMLInputElement | null>(null);

  async function startEditing() {
    editing = true;
    await Promise.resolve();
    inputEl?.focus();
  }

  function commit() {
    const value = input.trim();
    if (value) onAdd(value);
    input = "";
    editing = false;
  }

  function cancel() {
    input = "";
    editing = false;
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    }
  }
</script>

<div class="flex flex-wrap items-center gap-1.5">
  {#each tags as tag (tag)}
    <span
      class="bg-muted/40 text-muted-foreground inline-flex items-center gap-1 rounded-full
        border px-2 py-0.5 text-xs"
    >
      {tag}
      <button
        type="button"
        onclick={() => onRemove(tag)}
        aria-label={`Remove tag ${tag}`}
        class="hover:text-destructive rounded-full transition-colors"
      >
        <X class="h-3 w-3" />
      </button>
    </span>
  {/each}

  {#if editing}
    <input
      bind:this={inputEl}
      bind:value={input}
      onblur={commit}
      onkeydown={handleKey}
      placeholder="tag-name"
      aria-label="Add tag"
      class="border-input focus-visible:bg-background h-6 rounded-full border bg-transparent
        px-2 text-xs outline-none"
    />
  {:else}
    <button
      type="button"
      onclick={() => {
        void startEditing();
      }}
      class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1
        rounded-full border border-dashed px-2 py-0.5 text-xs transition-colors"
    >
      <Plus class="h-3 w-3" />
      Tag
    </button>
  {/if}
</div>
