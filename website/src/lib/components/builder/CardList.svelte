<script lang="ts">
  import { tick } from "svelte";
  import { Plus } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import CardRow from "./CardRow.svelte";
  import type { BuilderNote, Id } from "$lib/builder/types";

  interface Props {
    notes: BuilderNote[];
    onAdd: () => Id;
    onUpdateField: (noteId: Id, fieldIndex: number, value: string) => void;
    onDuplicate: (noteId: Id) => Id;
    onDelete: (noteId: Id) => void;
  }

  let { notes, onAdd, onUpdateField, onDuplicate, onDelete }: Props = $props();

  // Notes already arrive ordered, but resort defensively in case the parent
  // hasn't sorted (and to keep this component self-contained).
  const sorted = $derived([...notes].sort((a, b) => a.order - b.order));

  let listEl = $state<HTMLDivElement | null>(null);

  async function focusNote(id: Id, fieldIndex = 0): Promise<void> {
    await tick();
    const sel = `[data-note-id="${id}"] textarea[data-field-index="${fieldIndex}"]`;
    const target = listEl?.querySelector<HTMLTextAreaElement>(sel);
    target?.focus();
  }

  async function add(): Promise<void> {
    const id = onAdd();
    await focusNote(id, 0);
  }

  async function duplicate(noteId: Id): Promise<void> {
    const id = onDuplicate(noteId);
    await focusNote(id, 0);
  }

  async function tabOffEnd(): Promise<void> {
    await add();
  }
</script>

<div bind:this={listEl} class="flex flex-col">
  {#if sorted.length === 0}
    <div class="text-muted-foreground py-12 text-center text-sm">
      No cards yet.
      <button
        type="button"
        class="text-primary hover:underline"
        onclick={() => {
          void add();
        }}
      >
        Add your first card
      </button>
      .
    </div>
  {:else}
    {#each sorted as note, i (note.id)}
      <div data-note-id={note.id}>
        <CardRow
          {note}
          index={i + 1}
          isLast={i === sorted.length - 1}
          onUpdateField={(fi, v) => onUpdateField(note.id, fi, v)}
          onDuplicate={() => {
            void duplicate(note.id);
          }}
          onDelete={() => onDelete(note.id)}
          onTabOffEnd={() => {
            void tabOffEnd();
          }}
        />
      </div>
    {/each}
  {/if}

  <div class="px-3 pt-3 pb-2">
    <Button
      variant="ghost"
      size="sm"
      onclick={() => {
        void add();
      }}
      class="text-muted-foreground hover:text-foreground -ml-2"
    >
      <Plus class="mr-1 h-4 w-4" />
      Add card
    </Button>
  </div>
</div>
