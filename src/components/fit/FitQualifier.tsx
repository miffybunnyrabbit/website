/**
 * Interactive "Are we a fit?" qualifier island (implementation plan §12).
 *
 * This is the site's only hydrated React island (§18.5). It renders the
 * decision graph from `fitFlow` one question at a time as an accessible stepper
 * (§12.5 mobile-first treatment): a real `fieldset`/`legend` per question, large
 * keyboard-operable yes/no `<button>`s, `Back` and `Start again` controls, a
 * progress indicator, and an `aria-live` region so the outcome is announced when
 * it changes (§12.4). It invents no copy — every prompt, headline, and body
 * comes from the validated graph, and qualifying outcomes route to the single
 * `primaryCta` rather than a bespoke label (§13).
 *
 * The component is driven entirely by the ordered list of answers, so its whole
 * state is one array. `initialAnswers` lets a caller (or a test) render the
 * island already resolved to a given branch without simulating clicks; the flow
 * has no side effects and reads/writes no storage (§12.4).
 */
import { useMemo, useState } from "react";
import {
  START_NODE_ID,
  isQuestion,
  next,
  resolve,
  type Answer,
  type FitNode,
} from "./fitFlow";
import { primaryCta } from "../../config/cta";

export interface FitQualifierProps {
  /** Answers to replay before the first paint; defaults to the start. */
  initialAnswers?: readonly Answer[];
}

/** The current node plus its 1-based question position for the progress line. */
interface FlowState {
  node: FitNode;
  answers: readonly Answer[];
}

export default function FitQualifier({
  initialAnswers = [],
}: FitQualifierProps) {
  const [answers, setAnswers] = useState<readonly Answer[]>(initialAnswers);

  // Derive the current node from the answers; `resolve` is pure so the render is
  // a direct function of state and never drifts from the graph.
  const state: FlowState = useMemo(
    () => ({ node: resolve(answers), answers }),
    [answers],
  );

  const answer = (choice: Answer) => {
    // Guard against a stray click on an already-terminal node.
    if (!isQuestion(state.node)) return;
    // Confirm the transition exists before committing it.
    next(state.node.id, choice);
    setAnswers([...answers, choice]);
  };

  const back = () => setAnswers(answers.slice(0, -1));
  const restart = () => setAnswers([]);

  const onQuestion = isQuestion(state.node);
  const step = answers.length + 1;

  return (
    <div className="fit-qualifier" data-node={state.node.id}>
      <p className="fit-qualifier__progress" aria-hidden={!onQuestion}>
        {onQuestion ? `Question ${step}` : "Your result"}
      </p>

      {/* The interactive region is a polite live region so screen readers hear
          each new question and the final outcome without a manual focus jump. */}
      <div className="fit-qualifier__stage" role="group" aria-live="polite">
        {onQuestion && isQuestion(state.node) ? (
          <fieldset className="fit-qualifier__question">
            <legend className="fit-qualifier__prompt">
              {state.node.prompt}
            </legend>
            <div className="fit-qualifier__answers">
              <button
                type="button"
                className="fit-qualifier__answer"
                onClick={() => answer("yes")}
              >
                Yes
              </button>
              <button
                type="button"
                className="fit-qualifier__answer"
                onClick={() => answer("no")}
              >
                No
              </button>
            </div>
          </fieldset>
        ) : (
          !isQuestion(state.node) && (
            <div className="fit-qualifier__result">
              <h3 className="fit-qualifier__result-headline">
                {state.node.headline}
              </h3>
              <p className="fit-qualifier__result-body">{state.node.body}</p>
              {state.node.qualified ? (
                <a
                  className="fit-qualifier__cta"
                  href={primaryCta.href}
                  data-analytics-event={primaryCta.analyticsEvent}
                >
                  {primaryCta.label}
                </a>
              ) : (
                state.node.address && (
                  <address className="fit-qualifier__address">
                    {state.node.address}
                  </address>
                )
              )}
            </div>
          )
        )}
      </div>

      <div className="fit-qualifier__controls">
        <button
          type="button"
          className="fit-qualifier__control"
          onClick={back}
          disabled={answers.length === 0}
        >
          Back
        </button>
        <button
          type="button"
          className="fit-qualifier__control"
          onClick={restart}
          disabled={answers.length === 0}
        >
          Start again
        </button>
      </div>
    </div>
  );
}

// Re-export the start id so callers can reason about the initial state.
export { START_NODE_ID };
