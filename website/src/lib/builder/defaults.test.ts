import { describe, expect, test } from "bun:test";
import { builtinModel, daysUntil, deadlineTunedConfig, defaultConfig, newId } from "./defaults";

describe("newId", () => {
  test("returns distinct UUID-shaped ids", () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe("builtinModel", () => {
  test("basic has one template, two fields", () => {
    const m = builtinModel({ packageId: "pkg", variant: "basic" });
    expect(m.builtin).toBe("basic");
    expect(m.type).toBe("normal");
    expect(m.fields).toHaveLength(2);
    expect(m.templates).toHaveLength(1);
  });

  test("basicAndReversed has two templates", () => {
    const m = builtinModel({ packageId: "pkg", variant: "basicAndReversed" });
    expect(m.templates).toHaveLength(2);
    expect(m.templates[0].questionFormat).toBe("{{Front}}");
    expect(m.templates[1].questionFormat).toBe("{{Back}}");
  });

  test("basicTyping uses the type substitution", () => {
    const m = builtinModel({ packageId: "pkg", variant: "basicTyping" });
    expect(m.templates[0].questionFormat).toContain("{{type:Back}}");
  });

  test("cloze has cloze type and uses cloze field", () => {
    const m = builtinModel({ packageId: "pkg", variant: "cloze" });
    expect(m.type).toBe("cloze");
    expect(m.templates[0].questionFormat).toBe("{{cloze:Text}}");
  });
});

describe("defaultConfig", () => {
  test("starts as 'default' source so the deadline picker can silently overwrite", () => {
    const c = defaultConfig({ packageId: "pkg", name: "Default" });
    expect(c.source).toBe("default");
  });
});

describe("deadlineTunedConfig", () => {
  function todayPlus(days: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  test("days <= 4 uses aggressive learn steps", () => {
    const c = deadlineTunedConfig({
      packageId: "pkg",
      name: "test",
      deadline: { date: todayPlus(3) },
      totalCards: 50,
    });
    expect(c.learnSteps).toEqual([1, 5, 10, 30, 60]);
    expect(c.maximumReviewInterval).toBe(3);
  });

  test("days 5-7 uses medium learn steps", () => {
    const c = deadlineTunedConfig({
      packageId: "pkg",
      name: "test",
      deadline: { date: todayPlus(6) },
      totalCards: 50,
    });
    expect(c.learnSteps).toEqual([1, 5, 10, 30]);
  });

  test("days > 7 uses light learn steps", () => {
    const c = deadlineTunedConfig({
      packageId: "pkg",
      name: "test",
      deadline: { date: todayPlus(30) },
      totalCards: 50,
    });
    expect(c.learnSteps).toEqual([1, 10]);
    expect(c.graduatingIntervalEasy).toBe(4);
  });

  test("typing config has lower retention than non-typing", () => {
    const a = deadlineTunedConfig({
      packageId: "pkg",
      name: "n",
      deadline: { date: todayPlus(10) },
      totalCards: 10,
    });
    const b = deadlineTunedConfig({
      packageId: "pkg",
      name: "n",
      deadline: { date: todayPlus(10) },
      totalCards: 10,
      isTyping: true,
    });
    expect(b.desiredRetention).toBeLessThan(a.desiredRetention);
  });

  test("source is 'deadline' and stores the spec", () => {
    const spec = { date: todayPlus(10) };
    const c = deadlineTunedConfig({
      packageId: "pkg",
      name: "n",
      deadline: spec,
      totalCards: 10,
    });
    expect(c.source).toBe("deadline");
    expect(c.generatedFromDeadline).toEqual(spec);
  });
});

describe("daysUntil", () => {
  test("today returns 0", () => {
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(daysUntil({ date: iso })).toBe(0);
  });

  test("tomorrow returns 1", () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(daysUntil({ date: iso })).toBe(1);
  });
});
