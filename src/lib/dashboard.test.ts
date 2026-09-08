import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OPEN_STATUSES,
  PIPELINE_ORDER,
  conversionRate,
  openLeadsCount,
  pipelineFromCounts,
  sortLeaderboard,
  type LeaderboardRow,
} from "./dashboard";

describe("pipeline breakdown", () => {
  it("returns every status in funnel order", () => {
    const pipeline = pipelineFromCounts({ NEW: 3, WORKING: 5 });
    assert.deepEqual(
      pipeline.map((p) => p.status),
      PIPELINE_ORDER,
    );
  });

  it("fills missing statuses with zero and labels each row", () => {
    const pipeline = pipelineFromCounts({ WORKING: 2 });
    const working = pipeline.find((p) => p.status === "WORKING");
    const dead = pipeline.find((p) => p.status === "DEAD");
    assert.equal(working?.count, 2);
    assert.equal(working?.label, "Working");
    assert.equal(dead?.count, 0);
    assert.equal(dead?.label, "Dead");
  });
});

describe("open leads count", () => {
  it("sums only the in-play statuses", () => {
    const counts = { NEW: 2, WORKING: 4, APPT_SET: 1, SOLD: 9, LOST: 7, DEAD: 3 };
    assert.equal(openLeadsCount(counts), 7);
    assert.deepEqual(OPEN_STATUSES, ["NEW", "WORKING", "APPT_SET"]);
  });

  it("is zero with no open leads", () => {
    assert.equal(openLeadsCount({ SOLD: 5 }), 0);
    assert.equal(openLeadsCount({}), 0);
  });
});

describe("conversion rate", () => {
  it("is sold over all closed deals as a whole percent", () => {
    assert.equal(conversionRate(3, 1, 0), 75);
    assert.equal(conversionRate(1, 1, 2), 25);
  });

  it("is zero when nothing has closed", () => {
    assert.equal(conversionRate(0, 0, 0), 0);
  });
});

describe("leaderboard ordering", () => {
  it("ranks by sold, then open leads, then name", () => {
    const rows: LeaderboardRow[] = [
      { id: "a", name: "Ada", openLeads: 2, openTasks: 1, soldThisMonth: 1 },
      { id: "b", name: "Bo", openLeads: 9, openTasks: 4, soldThisMonth: 3 },
      { id: "c", name: "Cy", openLeads: 5, openTasks: 2, soldThisMonth: 1 },
    ];
    assert.deepEqual(
      sortLeaderboard(rows).map((r) => r.id),
      ["b", "c", "a"],
    );
  });

  it("does not mutate the input array", () => {
    const rows: LeaderboardRow[] = [
      { id: "a", name: "Ada", openLeads: 1, openTasks: 0, soldThisMonth: 0 },
      { id: "b", name: "Bo", openLeads: 1, openTasks: 0, soldThisMonth: 2 },
    ];
    const original = [...rows];
    sortLeaderboard(rows);
    assert.deepEqual(rows, original);
  });
});
