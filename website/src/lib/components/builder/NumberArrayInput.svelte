<script lang="ts">
  import { Input } from "$lib/components/ui/input";

  interface Props {
    value: number[];
    onChange: (next: number[]) => void;
    placeholder?: string;
    id?: string;
  }

  let { value, onChange, placeholder, id }: Props = $props();

  // Display the raw text so the user can type intermediate states ("1, " etc.)
  // without us round-tripping and erasing their cursor.
  // svelte-ignore state_referenced_locally
  let text = $state(formatArray(value));

  $effect(() => {
    const formatted = formatArray(value);
    if (parseArray(text).join(",") !== value.join(",")) text = formatted;
  });

  function formatArray(arr: number[]): string {
    return arr.join(", ");
  }

  function parseArray(input: string): number[] {
    const parts = input
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const out: number[] = [];
    for (const p of parts) {
      const n = Number(p);
      if (Number.isFinite(n)) out.push(n);
    }
    return out;
  }

  function handleInput(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value;
    text = v;
    const parsed = parseArray(v);
    if (parsed.join(",") !== value.join(",")) onChange(parsed);
  }
</script>

<Input
  {id}
  value={text}
  oninput={handleInput}
  placeholder={placeholder ?? "1, 10, 30"}
  class="font-mono text-sm"
/>
