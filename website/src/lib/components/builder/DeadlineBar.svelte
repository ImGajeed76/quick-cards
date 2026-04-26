<script lang="ts">
  import { CalendarClock } from "@lucide/svelte";
  import { daysUntil } from "$lib/builder/defaults";
  import type { DeadlineSpec } from "$lib/builder/types";

  interface Props {
    deadline: DeadlineSpec | null;
    onOpen: () => void;
  }

  let { deadline, onOpen }: Props = $props();

  const summary = $derived.by(() => {
    if (!deadline) return null;
    const days = daysUntil(deadline);
    const date = formatDate(deadline.date);
    if (days <= 0) return { date, label: "Past due" };
    return { date, label: `${days} ${days === 1 ? "day" : "days"} left` };
  });

  function formatDate(iso: string): string {
    // YYYY-MM-DD parsed in local time, so the displayed month/day matches the
    // user's calendar selection without a UTC drift.
    const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    });
  }
</script>

<button
  type="button"
  onclick={onOpen}
  class="bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground inline-flex
    items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
>
  <CalendarClock class="h-4 w-4" aria-hidden="true" />
  {#if summary}
    <span class="text-foreground font-medium">{summary.date}</span>
    <span class="text-muted-foreground">·</span>
    <span>{summary.label}</span>
  {:else}
    <span>Set a deadline</span>
  {/if}
</button>
