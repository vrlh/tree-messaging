import { describe, it, expect } from "vitest";
import { buildNodeLabelMaps, parseNodeReferences } from "./node-numbers";
import type { DbMessage } from "./types";

function makeMsg(
  id: string,
  parentId: string | null,
  minutesOffset: number
): DbMessage {
  return {
    id,
    conversation_id: "conv1",
    parent_id: parentId,
    sender_id: "user1",
    body: "test",
    edited: false,
    created_at: new Date(Date.now() + minutesOffset * 60000).toISOString(),
    updated_at: new Date(Date.now() + minutesOffset * 60000).toISOString(),
  };
}

// ──────────────────────────────────────────────
// buildNodeLabelMaps
// ──────────────────────────────────────────────

describe("buildNodeLabelMaps", () => {
  // Verifies: roots get sequential numbers
  it("assigns sequential labels to roots", () => {
    const msgs = [
      makeMsg("r1", null, 0),
      makeMsg("r2", null, 1),
      makeMsg("r3", null, 2),
    ];
    const { idToLabel } = buildNodeLabelMaps(msgs);
    expect(idToLabel.get("r1")).toBe("1");
    expect(idToLabel.get("r2")).toBe("2");
    expect(idToLabel.get("r3")).toBe("3");
  });

  // Verifies: children get parent.childIndex labels
  it("assigns dot-separated labels to children", () => {
    const msgs = [
      makeMsg("r1", null, 0),
      makeMsg("c1", "r1", 1),
      makeMsg("c2", "r1", 2),
    ];
    const { idToLabel } = buildNodeLabelMaps(msgs);
    expect(idToLabel.get("c1")).toBe("1.1");
    expect(idToLabel.get("c2")).toBe("1.2");
  });

  // Verifies: deep nesting produces correct paths
  it("handles deep nesting (5 levels)", () => {
    const msgs = [
      makeMsg("r1", null, 0),
      makeMsg("a", "r1", 1),
      makeMsg("b", "a", 2),
      makeMsg("c", "b", 3),
      makeMsg("d", "c", 4),
    ];
    const { idToLabel } = buildNodeLabelMaps(msgs);
    expect(idToLabel.get("d")).toBe("1.1.1.1.1");
  });

  // Verifies: bidirectional mapping works
  it("creates matching labelToId reverse map", () => {
    const msgs = [
      makeMsg("r1", null, 0),
      makeMsg("c1", "r1", 1),
    ];
    const { idToLabel, labelToId } = buildNodeLabelMaps(msgs);
    expect(labelToId.get("1")).toBe("r1");
    expect(labelToId.get("1.1")).toBe("c1");
    // Round trip
    expect(labelToId.get(idToLabel.get("c1")!)).toBe("c1");
  });

  // Verifies: empty input produces empty maps
  it("returns empty maps for empty input", () => {
    const { idToLabel, labelToId } = buildNodeLabelMaps([]);
    expect(idToLabel.size).toBe(0);
    expect(labelToId.size).toBe(0);
  });

  // Verifies: single root with no children
  it("handles single root with no children", () => {
    const msgs = [makeMsg("r1", null, 0)];
    const { idToLabel } = buildNodeLabelMaps(msgs);
    expect(idToLabel.get("r1")).toBe("1");
    expect(idToLabel.size).toBe(1);
  });

  // Verifies: children sorted by created_at, not insertion order
  it("sorts children by created_at for stable numbering", () => {
    const msgs = [
      makeMsg("r1", null, 0),
      makeMsg("late", "r1", 10),
      makeMsg("early", "r1", 5),
    ];
    const { idToLabel } = buildNodeLabelMaps(msgs);
    expect(idToLabel.get("early")).toBe("1.1");
    expect(idToLabel.get("late")).toBe("1.2");
  });

  // Verifies: multiple roots with branches each get independent numbering
  it("numbers branches under different roots independently", () => {
    const msgs = [
      makeMsg("r1", null, 0),
      makeMsg("r2", null, 1),
      makeMsg("r1c1", "r1", 2),
      makeMsg("r2c1", "r2", 3),
    ];
    const { idToLabel } = buildNodeLabelMaps(msgs);
    expect(idToLabel.get("r1c1")).toBe("1.1");
    expect(idToLabel.get("r2c1")).toBe("2.1");
  });
});

// ──────────────────────────────────────────────
// parseNodeReferences
// ──────────────────────────────────────────────

describe("parseNodeReferences", () => {
  // Verifies: plain text with no refs returns single text segment
  it("returns single text segment when no references", () => {
    const result = parseNodeReferences("hello world");
    expect(result).toEqual([{ type: "text", value: "hello world" }]);
  });

  // Verifies: simple @reference is parsed
  it("parses a single @reference", () => {
    const result = parseNodeReferences("see @1.2");
    expect(result).toEqual([
      { type: "text", value: "see " },
      { type: "ref", label: "1.2" },
    ]);
  });

  // Verifies: multiple references in one string
  it("parses multiple references", () => {
    const result = parseNodeReferences("see @1.2 and @3");
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ type: "text", value: "see " });
    expect(result[1]).toEqual({ type: "ref", label: "1.2" });
    expect(result[2]).toEqual({ type: "text", value: " and " });
    expect(result[3]).toEqual({ type: "ref", label: "3" });
  });

  // Verifies: reference at start of string
  it("handles reference at start of string", () => {
    const result = parseNodeReferences("@1 is the root");
    expect(result[0]).toEqual({ type: "ref", label: "1" });
    expect(result[1]).toEqual({ type: "text", value: " is the root" });
  });

  // Verifies: reference at end of string
  it("handles reference at end of string", () => {
    const result = parseNodeReferences("check @1.2.3");
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ type: "ref", label: "1.2.3" });
  });

  // Verifies: adjacent references without space
  it("parses adjacent references", () => {
    const result = parseNodeReferences("@1@2");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "ref", label: "1" });
    expect(result[1]).toEqual({ type: "ref", label: "2" });
  });

  // Verifies: @a is not a valid ref, but @@1 contains a valid @1 after the extra @
  it("ignores @a but parses @1 inside @@1", () => {
    const result = parseNodeReferences("@a is not a ref");
    expect(result).toEqual([{ type: "text", value: "@a is not a ref" }]);

    // @@1 splits into "@" (text) + "@1" (ref) — the regex finds @1 inside
    const result2 = parseNodeReferences("@@1");
    expect(result2).toHaveLength(2);
    expect(result2[0]).toEqual({ type: "text", value: "@" });
    expect(result2[1]).toEqual({ type: "ref", label: "1" });
  });

  // Verifies: deeply nested reference
  it("parses deeply nested reference labels", () => {
    const result = parseNodeReferences("@1.2.3.4.5");
    expect(result).toEqual([{ type: "ref", label: "1.2.3.4.5" }]);
  });

  // Verifies: empty string
  it("handles empty string", () => {
    const result = parseNodeReferences("");
    expect(result).toEqual([]);
  });

  // Verifies: round trip — generated labels can be parsed back
  it("round-trips: generated labels are parseable as references", () => {
    const msgs = [
      makeMsg("r1", null, 0),
      makeMsg("c1", "r1", 1),
      makeMsg("c2", "r1", 2),
      makeMsg("gc1", "c1", 3),
    ];
    const { idToLabel, labelToId } = buildNodeLabelMaps(msgs);

    // Build a message body referencing all nodes
    const body = Array.from(idToLabel.values())
      .map((label) => `@${label}`)
      .join(" ");

    const segments = parseNodeReferences(body);
    const refLabels = segments
      .filter((s) => s.type === "ref")
      .map((s) => s.label);

    // Every generated label should be parseable
    expect(refLabels).toEqual(Array.from(idToLabel.values()));

    // Every parsed label should resolve back to an ID
    for (const label of refLabels) {
      expect(labelToId.has(label)).toBe(true);
    }
  });
});
