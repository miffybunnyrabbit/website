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
      "Are you already doing A$1m–A$10m in annual revenue or A$500k–A$3m in EBITA?",
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
