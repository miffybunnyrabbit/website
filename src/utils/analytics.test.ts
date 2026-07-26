import { afterEach, describe, it, expect } from "vitest";
import {
  ANALYTICS_EVENTS,
  analyticsEventFromAttribute,
  configureAnalytics,
  fitResultEvent,
  isAnalyticsEnabled,
  isAnalyticsEvent,
  track,
  trackAnalyticsClicks,
  type AnalyticsEvent,
} from "./analytics";
import { FIT_NODES, isResult, type NodeId } from "../components/fit/fitFlow";

// The sink is module-level state; reset it after every test so cases can't leak
// an installed sink into one another.
afterEach(() => configureAnalytics(null));

describe("analytics event registry", () => {
  it("recognises exactly the allowed events and rejects anything else", () => {
    for (const event of ANALYTICS_EVENTS) {
      expect(isAnalyticsEvent(event)).toBe(true);
    }
    expect(isAnalyticsEvent("pageview")).toBe(false);
    expect(isAnalyticsEvent("")).toBe(false);
  });

  it("includes the R-011 recommended events plus every fit outcome", () => {
    for (const recommended of [
      "cta_click",
      "fit_flow_started",
      "fit_flow_completed",
      "fit_result_growth",
      "fit_result_idea",
      "fit_result_community",
      "fit_result_no_fit",
    ]) {
      expect(ANALYTICS_EVENTS).toContain(recommended);
    }
    // The recommended list omitted the not-current outcome; we cover all five.
    expect(ANALYTICS_EVENTS).toContain("fit_result_not_current_fit");
  });

  it("has no duplicate event names", () => {
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });
});

describe("configureAnalytics + track", () => {
  it("is a no-op that reports disabled until a sink is installed", () => {
    expect(isAnalyticsEnabled()).toBe(false);
    expect(track("cta_click")).toBe(false);
  });

  it("delivers events to an installed sink", () => {
    const seen: AnalyticsEvent[] = [];
    configureAnalytics((e) => seen.push(e));
    expect(isAnalyticsEnabled()).toBe(true);
    expect(track("cta_click")).toBe(true);
    expect(track("fit_flow_started")).toBe(true);
    expect(seen).toEqual(["cta_click", "fit_flow_started"]);
  });

  it("stops delivering once the sink is removed", () => {
    const seen: AnalyticsEvent[] = [];
    configureAnalytics((e) => seen.push(e));
    track("cta_click");
    configureAnalytics(null);
    expect(track("cta_click")).toBe(false);
    expect(seen).toEqual(["cta_click"]);
  });

  it("ignores an unknown event name even when a sink is installed", () => {
    const seen: string[] = [];
    configureAnalytics((e) => seen.push(e));
    // Simulate an untyped/DOM caller passing a bad string.
    expect(track("not-an-event" as AnalyticsEvent)).toBe(false);
    expect(seen).toEqual([]);
  });

  it("never lets a throwing sink break the caller", () => {
    configureAnalytics(() => {
      throw new Error("sink blew up");
    });
    expect(() => track("cta_click")).not.toThrow();
    expect(track("cta_click")).toBe(false);
  });
});

describe("fitResultEvent", () => {
  it("maps every result node to a distinct event", () => {
    const results = (Object.keys(FIT_NODES) as NodeId[]).filter((id) =>
      isResult(FIT_NODES[id]),
    );
    const events = results.map((id) => fitResultEvent(id));
    expect(events.every((e) => e !== null)).toBe(true);
    expect(new Set(events).size).toBe(results.length);
  });

  it("returns null for a question node", () => {
    expect(fitResultEvent("existing-business")).toBeNull();
    expect(fitResultEvent("capacity-leverage")).toBeNull();
  });

  it("uses the expected names for each outcome", () => {
    expect(fitResultEvent("growth-fit")).toBe("fit_result_growth");
    expect(fitResultEvent("idea-fit")).toBe("fit_result_idea");
    expect(fitResultEvent("community-fit")).toBe("fit_result_community");
    expect(fitResultEvent("not-current-fit")).toBe("fit_result_not_current_fit");
    expect(fitResultEvent("no-fit")).toBe("fit_result_no_fit");
  });
});

describe("analyticsEventFromAttribute", () => {
  it("passes through a valid event name", () => {
    expect(analyticsEventFromAttribute("cta_click")).toBe("cta_click");
  });

  it("rejects missing or unknown attribute values", () => {
    expect(analyticsEventFromAttribute(null)).toBeNull();
    expect(analyticsEventFromAttribute(undefined)).toBeNull();
    expect(analyticsEventFromAttribute("")).toBeNull();
    expect(analyticsEventFromAttribute("hover")).toBeNull();
  });
});

describe("trackAnalyticsClicks", () => {
  // A tiny DOM stand-in so the delegated listener can be exercised without jsdom.
  function fakeRoot() {
    let handler: ((event: Event) => void) | null = null;
    return {
      addEventListener: (_type: string, fn: (event: Event) => void) => {
        handler = fn;
      },
      removeEventListener: () => {
        handler = null;
      },
      click(attributeValue: string | null) {
        const el =
          attributeValue === null
            ? null
            : { getAttribute: () => attributeValue };
        handler?.({
          target: { closest: () => el },
        } as unknown as Event);
      },
      get hasHandler() {
        return handler !== null;
      },
    };
  }

  it("tracks a click on an element carrying a valid analytics attribute", () => {
    const seen: AnalyticsEvent[] = [];
    configureAnalytics((e) => seen.push(e));
    const root = fakeRoot();
    trackAnalyticsClicks(root);
    root.click("cta_click");
    expect(seen).toEqual(["cta_click"]);
  });

  it("ignores clicks with no matching element or an unknown event", () => {
    const seen: AnalyticsEvent[] = [];
    configureAnalytics((e) => seen.push(e));
    const root = fakeRoot();
    trackAnalyticsClicks(root);
    root.click(null);
    root.click("nope");
    expect(seen).toEqual([]);
  });

  it("removes the listener when the cleanup function runs", () => {
    const root = fakeRoot();
    const cleanup = trackAnalyticsClicks(root);
    expect(root.hasHandler).toBe(true);
    cleanup();
    expect(root.hasHandler).toBe(false);
  });
});
