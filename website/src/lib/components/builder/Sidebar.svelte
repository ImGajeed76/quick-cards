<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Plus } from "@lucide/svelte";
  import DeckTree from "./DeckTree.svelte";
  import NoteTypesSection from "./NoteTypesSection.svelte";
  import PresetsSection from "./PresetsSection.svelte";
  import MediaSection from "./MediaSection.svelte";
  import type { DeckNode, DropPosition } from "$lib/builder/deck-tree";
  import type {
    BuilderConfig,
    BuilderMedia,
    BuilderModel,
    Id,
    Selection,
  } from "$lib/builder/types";

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
    onDuplicateBuiltinModel: (id: Id) => void;
    onRenameModel: (id: Id, name: string) => void;
    onDeleteModel: (id: Id) => void;
    /** All configs (presets) in the package. */
    configs: BuilderConfig[];
    /** Map from config id to count of decks referencing it. */
    configUsage: Record<Id, number>;
    onSelectConfig: (id: Id) => void;
    onAddConfig: () => void;
    onRenameConfig: (id: Id, name: string) => void;
    onDeleteConfig: (id: Id) => void;
    /** All media files in the package. */
    media: BuilderMedia[];
    /** Map from media filename to count of notes referencing it. */
    mediaUsage: Record<string, number>;
    onSelectMedia: (id: Id) => void;
    onAddMedia: (file: File) => void;
    onRenameMedia: (id: Id, filename: string) => void;
    onDeleteMedia: (id: Id) => void;
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
    onDuplicateBuiltinModel,
    onRenameModel,
    onDeleteModel,
    configs,
    configUsage,
    onSelectConfig,
    onAddConfig,
    onRenameConfig,
    onDeleteConfig,
    media,
    mediaUsage,
    onSelectMedia,
    onAddMedia,
    onRenameMedia,
    onDeleteMedia,
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
        onDuplicateBuiltin={onDuplicateBuiltinModel}
        onRename={onRenameModel}
        onDelete={onDeleteModel}
      />
      <PresetsSection
        {configs}
        usageByConfig={configUsage}
        {selection}
        onSelect={onSelectConfig}
        onAdd={onAddConfig}
        onRename={onRenameConfig}
        onDelete={onDeleteConfig}
      />
      <MediaSection
        {media}
        usageByFilename={mediaUsage}
        {selection}
        onSelect={onSelectMedia}
        onAdd={onAddMedia}
        onRename={onRenameMedia}
        onDelete={onDeleteMedia}
      />
    </div>
  </div>
</aside>
