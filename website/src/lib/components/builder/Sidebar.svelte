<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Plus } from "@lucide/svelte";
  import DeckTree from "./DeckTree.svelte";
  import NoteTypesSection from "./NoteTypesSection.svelte";
  import type { DeckNode, DropPosition } from "$lib/builder/deck-tree";
  import type { BuilderModel, Id, Selection } from "$lib/builder/types";

  interface Props {
    forest: DeckNode[];
    selection: Selection;
    canDuplicateAsWriting: (id: Id) => boolean;
    onSelect: (id: Id) => void;
    onAddRoot: () => void;
    onAddSubdeck: (parentId: Id) => void;
    onRename: (id: Id, name: string) => void;
    onDelete: (id: Id) => void;
    onDuplicateWriting: (id: Id, direction: "termDef" | "defTerm" | "both") => void;
    onMove: (sourceId: Id, targetId: Id, position: DropPosition) => void;
    /** All models in the package (built-ins + custom). */
    models: BuilderModel[];
    /** Map from model id to count of decks/notes referencing it. */
    modelUsage: Record<Id, number>;
    onSelectModel: (id: Id) => void;
    onAddCustomModel: () => void;
  }

  let {
    forest,
    selection,
    canDuplicateAsWriting,
    onSelect,
    onAddRoot,
    onAddSubdeck,
    onRename,
    onDelete,
    onDuplicateWriting,
    onMove,
    models,
    modelUsage,
    onSelectModel,
    onAddCustomModel,
  }: Props = $props();
</script>

<aside class="bg-background flex h-full w-64 shrink-0 flex-col border-r">
  <div class="flex items-center justify-between px-4 pt-4 pb-2">
    <h2 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Decks</h2>
    <Button
      variant="ghost"
      size="icon"
      onclick={onAddRoot}
      aria-label="Add deck at root"
      class="h-7 w-7"
    >
      <Plus class="h-4 w-4" />
    </Button>
  </div>

  <div class="flex-1 overflow-y-auto">
    <div class="px-2 pb-2">
      <DeckTree
        {forest}
        {selection}
        {canDuplicateAsWriting}
        {onSelect}
        {onRename}
        {onAddSubdeck}
        {onDelete}
        {onDuplicateWriting}
        {onMove}
      />
    </div>

    <div class="border-t pt-1">
      <NoteTypesSection
        {models}
        usageByModel={modelUsage}
        {selection}
        onSelect={onSelectModel}
        onAddCustom={onAddCustomModel}
      />
    </div>
  </div>
</aside>
