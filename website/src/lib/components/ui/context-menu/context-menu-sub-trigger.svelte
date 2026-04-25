<script lang="ts">
  import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
  import type { Snippet } from "svelte";

  let {
    ref = $bindable(null),
    class: className,
    inset,
    children,
    ...restProps
  }: WithoutChildrenOrChild<ContextMenuPrimitive.SubTriggerProps> & {
    inset?: boolean;
    children?: Snippet;
  } = $props();
</script>

<ContextMenuPrimitive.SubTrigger
  bind:ref
  data-slot="context-menu-sub-trigger"
  data-inset={inset ? "" : undefined}
  class={cn(
    "data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
  <ChevronRight class="ml-auto h-4 w-4" />
</ContextMenuPrimitive.SubTrigger>
