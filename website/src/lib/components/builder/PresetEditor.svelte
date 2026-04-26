<script lang="ts">
  import { Trash2 } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import PresetField from "./PresetField.svelte";
  import NumberArrayInput from "./NumberArrayInput.svelte";
  import InlineTitle from "./InlineTitle.svelte";
  import { confirmAction } from "$lib/builder/dialogs.svelte";
  import { toast } from "svelte-sonner";
  import type { BuilderConfig, Id } from "$lib/builder/types";
  import type { ConfigUpdatableKey } from "$lib/builder/actions";

  interface Props {
    config: BuilderConfig;
    /** Number of decks referencing this config (used for delete safety). */
    usage: number;
    onRename: (id: Id, name: string) => void;
    onDelete: (id: Id) => void;
    onUpdate: <K extends ConfigUpdatableKey>(id: Id, key: K, value: BuilderConfig[K]) => void;
  }

  let { config, usage, onRename, onDelete, onUpdate }: Props = $props();

  type Tab = "limits" | "learning" | "fsrs" | "display" | "advanced";
  let active = $state<Tab>("limits");

  async function handleDelete() {
    if (usage > 0) {
      toast.error(
        `Cannot delete: ${usage} ${usage === 1 ? "deck uses" : "decks use"} this preset. Switch them first.`,
      );
      return;
    }
    const ok = await confirmAction({
      title: `Delete "${config.name}"?`,
      description: "Use Ctrl+Z to undo.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    onDelete(config.id);
  }

  function setNum<K extends ConfigUpdatableKey>(key: K) {
    return (e: Event) => {
      const n = Number((e.currentTarget as HTMLInputElement).value);
      if (!Number.isFinite(n)) return;
      onUpdate(config.id, key, n as unknown as BuilderConfig[K]);
    };
  }

  function setBool<K extends ConfigUpdatableKey>(key: K) {
    return (e: Event) => {
      const checked = (e.currentTarget as HTMLInputElement).checked;
      onUpdate(config.id, key, checked as unknown as BuilderConfig[K]);
    };
  }

  function setStr<K extends ConfigUpdatableKey>(key: K) {
    return (e: Event) => {
      const v = (e.currentTarget as HTMLInputElement | HTMLSelectElement).value;
      onUpdate(config.id, key, v as unknown as BuilderConfig[K]);
    };
  }

  function setArr<K extends ConfigUpdatableKey>(key: K) {
    return (next: number[]) => {
      onUpdate(config.id, key, next as unknown as BuilderConfig[K]);
    };
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "limits", label: "Limits" },
    { id: "learning", label: "Learning" },
    { id: "fsrs", label: "FSRS" },
    { id: "display", label: "Display" },
    { id: "advanced", label: "Advanced" },
  ];

  const sourceLabel = $derived(
    config.source === "default"
      ? "Default"
      : config.source === "deadline"
        ? "Deadline-tuned"
        : "Customized",
  );
</script>

<div class="space-y-6">
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="flex-1 space-y-2">
      <p class="text-muted-foreground text-xs tracking-wide uppercase">Preset</p>
      <InlineTitle
        value={config.name}
        onSave={(next) => onRename(config.id, next)}
        ariaLabel="Preset name"
        placeholder="Untitled preset"
        class="text-2xl leading-tight font-semibold tracking-tight"
      />
      <p class="text-muted-foreground text-sm">
        {sourceLabel} · {usage}
        {usage === 1 ? "deck uses" : "decks use"} this preset.
      </p>
    </div>
    <Button variant="ghost" onclick={handleDelete} class="text-muted-foreground gap-1.5">
      <Trash2 class="h-4 w-4" />
      Delete
    </Button>
  </header>

  <div role="tablist" class="border-border flex flex-wrap gap-1 border-b" aria-label="Preset tabs">
    {#each TABS as t (t.id)}
      <button
        type="button"
        role="tab"
        aria-selected={active === t.id}
        onclick={() => (active = t.id)}
        class="px-3 py-1.5 text-sm transition-colors {active === t.id
          ? 'border-primary text-foreground border-b-2'
          : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'}"
      >
        {t.label}
      </button>
    {/each}
  </div>

  <div class="space-y-5">
    {#if active === "limits"}
      <PresetField
        label="New cards per day"
        htmlFor="newPerDay"
        help="Maximum new cards introduced each day."
      >
        <Input
          id="newPerDay"
          type="number"
          min="0"
          value={config.newPerDay}
          oninput={setNum("newPerDay")}
        />
      </PresetField>
      <PresetField label="Reviews per day" htmlFor="reviewsPerDay">
        <Input
          id="reviewsPerDay"
          type="number"
          min="0"
          value={config.reviewsPerDay}
          oninput={setNum("reviewsPerDay")}
        />
      </PresetField>
    {:else if active === "learning"}
      <PresetField label="Learning steps (minutes)" htmlFor="learnSteps" help="Comma-separated.">
        <NumberArrayInput
          id="learnSteps"
          value={config.learnSteps}
          onChange={setArr("learnSteps")}
        />
      </PresetField>
      <PresetField label="Relearning steps (minutes)" htmlFor="relearnSteps">
        <NumberArrayInput
          id="relearnSteps"
          value={config.relearnSteps}
          onChange={setArr("relearnSteps")}
        />
      </PresetField>
      <PresetField
        label="Graduating interval (Good)"
        htmlFor="gradGood"
        help="Days after pressing Good on the last learning step."
      >
        <Input
          id="gradGood"
          type="number"
          min="1"
          value={config.graduatingIntervalGood}
          oninput={setNum("graduatingIntervalGood")}
        />
      </PresetField>
      <PresetField label="Graduating interval (Easy)" htmlFor="gradEasy">
        <Input
          id="gradEasy"
          type="number"
          min="1"
          value={config.graduatingIntervalEasy}
          oninput={setNum("graduatingIntervalEasy")}
        />
      </PresetField>
      <PresetField label="Minimum lapse interval (days)" htmlFor="minLapse">
        <Input
          id="minLapse"
          type="number"
          min="1"
          value={config.minimumLapseInterval}
          oninput={setNum("minimumLapseInterval")}
        />
      </PresetField>
    {:else if active === "fsrs"}
      <PresetField
        label="Desired retention (0 to 1)"
        htmlFor="dr"
        help="FSRS tunes intervals to hit this probability."
      >
        <Input
          id="dr"
          type="number"
          min="0.5"
          max="0.99"
          step="0.01"
          value={config.desiredRetention}
          oninput={setNum("desiredRetention")}
        />
      </PresetField>
      <PresetField label="Maximum review interval (days)" htmlFor="maxRev">
        <Input
          id="maxRev"
          type="number"
          min="1"
          value={config.maximumReviewInterval}
          oninput={setNum("maximumReviewInterval")}
        />
      </PresetField>
      <PresetField
        label="FSRS parameters"
        htmlFor="fsrsParams"
        help="Leave empty to use Anki defaults."
      >
        <NumberArrayInput
          id="fsrsParams"
          value={config.fsrsParams}
          onChange={setArr("fsrsParams")}
        />
      </PresetField>
      <PresetField label="Historical retention" htmlFor="histRet">
        <Input
          id="histRet"
          type="number"
          min="0.5"
          max="0.99"
          step="0.01"
          value={config.historicalRetention}
          oninput={setNum("historicalRetention")}
        />
      </PresetField>
      <PresetField label="Ignore review logs before (YYYY-MM-DD)" htmlFor="ignoreBefore">
        <Input
          id="ignoreBefore"
          type="text"
          placeholder="2024-01-01"
          value={config.ignoreRevlogsBeforeDate}
          oninput={setStr("ignoreRevlogsBeforeDate")}
        />
      </PresetField>
    {:else if active === "display"}
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.showTimer}
          onchange={setBool("showTimer")}
          class="border-input accent-primary h-4 w-4 rounded border"
        />
        Show timer on the review screen
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.stopTimerOnAnswer}
          onchange={setBool("stopTimerOnAnswer")}
          class="border-input accent-primary h-4 w-4 rounded border"
        />
        Stop the timer when the answer is shown
      </label>
      <PresetField label="Cap answer time to (seconds)" htmlFor="capAns">
        <Input
          id="capAns"
          type="number"
          min="1"
          value={config.capAnswerTimeToSecs}
          oninput={setNum("capAnswerTimeToSecs")}
        />
      </PresetField>
      <PresetField label="Auto-advance question (seconds, 0 disables)" htmlFor="ansQ">
        <Input
          id="ansQ"
          type="number"
          min="0"
          value={config.secondsToShowQuestion}
          oninput={setNum("secondsToShowQuestion")}
        />
      </PresetField>
      <PresetField label="Auto-advance answer (seconds, 0 disables)" htmlFor="ansA">
        <Input
          id="ansA"
          type="number"
          min="0"
          value={config.secondsToShowAnswer}
          oninput={setNum("secondsToShowAnswer")}
        />
      </PresetField>
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.disableAutoplay}
          onchange={setBool("disableAutoplay")}
          class="border-input accent-primary h-4 w-4 rounded border"
        />
        Disable automatic audio playback
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.waitForAudio}
          onchange={setBool("waitForAudio")}
          class="border-input accent-primary h-4 w-4 rounded border"
        />
        Wait for audio to finish before showing the answer button
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.skipQuestionWhenReplayingAnswer}
          onchange={setBool("skipQuestionWhenReplayingAnswer")}
          class="border-input accent-primary h-4 w-4 rounded border"
        />
        Skip question audio when replaying the answer
      </label>
    {:else if active === "advanced"}
      <PresetField label="Leech action" htmlFor="leechAction">
        <select
          id="leechAction"
          value={config.leechAction}
          onchange={setStr("leechAction")}
          class="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="suspend">Suspend</option>
          <option value="tagOnly">Tag only</option>
        </select>
      </PresetField>
      <PresetField label="Leech threshold (lapses)" htmlFor="leechT">
        <Input
          id="leechT"
          type="number"
          min="1"
          value={config.leechThreshold}
          oninput={setNum("leechThreshold")}
        />
      </PresetField>

      <div class="space-y-2">
        <p class="text-foreground text-sm font-medium">Burying</p>
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.buryNew}
            onchange={setBool("buryNew")}
            class="border-input accent-primary h-4 w-4 rounded border"
          />
          Bury new sibling cards until next day
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.buryReviews}
            onchange={setBool("buryReviews")}
            class="border-input accent-primary h-4 w-4 rounded border"
          />
          Bury review sibling cards until next day
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.buryInterdayLearning}
            onchange={setBool("buryInterdayLearning")}
            class="border-input accent-primary h-4 w-4 rounded border"
          />
          Bury interday learning sibling cards
        </label>
      </div>

      <PresetField label="Review order" htmlFor="reviewOrder">
        <select
          id="reviewOrder"
          value={config.reviewOrder}
          onchange={setStr("reviewOrder")}
          class="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="day">By due day</option>
          <option value="dayThenDeck">Day then deck</option>
          <option value="deckThenDay">Deck then day</option>
          <option value="intervalsAscending">Intervals ascending</option>
          <option value="intervalsDescending">Intervals descending</option>
          <option value="easeAscending">Ease ascending</option>
          <option value="easeDescending">Ease descending</option>
          <option value="retrievabilityAscending">Retrievability ascending</option>
          <option value="retrievabilityDescending">Retrievability descending</option>
          <option value="relativeOverdueness">Relative overdueness</option>
          <option value="random">Random</option>
          <option value="added">Added</option>
          <option value="reverseAdded">Reverse added</option>
        </select>
      </PresetField>

      <PresetField label="New / review mix" htmlFor="newMix">
        <select
          id="newMix"
          value={config.newMix}
          onchange={setStr("newMix")}
          class="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="mixWithReviews">Mix with reviews</option>
          <option value="afterReviews">After reviews</option>
          <option value="beforeReviews">Before reviews</option>
        </select>
      </PresetField>

      <PresetField
        label="Easy days percentages (one per weekday)"
        htmlFor="easyDays"
        help="Sun, Mon, Tue, Wed, Thu, Fri, Sat. Leave empty to disable."
      >
        <NumberArrayInput
          id="easyDays"
          value={config.easyDaysPercentages}
          onChange={setArr("easyDaysPercentages")}
          placeholder="100, 100, 100, 100, 100, 100, 100"
        />
      </PresetField>

      <details class="rounded-md border p-3 text-sm">
        <summary
          class="text-muted-foreground hover:text-foreground cursor-pointer text-xs tracking-wide uppercase"
        >
          Legacy SM-2 multipliers
        </summary>
        <div class="mt-3 space-y-3">
          <PresetField label="Initial ease" htmlFor="initEase">
            <Input
              id="initEase"
              type="number"
              step="0.1"
              value={config.initialEase}
              oninput={setNum("initialEase")}
            />
          </PresetField>
          <PresetField label="Easy multiplier" htmlFor="easyM">
            <Input
              id="easyM"
              type="number"
              step="0.1"
              value={config.easyMultiplier}
              oninput={setNum("easyMultiplier")}
            />
          </PresetField>
          <PresetField label="Hard multiplier" htmlFor="hardM">
            <Input
              id="hardM"
              type="number"
              step="0.1"
              value={config.hardMultiplier}
              oninput={setNum("hardMultiplier")}
            />
          </PresetField>
          <PresetField label="Lapse multiplier (0 resets)" htmlFor="lapseM">
            <Input
              id="lapseM"
              type="number"
              step="0.1"
              value={config.lapseMultiplier}
              oninput={setNum("lapseMultiplier")}
            />
          </PresetField>
          <PresetField label="Interval multiplier" htmlFor="intM">
            <Input
              id="intM"
              type="number"
              step="0.1"
              value={config.intervalMultiplier}
              oninput={setNum("intervalMultiplier")}
            />
          </PresetField>
        </div>
      </details>
    {/if}
  </div>
</div>
