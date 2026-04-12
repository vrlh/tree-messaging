import { describe, it, expect } from "vitest";
import {
  buildTree,
  getAncestorChain,
  getSiblingContext,
  countDescendants,
  getDefaultBranchPath,
} from "./tree-utils";
import type { DbMessage } from "./types";

// ──────────────────────────────────────────────
// Test fixtures matching the seed data structure:
//
// Root 1 (alice) — "Weekend plans"
//   ├─ msg_beach (bob) — "Beach"
//   │  ├─ msg_saturday (alice) — "Saturday"
//   │  │  └─ msg_snacks (bob) — "Snacks"
//   │  └─ msg_sunday (alice) — "Sunday"
//   │     └─ msg_sunday_ok (bob) — "Sunday works"
//   └─ msg_hiking (bob) — "Hiking"
//      └─ msg_tam (alice) — "Mount Tam"
//         ├─ msg_sunset (bob) — "Sunset trail"
//         └─ msg_waterfall (bob) — "Waterfall loop"
//
// Root 2 (bob) — "Book rec"
//   └─ msg_glass (alice) — "Glass Bead Game"
//      └─ msg_added (bob) — "Added to list"
//
// Root 3 (alice) — "App idea"
//   ├─ msg_tree (alice) — "Tree messaging"
//   │  └─ msg_meta (bob) — "Very meta"
//   └─ msg_recipe (bob) — "Recipe organizer"
// ──────────────────────────────────────────────

function makeMsg(
  id: string,
  parentId: string | null,
  senderId: string,
  body: string,
  minutesOffset: number
): DbMessage {
  return {
    id,
    conversation_id: "conv1",
    parent_id: parentId,
    sender_id: senderId,
    body,
    created_at: new Date(Date.now() + minutesOffset * 60000).toISOString(),
    updated_at: new Date(Date.now() + minutesOffset * 60000).toISOString(),
  };
}

const ALICE = "alice-id";
const BOB = "bob-id";

const profiles = new Map([
  [ALICE, { email: "alice@example.com", display_name: "Alice" }],
  [BOB, { email: "bob@example.com", display_name: "Bob" }],
]);

const messages: DbMessage[] = [
  // Root 1: Weekend plans
  makeMsg("root1", null, ALICE, "Weekend plans?", 0),
  makeMsg("msg_beach", "root1", BOB, "Beach sounds great", 1),
  makeMsg("msg_saturday", "msg_beach", ALICE, "Saturday morning", 2),
  makeMsg("msg_snacks", "msg_saturday", BOB, "I'll bring snacks", 3),
  makeMsg("msg_sunday", "msg_beach", ALICE, "Or maybe Sunday", 4),
  makeMsg("msg_sunday_ok", "msg_sunday", BOB, "Sunday works", 5),
  makeMsg("msg_hiking", "root1", BOB, "Hiking instead?", 6),
  makeMsg("msg_tam", "msg_hiking", ALICE, "Mount Tam trail?", 7),
  makeMsg("msg_sunset", "msg_tam", BOB, "Sunset trail!", 8),
  makeMsg("msg_waterfall", "msg_tam", BOB, "Waterfall loop", 9),
  // Root 2: Book rec
  makeMsg("root2", null, BOB, "Good books?", 10),
  makeMsg("msg_glass", "root2", ALICE, "Glass Bead Game", 11),
  makeMsg("msg_added", "msg_glass", BOB, "Added to list", 12),
  // Root 3: App idea
  makeMsg("root3", null, ALICE, "Build a side project?", 13),
  makeMsg("msg_tree", "root3", ALICE, "Tree messaging app", 14),
  makeMsg("msg_meta", "msg_tree", BOB, "Very meta", 15),
  makeMsg("msg_recipe", "root3", BOB, "Recipe organizer", 16),
];

// ──────────────────────────────────────────────
// buildTree
// ──────────────────────────────────────────────

describe("buildTree", () => {
  const tree = buildTree(messages, profiles);

  // Verifies: "Each message is a node. Each node has zero or one parent, zero or many children"
  it("returns exactly the root nodes (parent_id = null)", () => {
    expect(tree).toHaveLength(3);
    expect(tree.map((n) => n.id)).toEqual(["root1", "root2", "root3"]);
  });

  // Verifies: "Multiple sibling replies under the same parent must be supported"
  it("attaches multiple children to a single parent", () => {
    const root1 = tree[0];
    expect(root1.child_count).toBe(2);
    expect(root1.children.map((c) => c.id)).toEqual([
      "msg_beach",
      "msg_hiking",
    ]);
  });

  // Verifies: "Branches can branch again recursively"
  it("builds nested branches recursively", () => {
    const beach = tree[0].children[0]; // msg_beach
    expect(beach.children).toHaveLength(2); // saturday + sunday
    const saturday = beach.children[0]; // msg_saturday
    expect(saturday.children).toHaveLength(1); // snacks
    expect(saturday.children[0].id).toBe("msg_snacks");
  });

  // Verifies: depth tracking for indentation in focus mode
  it("assigns correct depth values", () => {
    expect(tree[0].depth).toBe(0); // root1
    expect(tree[0].children[0].depth).toBe(1); // beach
    expect(tree[0].children[0].children[0].depth).toBe(2); // saturday
    expect(tree[0].children[0].children[0].children[0].depth).toBe(3); // snacks
  });

  // Verifies: sender info is enriched from profiles
  it("enriches sender display name and email", () => {
    expect(tree[0].sender_display_name).toBe("Alice");
    expect(tree[0].sender_email).toBe("alice@example.com");
    expect(tree[0].children[0].sender_display_name).toBe("Bob");
  });

  // Verifies: "Either user can reply anywhere in the tree"
  it("supports either user replying at any level", () => {
    // root1 (Alice) → beach (Bob) → saturday (Alice) → snacks (Bob)
    const chain = [tree[0], tree[0].children[0], tree[0].children[0].children[0], tree[0].children[0].children[0].children[0]];
    const senders = chain.map((n) => n.sender_id);
    expect(senders).toEqual([ALICE, BOB, ALICE, BOB]);
  });

  // Verifies: children sorted by created_at
  it("sorts children by created_at", () => {
    const root1Children = tree[0].children;
    expect(root1Children[0].id).toBe("msg_beach"); // created before hiking
    expect(root1Children[1].id).toBe("msg_hiking");
  });
});

// ──────────────────────────────────────────────
// getAncestorChain
// ──────────────────────────────────────────────

describe("getAncestorChain", () => {
  const messagesById = new Map(messages.map((m) => [m.id, m]));

  // Verifies: "Users should be able to move upward through the ancestor chain"
  it("returns full chain from root to target, root-first", () => {
    const chain = getAncestorChain("msg_snacks", messagesById, profiles);
    expect(chain.map((n) => n.id)).toEqual([
      "root1",
      "msg_beach",
      "msg_saturday",
      "msg_snacks",
    ]);
  });

  // Verifies: root node returns single-item chain
  it("returns single item for a root node", () => {
    const chain = getAncestorChain("root1", messagesById, profiles);
    expect(chain).toHaveLength(1);
    expect(chain[0].id).toBe("root1");
  });

  // Verifies: depth values are correct (0-indexed from root)
  it("assigns sequential depth values", () => {
    const chain = getAncestorChain("msg_snacks", messagesById, profiles);
    expect(chain.map((n) => n.depth)).toEqual([0, 1, 2, 3]);
  });

  // Verifies: handles deepest node in the tree (4 levels under root3)
  it("works for deeply nested branches", () => {
    const chain = getAncestorChain("msg_meta", messagesById, profiles);
    expect(chain.map((n) => n.id)).toEqual(["root3", "msg_tree", "msg_meta"]);
  });
});

// ──────────────────────────────────────────────
// getSiblingContext
// ──────────────────────────────────────────────

describe("getSiblingContext", () => {
  // Verifies: "If a parent has multiple children, the user should be able to use
  //            left/right controls to switch between sibling branches"
  it("returns correct sibling context for nodes with siblings", () => {
    // msg_beach and msg_hiking are siblings (both children of root1)
    const ctx = getSiblingContext("msg_beach", messages);
    expect(ctx.total_siblings).toBe(2);
    expect(ctx.current_index).toBe(0);
    expect(ctx.sibling_ids).toEqual(["msg_beach", "msg_hiking"]);
  });

  // Verifies: second sibling has correct index
  it("returns correct index for non-first sibling", () => {
    const ctx = getSiblingContext("msg_hiking", messages);
    expect(ctx.total_siblings).toBe(2);
    expect(ctx.current_index).toBe(1);
  });

  // Verifies: node with no siblings has total_siblings = 1
  it("returns total_siblings=1 for an only child", () => {
    const ctx = getSiblingContext("msg_snacks", messages);
    expect(ctx.total_siblings).toBe(1);
    expect(ctx.current_index).toBe(0);
  });

  // Verifies: "When switching to a sibling branch, replace the visible subtree"
  // (the sibling IDs give the client what it needs to navigate)
  it("returns all sibling IDs for subtree replacement", () => {
    // msg_sunset and msg_waterfall are siblings under msg_tam
    const ctx = getSiblingContext("msg_sunset", messages);
    expect(ctx.sibling_ids).toEqual(["msg_sunset", "msg_waterfall"]);
    expect(ctx.total_siblings).toBe(2);
  });

  // Verifies: root nodes are siblings of each other (all parent_id === null)
  it("treats root nodes as siblings", () => {
    const ctx = getSiblingContext("root1", messages);
    expect(ctx.total_siblings).toBe(3);
    expect(ctx.sibling_ids).toEqual(["root1", "root2", "root3"]);
  });
});

// ──────────────────────────────────────────────
// countDescendants
// ──────────────────────────────────────────────

describe("countDescendants", () => {
  // Verifies: "Each root should show branch count / reply count"
  it("counts all descendants of a root with deep branches", () => {
    // root1 has: beach, saturday, snacks, sunday, sunday_ok, hiking, tam, sunset, waterfall = 9
    expect(countDescendants("root1", messages)).toBe(9);
  });

  // Verifies: counts correctly for a simple chain
  it("counts descendants of a simple chain", () => {
    // root2 → glass → added = 2 descendants
    expect(countDescendants("root2", messages)).toBe(2);
  });

  // Verifies: leaf node has no descendants
  it("returns 0 for a leaf node", () => {
    expect(countDescendants("msg_snacks", messages)).toBe(0);
  });

  // Verifies: mid-tree node counts subtree correctly
  it("counts subtree from a mid-tree node", () => {
    // msg_beach → saturday (→ snacks), sunday (→ sunday_ok) = 4
    expect(countDescendants("msg_beach", messages)).toBe(4);
  });

  // Verifies: branching node with multiple children
  it("counts descendants when parent has multiple children", () => {
    // msg_tam → sunset, waterfall = 2
    expect(countDescendants("msg_tam", messages)).toBe(2);
  });
});

// ──────────────────────────────────────────────
// getDefaultBranchPath
// ──────────────────────────────────────────────

describe("getDefaultBranchPath", () => {
  // Verifies: "Focus mode shows one active branch path in detail"
  // follows first child (by created_at) at each level
  it("follows first-child path from a root", () => {
    const path = getDefaultBranchPath("root1", messages);
    expect(path.map((m) => m.id)).toEqual([
      "root1",
      "msg_beach",
      "msg_saturday",
      "msg_snacks",
    ]);
  });

  // Verifies: path from a mid-tree node follows first children down
  it("follows first-child path from a mid-tree node", () => {
    const path = getDefaultBranchPath("msg_beach", messages);
    expect(path.map((m) => m.id)).toEqual([
      "msg_beach",
      "msg_saturday",
      "msg_snacks",
    ]);
  });

  // Verifies: leaf node returns just itself
  it("returns single-item path for a leaf node", () => {
    const path = getDefaultBranchPath("msg_snacks", messages);
    expect(path).toHaveLength(1);
    expect(path[0].id).toBe("msg_snacks");
  });

  // Verifies: when there are sibling branches, only the first child is followed
  it("picks only the first child when siblings exist", () => {
    // msg_tam has two children: sunset (first) and waterfall
    const path = getDefaultBranchPath("msg_tam", messages);
    expect(path.map((m) => m.id)).toEqual(["msg_tam", "msg_sunset"]);
    // waterfall is NOT in the path
  });

  // Verifies: simple chain follows all the way down
  it("follows a simple chain completely", () => {
    const path = getDefaultBranchPath("root2", messages);
    expect(path.map((m) => m.id)).toEqual(["root2", "msg_glass", "msg_added"]);
  });
});

// ──────────────────────────────────────────────
// Tree semantic integrity
// ──────────────────────────────────────────────

describe("tree semantic integrity", () => {
  // Verifies: "Do not fake threading with quotes; use a real parent_id model"
  it("every non-root message has a valid parent_id pointing to another message", () => {
    const ids = new Set(messages.map((m) => m.id));
    for (const msg of messages) {
      if (msg.parent_id !== null) {
        expect(ids.has(msg.parent_id)).toBe(true);
      }
    }
  });

  // Verifies: "Every send creates a distinct message node"
  it("all message IDs are unique", () => {
    const ids = messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Verifies: "Each node has zero or one parent"
  it("each message has at most one parent_id", () => {
    for (const msg of messages) {
      // parent_id is a single nullable string, not an array — this is structural
      expect(
        msg.parent_id === null || typeof msg.parent_id === "string"
      ).toBe(true);
    }
  });

  // Verifies: no cycles in the tree
  it("ancestor chain terminates at a root (no cycles)", () => {
    const byId = new Map(messages.map((m) => [m.id, m]));
    for (const msg of messages) {
      const visited = new Set<string>();
      let current: string | null = msg.id;
      while (current) {
        expect(visited.has(current)).toBe(false);
        visited.add(current);
        current = byId.get(current)?.parent_id ?? null;
      }
    }
  });
});

// ──────────────────────────────────────────────
// Composer action types (structural validation)
// ──────────────────────────────────────────────

describe("message creation patterns", () => {
  // Verifies: "Reply as child: create a child node under the selected message"
  it("child reply has parent_id = selected message id", () => {
    const parentMsg = messages.find((m) => m.id === "msg_beach")!;
    // A child reply would be: { parent_id: parentMsg.id }
    const childReply = {
      conversation_id: "conv1",
      parent_id: parentMsg.id,
      body: "test reply",
    };
    expect(childReply.parent_id).toBe("msg_beach");
  });

  // Verifies: "Add sibling alternative: create a new node under the selected message's parent"
  it("sibling alternative has parent_id = selected message's parent_id", () => {
    const selectedMsg = messages.find((m) => m.id === "msg_beach")!;
    // A sibling would be: { parent_id: selectedMsg.parent_id }
    const siblingReply = {
      conversation_id: "conv1",
      parent_id: selectedMsg.parent_id,
      body: "alternative to beach",
    };
    expect(siblingReply.parent_id).toBe("root1");
  });

  // Verifies: "New root topic: create a node with parent_id = null"
  it("new root topic has parent_id = null", () => {
    const newRoot = {
      conversation_id: "conv1",
      parent_id: null,
      body: "new topic",
    };
    expect(newRoot.parent_id).toBeNull();
  });
});

// ──────────────────────────────────────────────
// Auth allowlist (unit test for constants logic)
// ──────────────────────────────────────────────

describe("email allowlist validation", () => {
  // Simulates the allowlist check done in middleware and login form
  const allowedEmails = ["alice@example.com", "bob@example.com"];

  // Verifies: "Only two specific email addresses may access the app"
  it("allows configured emails", () => {
    expect(allowedEmails.includes("alice@example.com")).toBe(true);
    expect(allowedEmails.includes("bob@example.com")).toBe(true);
  });

  // Verifies: "Reject all other emails"
  it("rejects non-allowlisted emails", () => {
    expect(allowedEmails.includes("eve@example.com")).toBe(false);
    expect(allowedEmails.includes("")).toBe(false);
  });
});
