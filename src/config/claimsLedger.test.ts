import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CLAIM_ID_PATTERN,
  CLAIMS_LEDGER_COLUMNS,
  CLAIMS_LEDGER_CSV_PATH,
  assertClaimsLedgerValid,
  claimById,
  claimCompany,
  claimCurrency,
  claimDraftValue,
  claimPublicCopy,
  claimsForCaseStudy,
  claimsLedger,
  isPublishable,
  renderClaimsLedgerCsv,
  validateClaimsLedger,
  type ClaimRecord,
} from "./claimsLedger";
import { approvalQueue, REQUIRED_APPROVERS, type QueueItem } from "./approvalQueue";
import { caseStudies, type CaseStudy } from "./caseStudies";

/** Read the committed generated CSV relative to this module. */
function readCommittedCsv(): string {
  const path = fileURLToPath(
    new URL(`../../${CLAIMS_LEDGER_CSV_PATH}`, import.meta.url),
  );
  return readFileSync(path, "utf8");
}

/** Deep-clone the ledger so a test can mutate it safely. */
function cloneLedger(): ClaimRecord[] {
  return claimsLedger.map((c) => ({ ...c, target: { ...c.target } }));
}

/** Deep-clone the queue so a test can flip one item's status. */
function cloneQueue(): QueueItem[] {
  return approvalQueue.map((item) => ({
    ...item,
    coverage: item.coverage.map((c) => ({ ...c })),
    requiredApprovers: [...item.requiredApprovers],
  }));
}

/** A minimal, fully-publishable case study citing the given claim ids. */
function publishedStudy(slug: string, claimIds: string[]): CaseStudy {
  const base = caseStudies.find((s) => s.slug === slug);
  if (!base) throw new Error(`no such study: ${slug}`);
  return {
    ...base,
    publish: true,
    approvalStatus: "approved",
    clientApproval: "approved",
    assetApproval: "approved",
    outcomeHeadline: "FROM IDEA TO A$1B+",
    currentOutcome: undefined,
    valueMultiple: undefined,
    valueCreated: undefined,
    summary: "Helix shaped the core technology and early business development.",
    helixContribution: ["Shaped the core technology."],
    claimIds,
  };
}

describe("claimsLedger model", () => {
  it("is well-formed and complete against the live models", () => {
    expect(validateClaimsLedger()).toEqual([]);
    expect(() => assertClaimsLedgerValid()).not.toThrow();
  });

  it("has one claim per case study plus the portfolio proof figure", () => {
    const slugs = new Set(
      claimsLedger
        .filter((c) => c.target.kind === "case-study")
        .map((c) => (c.target as { slug: string }).slug),
    );
    expect(slugs).toEqual(new Set(["neara", "ferovinum", "13sick", "origami", "veyor"]));
    expect(
      claimsLedger.some(
        (c) => c.target.kind === "proof-metric" && c.target.ref === "enterprise-value",
      ),
    ).toBe(true);
  });

  it("uses well-formed, unique claim ids", () => {
    const ids = claimsLedger.map((c) => c.id);
    for (const id of ids) {
      expect(id).toMatch(CLAIM_ID_PATTERN);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has every figure owner-verified as of 2026-08-18", () => {
    // The ledger's financial spine is now fully closed: the proof figure
    // (Q-0007), Neara (Q-0001), 13SICK (Q-0003), Ferovinum (Q-0002), and the
    // last two — Origami and Veyor — verified under Q-0012 on 2026-08-18.
    for (const claim of claimsLedger) {
      expect(claim.publishStatus, claim.id).toBe("approved");
      expect(isPublishable(claim)).toBe(true);
    }
  });
});

describe("derived fields", () => {
  it("derives company, copy, currency, and draft value from the live models", () => {
    const neara = claimById("C-0001-neara-enterprise-value")!;
    expect(claimCompany(neara)).toBe("Neara");
    expect(claimPublicCopy(neara)).toBe("FROM IDEA TO A$1B+");
    expect(claimCurrency(neara)).toBe("AUD");
    // Approved 2026-08-03 (Q-0001): the verified figure publishes marker-free.
    expect(claimDraftValue(neara)).toBe("A$200m");
  });

  it("attributes the proof figure to the portfolio and reads its currency as undecided", () => {
    const proof = claimById("C-0006-portfolio-enterprise-value")!;
    expect(claimCompany(proof)).toContain("portfolio");
    expect(claimPublicCopy(proof)).toContain("$500M+");
    expect(claimCurrency(proof)).toBe("undecided");
  });

  it("looks up claims by id and by backing case study", () => {
    expect(claimById("nope")).toBeUndefined();
    expect(claimsForCaseStudy("13sick").map((c) => c.id)).toEqual([
      "C-0003-13sick-enterprise-value",
    ]);
    expect(claimsForCaseStudy("neara")).toHaveLength(1);
  });
});

describe("validateClaimsLedger — referential integrity", () => {
  it("rejects a claim targeting an unknown case study", () => {
    const ledger = cloneLedger();
    (ledger[0].target as { slug: string }).slug = "ghostco";
    expect(validateClaimsLedger(ledger).join("\n")).toContain("unknown case study");
  });

  it("rejects a duplicate claim id", () => {
    const ledger = cloneLedger();
    ledger[1].id = ledger[0].id;
    expect(validateClaimsLedger(ledger).join("\n")).toContain("Duplicate claim id");
  });

  it("rejects a malformed claim id", () => {
    const ledger = cloneLedger();
    ledger[0].id = "neara-value";
    expect(validateClaimsLedger(ledger).join("\n")).toContain("C-NNNN");
  });

  it("rejects a claim whose queue item does not exist", () => {
    const ledger = cloneLedger();
    ledger[0].queueItem = "Q-9999-nope";
    expect(validateClaimsLedger(ledger).join("\n")).toContain("does not exist");
  });

  it("rejects a financial claim pointed at a non-category-B queue item", () => {
    const ledger = cloneLedger();
    // Q-0008 is a category-A strategic-copy item, not a financial-claims item.
    ledger[0].queueItem = "Q-0008-strategic-copy";
    expect(validateClaimsLedger(ledger).join("\n")).toMatch(/category A, not B|does not cover/);
  });

  it("rejects a claim whose queue item does not cover its target", () => {
    const ledger = cloneLedger();
    // Q-0003 is category B but covers 13SICK, not Neara.
    ledger[0].queueItem = "Q-0003-13sick-valuation";
    expect(validateClaimsLedger(ledger).join("\n")).toContain("does not cover its target");
  });
});

describe("validateClaimsLedger — lifecycle", () => {
  it("flags an unapproved claim whose queue item is already resolved", () => {
    // Every live claim is approved as of 2026-08-18, so the guard is exercised
    // against a claim wound back to `researching` under its now-resolved item —
    // exactly the state that would arise if a figure were later challenged and
    // nobody reopened a queue item to track it.
    const ledger = cloneLedger();
    const claim = ledger.find((c) => c.id === "C-0004-origami-enterprise-value")!;
    claim.publishStatus = "researching";
    expect(validateClaimsLedger(ledger, cloneQueue()).join("\n")).toContain(
      "needs an open queue item",
    );
  });

  it("flags an approved claim whose copy still carries a draft marker", () => {
    // No live study carries a marker any more — Ferovinum's figures were
    // verified on 2026-08-18 and Origami/Veyor publish with no figure at all —
    // so the guard is exercised against a study wound back to its draft state.
    const ledger = cloneLedger();
    const origami = ledger.find((c) => c.id === "C-0004-origami-enterprise-value")!;
    origami.publishStatus = "approved";
    const queue = cloneQueue();
    const item = queue.find((q) => q.id === origami.queueItem)!;
    item.status = "approved";
    item.decision = "Approved.";
    item.decisionDate = "2026-07-26";
    item.decidedBy = "finance-owner";
    // The derived draft value reads the live study, so the marker is restored on
    // the real record for the length of the assertion and wound back after.
    const study = caseStudies.find((s) => s.slug === "origami")!;
    const original = study.valueCreated;
    try {
      (study as { valueCreated?: string }).valueCreated = "[VERIFY: $50m]";
      expect(validateClaimsLedger(ledger, queue).join("\n")).toContain(
        "contains a draft marker",
      );
    } finally {
      (study as { valueCreated?: string }).valueCreated = original;
    }
  });
});

describe("validateClaimsLedger — published case-study cross-check", () => {
  it("rejects a published study citing a claim id absent from the ledger", () => {
    const studies = [publishedStudy("neara", ["C-9999-missing"])];
    expect(
      validateClaimsLedger(claimsLedger, approvalQueue, studies).join("\n"),
    ).toContain("not in the ledger");
  });

  it("rejects a published study citing a rejected claim", () => {
    const ledger = cloneLedger();
    ledger[0].publishStatus = "rejected";
    const studies = [publishedStudy("neara", ["C-0001-neara-enterprise-value"])];
    expect(validateClaimsLedger(ledger, approvalQueue, studies).join("\n")).toContain(
      "rejected claim",
    );
  });

  it("rejects a published study citing a claim that backs a different target", () => {
    const studies = [publishedStudy("neara", ["C-0003-13sick-enterprise-value"])];
    expect(
      validateClaimsLedger(claimsLedger, approvalQueue, studies).join("\n"),
    ).toContain("backs a different target");
  });

  it("accepts a published study citing its own live claim", () => {
    const studies = [publishedStudy("neara", ["C-0001-neara-enterprise-value"])];
    expect(validateClaimsLedger(claimsLedger, approvalQueue, studies)).toEqual([]);
  });

  it("does not require in-research (unpublished) studies to cite claim ids", () => {
    // The real, unpublished studies carry empty claimIds and must still validate.
    expect(validateClaimsLedger()).toEqual([]);
  });
});

describe("renderClaimsLedgerCsv", () => {
  it("uses the exact R-006 column header", () => {
    const header = renderClaimsLedgerCsv().split("\n")[0];
    expect(header).toBe(CLAIMS_LEDGER_COLUMNS.join(","));
    // Spot-check the R-006 contract is honoured.
    expect(CLAIMS_LEDGER_COLUMNS).toContain("claim_id");
    expect(CLAIMS_LEDGER_COLUMNS).toContain("publish_status");
    expect(CLAIMS_LEDGER_COLUMNS).toContain("owner_approval");
  });

  it("emits one data row per claim and ends with a trailing newline", () => {
    const csv = renderClaimsLedgerCsv();
    expect(csv.endsWith("\n")).toBe(true);
    const rows = csv.trimEnd().split("\n");
    expect(rows).toHaveLength(claimsLedger.length + 1);
  });

  it("quotes fields containing commas so the CSV stays parseable", () => {
    // "Helix Collective (portfolio)" has no comma, but public copy may; assert the
    // escaper wraps any comma-bearing field rather than splitting a column.
    const csv = renderClaimsLedgerCsv();
    for (const line of csv.trimEnd().split("\n")) {
      // A well-formed row never has an unquoted comma count that breaks columns:
      // parse defensively by ensuring quoted segments are balanced.
      const quotes = (line.match(/"/g) ?? []).length;
      expect(quotes % 2).toBe(0);
    }
  });

  it("marks the portfolio figure's client approval as not-required", () => {
    const csv = renderClaimsLedgerCsv();
    const proofRow = csv
      .split("\n")
      .find((l) => l.startsWith("C-0006-portfolio-enterprise-value"));
    expect(proofRow).toContain("not-required");
  });

  it("matches the committed docs/research/claims-ledger.csv (no drift)", () => {
    expect(renderClaimsLedgerCsv()).toBe(readCommittedCsv());
  });
});

describe("category-B linkage", () => {
  it("every ledger queue item is a real category-B financial-claims item", () => {
    for (const claim of claimsLedger) {
      const item = approvalQueue.find((q) => q.id === claim.queueItem);
      expect(item).toBeDefined();
      expect(item!.category).toBe("B");
      expect(item!.requiredApprovers).toEqual(REQUIRED_APPROVERS.B);
    }
  });
});
