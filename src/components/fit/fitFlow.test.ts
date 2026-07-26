import { describe, it, expect } from "vitest";
import {
  FIT_NODES,
  REDFERN_ADDRESS,
  START_NODE_ID,
  getNode,
  isQuestion,
  isResult,
  next,
  resolve,
  resultNodes,
  type Answer,
  type NodeId,
} from "./fitFlow";

describe("fitFlow graph shape", () => {
  it("starts at the existing-business question", () => {
    expect(START_NODE_ID).toBe("existing-business");
    expect(getNode(START_NODE_ID).type).toBe("question");
  });

  it("every question transition points at a real node", () => {
    for (const node of Object.values(FIT_NODES)) {
      if (isQuestion(node)) {
        expect(FIT_NODES[node.yes]).toBeDefined();
        expect(FIT_NODES[node.no]).toBeDefined();
      }
    }
  });

  it("has exactly five outcomes, three qualifying and two not", () => {
    const results = resultNodes();
    expect(results).toHaveLength(5);
    expect(results.filter((r) => r.qualified)).toHaveLength(3);
    expect(results.filter((r) => !r.qualified)).toHaveLength(2);
  });

  it("shows the Redfern address only on the non-qualifying outcomes", () => {
    for (const result of resultNodes()) {
      if (result.qualified) {
        expect(result.address).toBeUndefined();
      } else {
        expect(result.address).toBe(REDFERN_ADDRESS);
      }
    }
  });

  it("every result has a non-empty headline and body", () => {
    for (const result of resultNodes()) {
      expect(result.headline.length).toBeGreaterThan(0);
      expect(result.body.length).toBeGreaterThan(0);
    }
  });
});

describe("next()", () => {
  it("routes each question by answer", () => {
    expect(next("existing-business", "yes")).toBe("capacity-leverage");
    expect(next("existing-business", "no")).toBe("strong-idea");
    expect(next("capacity-leverage", "yes")).toBe("growth-fit");
    expect(next("capacity-leverage", "no")).toBe("not-current-fit");
    expect(next("strong-idea", "yes")).toBe("idea-fit");
    expect(next("strong-idea", "no")).toBe("builder-energy");
    expect(next("builder-energy", "yes")).toBe("community-fit");
    expect(next("builder-energy", "no")).toBe("no-fit");
  });

  it("throws when answering a terminal result node", () => {
    expect(() => next("growth-fit", "yes")).toThrow();
    expect(() => next("no-fit", "no")).toThrow();
  });
});

describe("resolve() — every branch to a leaf", () => {
  const cases: Array<{ answers: Answer[]; expected: NodeId }> = [
    { answers: ["yes", "yes"], expected: "growth-fit" },
    { answers: ["yes", "no"], expected: "not-current-fit" },
    { answers: ["no", "yes"], expected: "idea-fit" },
    { answers: ["no", "no", "yes"], expected: "community-fit" },
    { answers: ["no", "no", "no"], expected: "no-fit" },
  ];

  it.each(cases)("$answers -> $expected", ({ answers, expected }) => {
    const node = resolve(answers);
    expect(node.id).toBe(expected);
    expect(isResult(node)).toBe(true);
  });

  it("with no answers stays on the start question", () => {
    const node = resolve([]);
    expect(node.id).toBe(START_NODE_ID);
    expect(isQuestion(node)).toBe(true);
  });

  it("throws when given more answers than the path has questions", () => {
    // yes -> yes lands on growth-fit (terminal); a third answer has nothing to consume it.
    expect(() => resolve(["yes", "yes", "yes"])).toThrow();
  });
});

describe("getNode()", () => {
  it("throws on an unknown id", () => {
    expect(() => getNode("nope" as NodeId)).toThrow();
  });
});
