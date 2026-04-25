import { beforeEach, describe, expect, test } from "bun:test";
import { createHistory } from "./history";
import { HISTORY_LIMIT } from "./types";

interface State {
  count: number;
  text: string;
  items: string[];
}

let initial: State;
beforeEach(() => {
  initial = { count: 0, text: "", items: [] };
});

describe("mutate", () => {
  test("returns updated state and records history", () => {
    const h = createHistory<State>();
    const next = h.mutate(initial, (d) => void (d.count = 1), "inc");

    expect(next.count).toBe(1);
    expect(initial.count).toBe(0);
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);
  });

  test("no-op recipe leaves state and history untouched", () => {
    const h = createHistory<State>();
    const next = h.mutate(initial, () => {}, "noop");

    expect(next).toBe(initial);
    expect(h.canUndo()).toBe(false);
  });

  test("new mutation invalidates redo", () => {
    const h = createHistory<State>();
    let s = h.mutate(initial, (d) => void (d.count = 1), "a");
    s = h.undo(s);
    expect(h.canRedo()).toBe(true);

    h.mutate(s, (d) => void (d.count = 5), "b");
    expect(h.canRedo()).toBe(false);
  });
});

describe("undo / redo", () => {
  test("round-trips a single mutation", () => {
    const h = createHistory<State>();
    let s = h.mutate(initial, (d) => void (d.count = 7), "set 7");

    s = h.undo(s);
    expect(s.count).toBe(0);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(true);

    s = h.redo(s);
    expect(s.count).toBe(7);
  });

  test("undo on empty stack is a no-op", () => {
    const h = createHistory<State>();
    const s = h.undo(initial);
    expect(s).toBe(initial);
  });

  test("redo on empty stack is a no-op", () => {
    const h = createHistory<State>();
    const s = h.redo(initial);
    expect(s).toBe(initial);
  });

  test("restores deeply nested mutations", () => {
    const h = createHistory<State>();
    let s = h.mutate(
      initial,
      (d) => {
        d.items.push("a");
      },
      "push a",
    );
    s = h.mutate(
      s,
      (d) => {
        d.items.push("b");
      },
      "push b",
    );
    s = h.mutate(
      s,
      (d) => {
        d.items.push("c");
      },
      "push c",
    );
    expect(s.items).toEqual(["a", "b", "c"]);

    s = h.undo(s);
    s = h.undo(s);
    expect(s.items).toEqual(["a"]);

    s = h.redo(s);
    expect(s.items).toEqual(["a", "b"]);
  });
});

describe("coalescing", () => {
  test("merges entries with the same coalesce key within the window", () => {
    const h = createHistory<State>();
    let s = h.mutate(initial, (d) => void (d.text = "h"), "type", "field-1");
    s = h.mutate(s, (d) => void (d.text = "he"), "type", "field-1");
    s = h.mutate(s, (d) => void (d.text = "hel"), "type", "field-1");

    expect(h.size().past).toBe(1);

    s = h.undo(s);
    expect(s.text).toBe("");
  });

  test("different coalesce keys produce separate entries", () => {
    const h = createHistory<State>();
    const s = h.mutate(initial, (d) => void (d.text = "x"), "edit a", "field-a");
    h.mutate(s, (d) => void (d.text = "x1"), "edit b", "field-b");

    expect(h.size().past).toBe(2);
  });

  test("missing coalesce key never merges", () => {
    const h = createHistory<State>();
    const s = h.mutate(initial, (d) => void (d.count = 1), "a");
    h.mutate(s, (d) => void (d.count = 2), "b");
    expect(h.size().past).toBe(2);
  });
});

describe("capping", () => {
  test("drops oldest entries past HISTORY_LIMIT", () => {
    const h = createHistory<State>();
    let s = initial;
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      s = h.mutate(s, (d) => void (d.count = i + 1), `step ${i}`);
    }
    expect(s.count).toBe(HISTORY_LIMIT + 5);
    expect(h.size().past).toBe(HISTORY_LIMIT);
  });
});

describe("descriptions", () => {
  test("lastDescription reflects the top of the past stack", () => {
    const h = createHistory<State>();
    let s = h.mutate(initial, (d) => void (d.count = 1), "first");
    expect(h.lastDescription()).toBe("first");
    s = h.mutate(s, (d) => void (d.count = 2), "second");
    expect(h.lastDescription()).toBe("second");
    h.undo(s);
    expect(h.lastDescription()).toBe("first");
    expect(h.nextRedoDescription()).toBe("second");
  });
});

describe("clear", () => {
  test("empties both stacks", () => {
    const h = createHistory<State>();
    const s = h.mutate(initial, (d) => void (d.count = 1), "a");
    h.undo(s);
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });
});
