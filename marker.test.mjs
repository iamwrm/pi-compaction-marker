import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { SessionManager } from "@earendil-works/pi-coding-agent";

const require = createRequire(import.meta.url);
const { createJiti } = require(require.resolve("jiti", {
  paths: [new URL("./node_modules/@earendil-works/pi-coding-agent", import.meta.url).pathname],
}));
const mod = await createJiti(import.meta.url).import("./0010-compaction-kept-marker.ts");
const activate = mod.default;
const usage = { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, totalTokens: 10,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
const system = () => ({ role: "system", content: "", sections: { policy: "current" }, toolsAdded: [], timestamp: 1 });
const user = (text) => ({ role: "user", content: text, timestamp: 1 });
const assistant = (content, stopReason = "stop") => ({ role: "assistant", content, stopReason,
  provider: "test", api: "faux", model: "test", usage, timestamp: 1 });

function harness() {
  const manager = SessionManager.inMemory();
  const handlers = new Map();
  let writes = 0;
  activate({
    on: (name, handler) => handlers.set(name, handler),
    setLabel: (id, label) => { writes++; manager.appendLabelChange(id, label); },
  });
  return { manager, writes: () => writes,
    run: (name = "session_start") => handlers.get(name)({ type: name }, { sessionManager: manager }) };
}

test("reconciliation skips system/usage entries, keeps checkpoint state, and is idempotent", () => {
  const h = harness(), sm = h.manager;
  const boundary = sm.appendMessage(system());
  const warm = sm.appendUsage("cache_warm", "test", "test", usage);
  const unknown = sm.appendUsage("future_operation", "test", "test", usage);
  const target = sm.appendMessage(user("kept"));
  sm.appendMessage(system());
  const compact = sm.appendCompaction("summary", boundary, 12000, {}, true, usage);
  const checkpoint = structuredClone(sm.getEntry(compact).systemMessage);
  h.run("session_compact");
  assert.equal(sm.getLabel(target), "compaction 1 — kept from here (~12k)");
  assert.equal(sm.getLabel(compact), "compaction 1");
  for (const id of [boundary, warm, unknown]) assert.equal(sm.getLabel(id), undefined);
  assert.deepEqual(sm.getEntry(compact).systemMessage, checkpoint);
  assert.ok(checkpoint);
  const writes = h.writes();
  h.run(); h.run("session_compact");
  assert.equal(h.writes(), writes);
});

test("sibling and serial compactions use their own paths and stable append ordinals", () => {
  const h = harness(), sm = h.manager;
  const root = sm.appendMessage(system());
  const shared = sm.appendMessage(user("shared"));
  const one = sm.appendCompaction("one", root, 1000);
  sm.branch(shared);
  sm.appendUsage("future", "test", "test", usage);
  const two = sm.appendCompaction("two", root, 2000);
  const newer = sm.appendMessage(user("newer"));
  const three = sm.appendCompaction("three", newer, 3000);
  sm.branch(one);
  h.run();
  assert.equal(sm.getLabel(shared), "compactions 1 & 2 — kept from here");
  assert.equal(sm.getLabel(newer), "compaction 3 — kept from here (~3k)");
  for (const [id, n] of [[one, 1], [two, 2], [three, 3]]) assert.equal(sm.getLabel(id), `compaction ${n}`);
  const writes = h.writes();
  sm.branch(three); h.run();
  assert.equal(h.writes(), writes);
});

test("repairs saved legacy markers without overwriting user labels", () => {
  const h = harness(), sm = h.manager;
  const hidden = sm.appendMessage(assistant([{ type: "thinking", thinking: "hidden" }], "toolUse"));
  const tool = sm.appendMessage({ role: "toolResult", toolCallId: "x", toolName: "read", content: [], isError: false, timestamp: 1 });
  const compact = sm.appendCompaction("summary", hidden, 1000);
  sm.appendLabelChange(hidden, "kept from here (compacted ~1k tokens)");
  sm.appendLabelChange(compact, "compaction notes");
  h.run();
  assert.equal(sm.getLabel(hidden), undefined);
  assert.equal(sm.getLabel(tool), "compaction 1 — kept from here (~1k)");
  assert.equal(sm.getLabel(compact), "compaction notes");
  const writes = h.writes(); h.run(); assert.equal(h.writes(), writes);
});
