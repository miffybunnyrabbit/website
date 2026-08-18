/**
 * Pure state graph for the interactive "Are we a fit?" qualifier.
 *
 * This module contains no UI and no side effects. The decision tree from the
 * implementation plan (section 12.2) is expressed as data, and traversal is a
 * set of pure functions so every branch can be unit-tested independently of the
 * React island that renders it.
 *
 * Wording for the questions and outcomes is a working baseline (pending D-004);
 * the *shape* of the graph is what these functions guarantee.
 */

export type NodeId =
  | "existing-business"
  | "capacity-leverage"
  | "strong-idea"
  | "builder-energy"
  | "growth-fit"
  | "idea-fit"
  | "community-fit"
  | "not-current-fit"
  | "no-fit";

export type Answer = "yes" | "no";

export interface QuestionNode {
  type: "question";
  id: NodeId;
  prompt: string;
  yes: NodeId;
  no: NodeId;
}

export interface ResultNode {
  type: "result";
  id: NodeId;
  headline: string;
  body: string;
  /** Whether this outcome routes the visitor to the primary CTA. */
  qualified: boolean;
  /** Redfern address shown on the non-qualifying outcomes only. */
  address?: string;
}

export type FitNode = QuestionNode | ResultNode;

/** Address surfaced on the two non-qualifying outcomes (D-007 recommended default). */
export const REDFERN_ADDRESS = "Level 1, 2–14 Vine Street, Redfern NSW 2016";

/** The node the flow always starts from. */
export const START_NODE_ID: NodeId = "existing-business";

/**
 * The complete decision graph, keyed by node id.
 *
 * Q1 existing business? yes -> Q2, no -> Q3
 * Q2 capacity leverage?  yes -> growth-fit, no -> not-current-fit
 * Q3 strong idea?        yes -> idea-fit,   no -> Q4
 * Q4 builder energy?     yes -> community-fit, no -> no-fit
 */
export const FIT_NODES: Readonly<Record<NodeId, FitNode>> = {
  "existing-business": {
    type: "question",
    id: "existing-business",
    prompt:
      "Are you already doing A$1m–A$10m in annual revenue or A$500k–A$3m in EBITDA?",
    yes: "capacity-leverage",
    no: "strong-idea",
  },
  "capacity-leverage": {
    type: "question",
    id: "capacity-leverage",
    prompt:
      "If delivery capacity increased without costs increasing at the same rate, could you roughly double sales?",
    yes: "growth-fit",
    no: "not-current-fit",
  },
  "strong-idea": {
    type: "question",
    id: "strong-idea",
    prompt:
      "Got a strong idea, credible potential customers, but no clear path from idea to product?",
    yes: "idea-fit",
    no: "builder-energy",
  },
  "builder-energy": {
    type: "question",
    id: "builder-energy",
    prompt:
      "Mostly looking to spend time around people who build, ship and get things done?",
    yes: "community-fit",
    no: "no-fit",
  },
  "growth-fit": {
    type: "result",
    id: "growth-fit",
    headline: "THERE MAY BE A REAL VALUE LEVER HERE.",
    body: "You have an existing engine and a credible route to scale without costs rising in lockstep. That is exactly the kind of constraint we like attacking.",
    qualified: true,
  },
  "idea-fit": {
    type: "result",
    id: "idea-fit",
    headline: "THIS MAY BE A 0 → 1 WORTH TESTING.",
    body: "A strong idea and credible customers are a better starting point than a polished deck. Let’s pressure-test whether there is a venture here.",
    qualified: true,
  },
  "community-fit": {
    type: "result",
    id: "community-fit",
    headline: "COME BORROW SOME BUILDER ENERGY.",
    body: "Sometimes the first useful move is getting around people who ship. Book a conversation and tell us what you are working on.",
    qualified: true,
  },
  "not-current-fit": {
    type: "result",
    id: "not-current-fit",
    headline: "WE MAY NOT BE THE RIGHT GROWTH LEVER—YET.",
    body: "If more delivery capacity would not create more sales, the enterprise-value constraint may sit somewhere else. You are still welcome to say hello when you are nearby.",
    qualified: false,
    address: REDFERN_ADDRESS,
  },
  "no-fit": {
    type: "result",
    id: "no-fit",
    headline: "IT’S NOT US. IT’S YOU :)",
    body: "Come say hi when you are in the neighbourhood anyway.",
    qualified: false,
    address: REDFERN_ADDRESS,
  },
};

/**
 * Section framing copy for the qualifier (implementation plan §12.1). The
 * headline and intro are a working baseline pending D-004; they live here as
 * data so the render layer invents no copy of its own and a validator can keep
 * a blank or placeholder heading out of the build.
 */
export interface FitSectionCopy {
  /** Eyebrow above the heading, in the plan's shouty display case. */
  eyebrow: string;
  /** Section heading. */
  headline: string;
  /** Short line inviting the visitor into the flow. */
  intro: string;
}

/** The approved fit-section framing (§12.1 working draft). */
export const fitSectionCopy: FitSectionCopy = {
  eyebrow: "ARE WE A FIT?",
  headline: "LET’S FIND OUT BEFORE WE WASTE EACH OTHER’S TIME.",
  intro: "Follow the path. It takes less than a minute.",
};

/** Every question node in the graph, in declaration order. */
export function questionNodes(): QuestionNode[] {
  return Object.values(FIT_NODES).filter(isQuestion);
}

/** Look up a node by id. Throws on an unknown id so bugs surface early. */
export function getNode(id: NodeId): FitNode {
  const node = FIT_NODES[id];
  if (!node) {
    throw new Error(`Unknown fit-flow node: ${id}`);
  }
  return node;
}

export function isQuestion(node: FitNode): node is QuestionNode {
  return node.type === "question";
}

export function isResult(node: FitNode): node is ResultNode {
  return node.type === "result";
}

/**
 * Advance from a question node given an answer.
 * Throws if called on a result node — results are terminal.
 */
export function next(id: NodeId, answer: Answer): NodeId {
  const node = getNode(id);
  if (!isQuestion(node)) {
    throw new Error(`Cannot answer a result node: ${id}`);
  }
  return answer === "yes" ? node.yes : node.no;
}

/**
 * Replay an ordered list of answers from the start node and return the node the
 * path lands on. Extra answers after reaching a result throw, because the flow
 * has no more questions to consume them.
 */
export function resolve(answers: readonly Answer[]): FitNode {
  let current: NodeId = START_NODE_ID;
  for (const answer of answers) {
    current = next(current, answer);
  }
  return getNode(current);
}

/** Every result node reachable in the graph. */
export function resultNodes(): ResultNode[] {
  return Object.values(FIT_NODES).filter(isResult);
}

/**
 * Draft markers and obvious placeholders that must never reach a production
 * build (kept lowercase; matching is case-insensitive). Mirrors the guard used
 * for the CTA copy so no half-finished qualifier wording can ship.
 */
const FIT_DRAFT_MARKERS: readonly string[] = [
  "draft",
  "not for publication",
  "todo",
  "tbd",
  "placeholder",
  "lorem ipsum",
];

function containsDraftMarker(text: string): string | undefined {
  const lower = text.toLowerCase();
  return FIT_DRAFT_MARKERS.find((marker) => lower.includes(marker));
}

/**
 * Validate the section framing copy. Returns the list of problems; an empty
 * list means the copy is well-formed. The render layer treats any non-empty
 * result as fatal so a missing or placeholder heading cannot ship.
 */
export function validateFitSectionCopy(
  copy: FitSectionCopy = fitSectionCopy,
): string[] {
  const errors: string[] = [];
  const fields: Array<[keyof FitSectionCopy, string]> = [
    ["eyebrow", copy.eyebrow],
    ["headline", copy.headline],
    ["intro", copy.intro],
  ];
  for (const [name, value] of fields) {
    if (!value.trim()) {
      errors.push(`Fit section ${name} is missing.`);
      continue;
    }
    const marker = containsDraftMarker(value);
    if (marker) {
      errors.push(
        `Fit section ${name} contains a forbidden draft marker "${marker}".`,
      );
    }
  }
  return errors;
}

/** Assert the section framing copy is valid, throwing on failure. */
export function assertFitSectionCopyValid(
  copy: FitSectionCopy = fitSectionCopy,
): void {
  const errors = validateFitSectionCopy(copy);
  if (errors.length > 0) {
    throw new Error(`Invalid fit section copy:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Validate the decision graph's structural invariants (§12.2, §12.3). Returns
 * the list of problems; an empty list means the graph is well-formed. Guards
 * that every node is reachable from the start, every transition points at a
 * real node, there are exactly the five specified outcomes with the right
 * qualified split, and the Redfern address appears only on the two
 * non-qualifying outcomes.
 */
export function validateFitFlow(): string[] {
  const errors: string[] = [];

  const start = FIT_NODES[START_NODE_ID];
  if (!start) {
    errors.push(`Start node "${START_NODE_ID}" is missing.`);
    return errors;
  }
  if (!isQuestion(start)) {
    errors.push(`Start node "${START_NODE_ID}" must be a question.`);
  }

  // Every question transition must resolve to a real node.
  for (const node of questionNodes()) {
    for (const target of [node.yes, node.no]) {
      if (!FIT_NODES[target]) {
        errors.push(
          `Question "${node.id}" points at unknown node "${target}".`,
        );
      }
    }
    if (!node.prompt.trim()) {
      errors.push(`Question "${node.id}" has an empty prompt.`);
    }
  }

  // Every node must be reachable from the start so no outcome is orphaned.
  const reachable = new Set<NodeId>([START_NODE_ID]);
  const queue: NodeId[] = [START_NODE_ID];
  while (queue.length > 0) {
    const node = FIT_NODES[queue.shift()!];
    if (node && isQuestion(node)) {
      for (const target of [node.yes, node.no]) {
        if (FIT_NODES[target] && !reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      }
    }
  }
  for (const id of Object.keys(FIT_NODES) as NodeId[]) {
    if (!reachable.has(id)) {
      errors.push(`Node "${id}" is unreachable from the start.`);
    }
  }

  // Exactly the five specified outcomes, three qualifying and two not.
  const results = resultNodes();
  if (results.length !== 5) {
    errors.push(`Expected 5 outcomes, found ${results.length}.`);
  }
  const qualified = results.filter((r) => r.qualified).length;
  if (qualified !== 3) {
    errors.push(`Expected 3 qualifying outcomes, found ${qualified}.`);
  }
  const notQualified = results.length - qualified;
  if (notQualified !== 2) {
    errors.push(`Expected 2 non-qualifying outcomes, found ${notQualified}.`);
  }

  for (const result of results) {
    if (!result.headline.trim() || !result.body.trim()) {
      errors.push(`Outcome "${result.id}" is missing a headline or body.`);
    }
    // The Redfern address belongs only on the two non-qualifying outcomes; a
    // qualifying outcome routes to the CTA instead (§12.3, D-007).
    if (result.qualified && result.address !== undefined) {
      errors.push(`Qualifying outcome "${result.id}" must not show an address.`);
    }
    if (!result.qualified && result.address !== REDFERN_ADDRESS) {
      errors.push(
        `Non-qualifying outcome "${result.id}" must show the Redfern address.`,
      );
    }
  }

  return errors;
}

/** Assert the decision graph is structurally valid, throwing on failure. */
export function assertFitFlowValid(): void {
  const errors = validateFitFlow();
  if (errors.length > 0) {
    throw new Error(`Invalid fit flow graph:\n- ${errors.join("\n- ")}`);
  }
}
