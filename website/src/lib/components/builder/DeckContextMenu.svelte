<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { Pencil, Plus, Trash2, Copy } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  interface Props {
    /** Trigger element (the deck row). */
    children: Snippet;
    /** When non-null, "Duplicate as writing deck" is enabled and shows the submenu. */
    canDuplicateAsWriting: boolean;
    onRename: () => void;
    onAddSubdeck: () => void;
    onDelete: () => void;
    onDuplicateWriting: (direction: "termDef" | "defTerm" | "both") => void;
  }

  let {
    children,
    canDuplicateAsWriting,
    onRename,
    onAddSubdeck,
    onDelete,
    onDuplicateWriting,
  }: Props = $props();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {@render children()}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-56">
    <ContextMenu.Item onSelect={onRename}>
      <Pencil />
      Rename
    </ContextMenu.Item>
    <ContextMenu.Item onSelect={onAddSubdeck}>
      <Plus />
      Add subdeck
    </ContextMenu.Item>

    {#if canDuplicateAsWriting}
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger>
          <Copy />
          Duplicate as writing deck
        </ContextMenu.SubTrigger>
        <ContextMenu.SubContent class="w-48">
          <ContextMenu.Item onSelect={() => onDuplicateWriting("termDef")}>
            Term &rarr; Definition
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => onDuplicateWriting("defTerm")}>
            Definition &rarr; Term
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => onDuplicateWriting("both")}>
            Both directions
          </ContextMenu.Item>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>
    {/if}

    <ContextMenu.Separator />

    <ContextMenu.Item variant="destructive" onSelect={onDelete}>
      <Trash2 />
      Delete deck
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
