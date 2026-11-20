// A plan's limit, end to end without a database: which plan lifts each limit, what the server answers, and what the
// browser reads back from a route, a server action or Better Auth.
import { expect, test } from "vitest";
import { planThatLifts } from "@/lib/plans";
import { HttpError, QuotaError, httpErrorBody } from "@/lib/workspace-core";
import { failureOf, planLimitOf, PlanLimitError } from "@/lib/plan-limit";

test("the plan named is the cheapest above that gives more of what ran out", () => {
  expect(planThatLifts("items", "free"), "Duo has no cap on references").toBe("duo");
  expect(planThatLifts("ai", "free")).toBe("duo");
  expect(planThatLifts("ai", "duo"), "Studio has more AI actions than Duo").toBe("studio");
  expect(planThatLifts("members", "free"), "Duo is two people too: Studio is the first with more seats").toBe("studio");
  expect(planThatLifts("workspaces", "studio"), "only Agency holds several workspaces").toBe("agency");
  expect(planThatLifts("checks", "free")).toBe("duo");
  expect(planThatLifts("teams", "free"), "any paid plan lets a person start a team").toBe("duo");
  expect(planThatLifts("teams", "duo")).toBeNull();
  expect(planThatLifts("members", "agency"), "nothing above the top").toBeNull();
  expect(planThatLifts("items", "duo"), "a limit the plan does not have is lifted by nothing").toBeNull();
});

test("a QuotaError answers with the fields the notice reads; any other error does not", () => {
  expect(httpErrorBody(new QuotaError("members", "duo", "Full"))).toEqual({ error: "Full", quota: true, upgrade: "studio" });
  expect(httpErrorBody(new HttpError(403, "No"))).toEqual({ error: "No" });
});

test("the browser reads a plan's limit from a route's body, an action's result and Better Auth's error alike", () => {
  const route = planLimitOf({ error: "Library full", quota: true, upgrade: "duo" });
  expect(route).toBeInstanceOf(PlanLimitError);
  expect([route?.message, route?.upgrade]).toEqual(["Library full", "duo"]);
  expect(planLimitOf({ ok: false, error: "Spent", quota: true, upgrade: null })?.upgrade).toBeNull();
  expect(planLimitOf({ message: "Seats", quota: true, upgrade: "studio", status: 402 })?.message, "Better Auth carries `message`").toBe("Seats");
  expect(planLimitOf({ error: "Spent", quota: true, upgrade: "gold" })?.upgrade, "an unknown plan is no plan").toBeNull();
  expect(planLimitOf({ ok: false, error: "Not found" })).toBeNull();

  expect(failureOf({ error: "Spent", quota: true, upgrade: "duo" })).toBeInstanceOf(PlanLimitError);
  expect(failureOf({ error: "Not found" })).not.toBeInstanceOf(PlanLimitError);
  expect(failureOf({}, "Error 500").message).toBe("Error 500");
});
