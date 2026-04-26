<script lang="ts">
  import { Calendar } from "$lib/components/ui/calendar";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { TriangleAlert } from "@lucide/svelte";
  import {
    today,
    getLocalTimeZone,
    type CalendarDate,
    type DateValue,
  } from "@internationalized/date";
  import type { DeadlineSpec, Id } from "$lib/builder/types";

  export interface DeadlineDeck {
    id: Id;
    name: string;
    isCustomized: boolean;
  }

  interface Props {
    open: boolean;
    /** All decks in the package (used for the "apply to all" reach). */
    allDecks: DeadlineDeck[];
    /** The currently selected deck. The deadline applies to it by default. */
    currentDeckId: Id;
    /** Initial deadline to seed the picker. */
    initialDeadline: DeadlineSpec | null;
    onSave: (args: { deckIds: Id[]; deadline: DeadlineSpec }) => void;
    onClose: () => void;
  }

  let {
    open = $bindable(),
    allDecks,
    currentDeckId,
    initialDeadline,
    onSave,
    onClose,
  }: Props = $props();

  const tz = getLocalTimeZone();
  const todayDate = today(tz);

  function specToDate(spec: DeadlineSpec | null): DateValue {
    if (!spec) return todayDate.add({ days: 7 });
    const [y, m, d] = spec.date.split("-").map((n) => Number.parseInt(n, 10));
    return todayDate.set({ year: y, month: m, day: d });
  }

  function dateToSpec(date: DateValue): DeadlineSpec {
    const iso = `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
    return { date: iso };
  }

  function diffDays(from: DateValue, to: DateValue): number {
    const fromMs = from.toDate(tz).getTime();
    const toMs = to.toDate(tz).getTime();
    return Math.round((toMs - fromMs) / 86_400_000);
  }

  // svelte-ignore state_referenced_locally
  let selected = $state<DateValue>(specToDate(initialDeadline));
  let applyAll = $state(false);

  // Re-seed when the modal re-opens with a different deck/spec.
  $effect(() => {
    if (open) {
      selected = specToDate(initialDeadline);
      applyAll = false;
    }
  });

  const days = $derived(diffDays(todayDate, selected));

  function setDays(value: number) {
    if (!Number.isFinite(value) || value < 1) return;
    selected = todayDate.add({ days: value });
  }

  const affectedDecks = $derived(
    applyAll ? allDecks : allDecks.filter((d) => d.id === currentDeckId),
  );

  const customizedAffected = $derived(affectedDecks.filter((d) => d.isCustomized));

  const hasMultipleDecks = $derived(allDecks.length > 1);

  function handleSave() {
    if (days < 1) return;
    onSave({
      deckIds: affectedDecks.map((d) => d.id),
      deadline: dateToSpec(selected),
    });
    open = false;
  }
</script>

<Dialog.Root
  bind:open
  onOpenChange={(value: boolean) => {
    if (!value) onClose();
  }}
>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>When do you need to know this deck?</Dialog.Title>
      <Dialog.Description>
        Learning steps and retention are tuned to your timeline.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-5">
      <div class="space-y-1.5">
        <Label class="text-muted-foreground text-xs" for="deadline-days">Days</Label>
        <Input
          id="deadline-days"
          type="number"
          min="1"
          value={days}
          oninput={(e) => setDays(Number((e.target as HTMLInputElement).value))}
          class="tabular-nums [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>

      <div class="border-border flex justify-center rounded-md border">
        <Calendar
          type="single"
          bind:value={selected as CalendarDate}
          minValue={todayDate.add({ days: 1 })}
          class="bg-transparent"
        />
      </div>

      {#if hasMultipleDecks}
        <label
          class="hover:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5
            text-sm transition-colors"
        >
          <input
            type="checkbox"
            bind:checked={applyAll}
            class="border-input accent-primary h-4 w-4 rounded border"
          />
          <span>Apply to all decks in this package ({allDecks.length})</span>
        </label>
      {/if}

      {#if customizedAffected.length > 0}
        <div
          class="border-destructive/40 bg-destructive/10 flex items-start gap-2 rounded-md
            border px-3 py-2 text-xs"
          role="alert"
        >
          <TriangleAlert class="text-destructive mt-0.5 h-4 w-4 shrink-0" />
          <div class="space-y-1">
            <p class="text-foreground font-medium">
              {customizedAffected.length}
              {customizedAffected.length === 1 ? "preset is" : "presets are"} customized.
            </p>
            <p class="text-muted-foreground">
              Saving overwrites
              {customizedAffected
                .slice(0, 3)
                .map((d) => `"${d.name}"`)
                .join(", ")}{customizedAffected.length > 3
                ? ` and ${customizedAffected.length - 3} more`
                : ""}.
            </p>
          </div>
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={handleSave} disabled={days < 1}>
        Save
        {#if customizedAffected.length > 0}
          (overwrite)
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
