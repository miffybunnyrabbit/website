import { describe, expect, it } from "vitest";
import {
  assertProofBannerValid,
  proofBanner,
  publishedProofBanner,
  validateProofBanner,
  type ProofBanner,
  type ProofMetric,
} from "./proofBanner";

/** A banner whose metrics array is mutable, for tests that tweak one metric. */
type MutableBanner = Omit<ProofBanner, "metrics"> & { metrics: ProofMetric[] };

/** Deep-clone the canonical banner so a test can mutate it safely. */
function cloneBanner(overrides: Partial<MutableBanner> = {}): MutableBanner {
  return {
    ...proofBanner,
    metrics: proofBanner.metrics.map((m) => ({ ...m })),
    ...overrides,
  };
}

describe("proofBanner configuration", () => {
  it("shows exactly the two required metrics in order", () => {
    expect(proofBanner.metrics).toHaveLength(2);
    expect(proofBanner.metrics.map((m) => m.id)).toEqual([
      "enterprise-value",
      "years-in-operation",
    ]);
  });

  it("carries the $500M+ and 10+ years figures", () => {
    const [ev, years] = proofBanner.metrics;
    expect(ev.value).toBe("$500M+");
    expect(ev.label).toContain("ENTERPRISE VALUE");
    expect(years.value).toBe("10+");
    expect(years.label).toContain("YEARS");
  });

  it("passes its own validation as authored", () => {
    expect(validateProofBanner()).toEqual([]);
    expect(() => assertProofBannerValid()).not.toThrow();
  });

  it("publishes in its safe currency-neutral draft form while D-001 is pending", () => {
    // The revised approach (§5 last row, §17, §23) publishes the pending claim in
    // its safe fallback rather than withholding it; the bare "$" is deliberately
    // currency-neutral and the open Q-0007 item tracks confirming the currency.
    expect(proofBanner.currencyApproval).toBe("pending");
    expect(proofBanner.publish).toBe(true);
    expect(publishedProofBanner()).toBe(proofBanner);
  });
});

describe("validateProofBanner guardrails", () => {
  it("rejects a third metric bolted on to refill the old layout", () => {
    const banner = cloneBanner({
      metrics: [
        ...proofBanner.metrics.map((m) => ({ ...m })),
        { id: "enterprise-value", value: "50+", label: "VENTURES BACKED" } as ProofMetric,
      ],
    });
    const errors = validateProofBanner(banner);
    expect(errors.some((e) => e.includes("exactly 2 metrics"))).toBe(true);
  });

  it("rejects the removed venture count", () => {
    const banner = cloneBanner();
    banner.metrics[1] = { id: "years-in-operation", value: "50+", label: "VENTURES" };
    const errors = validateProofBanner(banner);
    expect(errors.some((e) => e.includes("forbidden copy"))).toBe(true);
  });

  it("rejects a human or team count", () => {
    const banner = cloneBanner();
    banner.metrics[1] = {
      id: "years-in-operation",
      value: "40+",
      label: "TEAM MEMBERS",
    };
    const errors = validateProofBanner(banner);
    expect(errors.some((e) => e.includes("human or team count"))).toBe(true);
  });

  it("rejects a changed metric order", () => {
    const banner = cloneBanner();
    [banner.metrics[0], banner.metrics[1]] = [banner.metrics[1], banner.metrics[0]];
    const errors = validateProofBanner(banner);
    expect(errors.some((e) => e.includes('must be "enterprise-value"'))).toBe(true);
  });

  it("rejects altering the required $500M+ figure", () => {
    const banner = cloneBanner();
    banner.metrics[0] = {
      id: "enterprise-value",
      value: "$250M+",
      label: "ENTERPRISE VALUE CREATED",
    };
    const errors = validateProofBanner(banner);
    expect(errors.some((e) => e.includes('read as "$500M+"'))).toBe(true);
  });

  it("rejects altering the required 10+ years figure", () => {
    const banner = cloneBanner();
    banner.metrics[1] = {
      id: "years-in-operation",
      value: "5+",
      label: "YEARS IN OPERATION",
    };
    const errors = validateProofBanner(banner);
    expect(errors.some((e) => e.includes('read as "10+"'))).toBe(true);
  });

  it("rejects a mislabelled enterprise-value metric", () => {
    const banner = cloneBanner();
    banner.metrics[0] = {
      id: "enterprise-value",
      value: "$500M+",
      label: "VALUE CREATED",
    };
    const errors = validateProofBanner(banner);
    expect(errors.some((e) => e.includes('reference "enterprise value"'))).toBe(true);
  });

  it("rejects a missing value or label", () => {
    const banner = cloneBanner();
    banner.metrics[0] = { id: "enterprise-value", value: "  ", label: "ENTERPRISE VALUE CREATED" };
    banner.metrics[1] = { id: "years-in-operation", value: "10+", label: "" };
    const errors = validateProofBanner(banner);
    expect(errors.some((e) => e.includes("missing its value"))).toBe(true);
    expect(errors.some((e) => e.includes("missing its label"))).toBe(true);
  });

  it("rejects draft markers left in the banner copy", () => {
    const banner = cloneBanner();
    banner.metrics[1] = { id: "years-in-operation", value: "10+", label: "YEARS — TBD" };
    const errors = validateProofBanner(banner);
    expect(errors.some((e) => e.includes("draft marker"))).toBe(true);
  });

  it("allows publishing while the currency is still pending (D-001)", () => {
    // Currency is no longer a publication gate: the safe currency-neutral draft
    // publishes and Q-0007 tracks the decision (§23). The async linkage is
    // enforced in approvalQueue.ts, not here.
    const banner = cloneBanner({ publish: true, currencyApproval: "pending" });
    expect(validateProofBanner(banner)).toEqual([]);
    expect(publishedProofBanner(banner)).toBe(banner);
  });

  it("still renders nothing when the model is explicitly held back", () => {
    const banner = cloneBanner({ publish: false, currencyApproval: "pending" });
    expect(validateProofBanner(banner)).toEqual([]);
    expect(publishedProofBanner(banner)).toBeNull();
  });

  it("allows publishing once the currency is approved", () => {
    const banner = cloneBanner({ publish: true, currencyApproval: "approved" });
    expect(validateProofBanner(banner)).toEqual([]);
    expect(publishedProofBanner(banner)).toBe(banner);
  });

  it("assertProofBannerValid throws with an aggregated message on bad config", () => {
    const banner = cloneBanner({ metrics: [] });
    expect(() => assertProofBannerValid(banner)).toThrow(/Invalid proof banner/);
  });
});
