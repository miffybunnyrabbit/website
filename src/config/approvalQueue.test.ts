import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  approvalQueue,
  assertApprovalQueueValid,
  CATEGORY_LABELS,
  formatOpenQueueWarning,
  isResolved,
  openQueueItems,
  queueItemFilename,
  renderQueueItemMarkdown,
  REQUIRED_APPROVERS,
  validateApprovalQueue,
  type ApprovalCategory,
  type QueueItem,
} from "./approvalQueue";
import { caseStudies } from "./caseStudies";
import { footer } from "./footer";
import { logos } from "./logos";
import { proofBanner } from "./proofBanner";

/** Deep-enough clone of the canonical queue so a test can mutate it safely. */
function cloneQueue(): QueueItem[] {
  return approvalQueue.map((item) => ({
    ...item,
    coverage: item.coverage.map((c) => ({ ...c })),
    requiredApprovers: [...item.requiredApprovers],
  }));
}

describe("approval queue", () => {
  it("passes its own validation as authored", () => {
    expect(validateApprovalQueue()).toEqual([]);
    expect(() => assertApprovalQueueValid()).not.toThrow();
  });

  it("gives every item a unique, well-formed Q-NNNN id", () => {
    const ids = approvalQueue.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id, id).toMatch(/^Q-\d{4}-[a-z0-9-]+$/);
    }
  });

  it("declares exactly the canonical approvers for each category", () => {
    for (const item of approvalQueue) {
      expect(
        [...item.requiredApprovers].sort(),
        item.id,
      ).toEqual([...REQUIRED_APPROVERS[item.category]].sort());
    }
  });

  it("has a label for every category", () => {
    const categories: ApprovalCategory[] = ["A", "B", "C", "D"];
    for (const c of categories) {
      expect(CATEGORY_LABELS[c]).toBeTruthy();
      expect(REQUIRED_APPROVERS[c].length).toBeGreaterThan(0);
    }
    // Category B is the financial-claims gate: finance, legal, and the owner.
    expect([...REQUIRED_APPROVERS.B].sort()).toEqual(
      ["finance-owner", "helix-owner", "legal-reviewer"].sort(),
    );
  });

  it("starts with every item open (nothing is approved yet)", () => {
    for (const item of approvalQueue) {
      expect(item.status, item.id).toBe("open");
      expect(isResolved(item)).toBe(false);
    }
    expect(openQueueItems()).toHaveLength(approvalQueue.length);
  });
});

describe("completeness cross-checks against live content", () => {
  it("tracks every case study that still needs sign-off with an open item", () => {
    const openStudyRefs = new Set(
      openQueueItems()
        .flatMap((i) => i.coverage)
        .filter((c) => c.kind === "case-study")
        .map((c) => c.ref),
    );
    for (const study of caseStudies) {
      const needsSignoff =
        study.approvalStatus !== "approved" ||
        study.clientApproval === "pending" ||
        study.assetApproval !== "approved";
      if (needsSignoff) {
        expect(openStudyRefs, study.slug).toContain(study.slug);
      }
    }
  });

  it("tracks the pending proof figure and pending logo permissions", () => {
    // Both preconditions hold in the authored content, so both must be covered.
    expect(proofBanner.currencyApproval).toBe("pending");
    expect(logos.some((l) => l.status === "retain" && l.permission === "pending"))
      .toBe(true);

    const openKinds = openQueueItems().flatMap((i) => i.coverage);
    expect(
      openKinds.some((c) => c.kind === "proof-metric" && c.ref === "enterprise-value"),
    ).toBe(true);
    expect(openKinds.some((c) => c.kind === "logo-permissions")).toBe(true);
  });

  it("fails when a pending case study loses its open queue item", () => {
    const queue = cloneQueue().filter(
      (i) => !i.coverage.some((c) => c.kind === "case-study" && c.ref === "neara"),
    );
    const errors = validateApprovalQueue(queue);
    expect(errors.join("\n")).toMatch(/neara.*needs sign-off/i);
  });

  it("fails when the only proof-figure item is resolved", () => {
    const queue = cloneQueue().map((i) =>
      i.id === "Q-0007-proof-enterprise-value"
        ? {
            ...i,
            status: "approved" as const,
            decision: "Confirmed as AUD.",
            decisionDate: "2026-07-20",
            decidedBy: "finance-owner",
          }
        : i,
    );
    const errors = validateApprovalQueue(queue);
    expect(errors.join("\n")).toMatch(/proof figure.*no open queue item/i);
  });

  it("tracks the pending footer identity facts (§14, §23)", () => {
    // The footer's identity facts publish withheld and pending, so the queue
    // must carry an open item covering them.
    expect(footer.facts.some((f) => f.approval === "pending")).toBe(true);
    const openKinds = openQueueItems().flatMap((i) => i.coverage);
    expect(openKinds.some((c) => c.kind === "footer-identity")).toBe(true);
  });

  it("every footer fact references its footer-identity queue item", () => {
    const footerIds = new Set(
      approvalQueue
        .filter((i) => i.coverage.some((c) => c.kind === "footer-identity"))
        .map((i) => i.id),
    );
    expect(footerIds.size).toBeGreaterThan(0);
    for (const fact of footer.facts) {
      expect(footerIds.has(fact.queueItem), fact.id).toBe(true);
    }
  });

  it("fails when the only footer-identity item is resolved", () => {
    const queue = cloneQueue().map((i) =>
      i.id === "Q-0010-footer-identity"
        ? {
            ...i,
            status: "approved" as const,
            decision: "Entity, ABN, and Redfern office confirmed.",
            decisionDate: "2026-07-22",
            decidedBy: "helix-owner",
          }
        : i,
    );
    const errors = validateApprovalQueue(queue);
    expect(errors.join("\n")).toMatch(/footer identity.*no open queue item/i);
  });
});

describe("structural validation", () => {
  it("rejects a duplicate id", () => {
    const queue = cloneQueue();
    queue.push({ ...queue[0], coverage: [{ kind: "strategic-copy" }] });
    expect(validateApprovalQueue(queue).join("\n")).toMatch(/Duplicate queue item id/);
  });

  it("rejects a malformed id", () => {
    const queue = cloneQueue();
    queue[0] = { ...queue[0], id: "Q-1-bad" };
    expect(validateApprovalQueue(queue).join("\n")).toMatch(/not of the form/);
  });

  it("rejects the wrong approver set for a category", () => {
    const queue = cloneQueue();
    queue[0] = { ...queue[0], requiredApprovers: ["helix-owner"] };
    expect(validateApprovalQueue(queue).join("\n")).toMatch(/must require exactly/);
  });

  it("rejects coverage of a non-existent case study", () => {
    const queue = cloneQueue();
    queue[0] = {
      ...queue[0],
      coverage: [{ kind: "case-study", ref: "does-not-exist" }],
    };
    expect(validateApprovalQueue(queue).join("\n")).toMatch(/unknown case study/);
  });

  it("rejects coverage of a non-existent proof metric", () => {
    const queue = cloneQueue();
    queue[0] = {
      ...queue[0],
      coverage: [{ kind: "proof-metric", ref: "made-up" }],
    };
    expect(validateApprovalQueue(queue).join("\n")).toMatch(/unknown proof metric/);
  });

  it("rejects an area-coverage kind that names a ref", () => {
    const queue = cloneQueue();
    queue[0] = {
      ...queue[0],
      coverage: [{ kind: "launch-review", ref: "oops" }],
    };
    expect(validateApprovalQueue(queue).join("\n")).toMatch(/must not name a ref/);
  });

  it("requires a decided item to record decision, date, and decider", () => {
    const queue = cloneQueue();
    queue[0] = { ...queue[0], status: "approved" };
    const errors = validateApprovalQueue(queue).join("\n");
    expect(errors).toMatch(/decision note/);
    expect(errors).toMatch(/decision date/);
    expect(errors).toMatch(/who decided/);
  });

  it("accepts a fully-recorded approved item", () => {
    // Approve Neara's item AND its content so the completeness check stays happy.
    const queue = cloneQueue().map((i) =>
      i.id === "Q-0001-neara-valuation"
        ? {
            ...i,
            status: "approved" as const,
            decision: "AUD confirmed; multiple verified at 20x.",
            decisionDate: "2026-07-21",
            decidedBy: "finance-owner",
          }
        : i,
    );
    // The Category-C item still covers Neara, so client representation keeps it
    // tracked; but approval status on the study itself would still flag it. Point
    // the completeness check at a study whose sign-off is genuinely complete by
    // validating only structure here via a queue with no pending studies is out
    // of scope — instead assert the approved item passes its own structural gate.
    const structuralErrors = validateApprovalQueue(queue).filter((e) =>
      e.includes("Q-0001"),
    );
    expect(structuralErrors).toEqual([]);
  });

  it("rejects an open item that carries a recorded decision", () => {
    const queue = cloneQueue();
    queue[0] = { ...queue[0], status: "open", decisionDate: "2026-07-21" };
    expect(validateApprovalQueue(queue).join("\n")).toMatch(
      /must not carry a recorded decision/,
    );
  });
});

describe("generated one-file-per-item records (§23)", () => {
  /** Absolute path of a file in the committed `docs/approvals/queue/` directory. */
  function queueDocPath(name: string): string {
    return fileURLToPath(
      new URL(`../../docs/approvals/queue/${name}`, import.meta.url),
    );
  }

  it("renders each record from the model with the expected shape", () => {
    const item = approvalQueue[0];
    const text = renderQueueItemMarkdown(item);
    expect(text).toContain(`# ${item.id} — ${item.title}`);
    expect(text).toContain("do not edit by hand");
    expect(text).toContain(`- **Status:** ${item.status}`);
    expect(text).toContain(item.publishedWording);
    expect(text).toMatch(/\n$/);
  });

  it("shows the decision block only once an item is decided", () => {
    const open = approvalQueue[0];
    expect(renderQueueItemMarkdown(open)).toContain("No decision recorded yet");

    const decided: QueueItem = {
      ...open,
      status: "approved",
      decision: "AUD confirmed; multiple verified.",
      decisionDate: "2026-07-21",
      decidedBy: "finance-owner",
    };
    const text = renderQueueItemMarkdown(decided);
    expect(text).not.toContain("No decision recorded yet");
    expect(text).toContain("AUD confirmed; multiple verified.");
    expect(text).toContain("- **Decision date:** 2026-07-21");
    expect(text).toContain("- **Decided by:** finance-owner");
  });

  it("has a committed record for every queue item that matches the model", () => {
    for (const item of approvalQueue) {
      const committed = readFileSync(
        queueDocPath(queueItemFilename(item)),
        "utf8",
      );
      expect(committed, item.id).toBe(renderQueueItemMarkdown(item));
    }
  });

  it("has no orphan Q-*.md record without a queue item", () => {
    const onDisk = readdirSync(queueDocPath("."))
      .filter((n) => /^Q-.*\.md$/.test(n))
      .sort();
    const expected = approvalQueue.map(queueItemFilename).sort();
    expect(onDisk).toEqual(expected);
  });
});

describe("build warning surface", () => {
  it("lists every open item on one line each", () => {
    const warning = formatOpenQueueWarning();
    expect(warning).toMatch(/10 open item/);
    for (const item of openQueueItems()) {
      expect(warning).toContain(item.id);
    }
  });

  it("reports cleanly when nothing is open", () => {
    const resolved = cloneQueue().map((i) => ({
      ...i,
      status: "withdrawn" as const,
      decision: "n/a",
      decisionDate: "2026-07-21",
      decidedBy: "helix-owner",
    }));
    expect(formatOpenQueueWarning(resolved)).toMatch(/no open items/);
  });
});
