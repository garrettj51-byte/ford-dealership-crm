import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHONE_OR_EMAIL_ERROR,
  REBOOK_TASK_TITLE,
  canMarkLostOrDead,
  canMarkSold,
  nextTouchFromPreset,
  promoteNewToWorking,
  requirePhoneOrEmail,
} from "./domain";

describe("phone or email", () => {
  it("requires phone or email", () => {
    assert.equal(requirePhoneOrEmail("", ""), PHONE_OR_EMAIL_ERROR);
    assert.equal(requirePhoneOrEmail(null, "  "), PHONE_OR_EMAIL_ERROR);
    assert.equal(requirePhoneOrEmail("5551234567", ""), null);
    assert.equal(requirePhoneOrEmail("", "a@b.com"), null);
  });
});

describe("status rules", () => {
  it("promotes new to working on first activity", () => {
    assert.equal(promoteNewToWorking("NEW"), "WORKING");
    assert.equal(promoteNewToWorking("WORKING"), "WORKING");
    assert.equal(promoteNewToWorking("APPT_SET"), "APPT_SET");
  });

  it("allows sold from working without an appointment", () => {
    assert.equal(canMarkSold("WORKING"), true);
    assert.equal(canMarkSold("APPT_SET"), true);
    assert.equal(canMarkSold("SOLD"), false);
    assert.equal(canMarkSold("LOST"), false);
  });

  it("requires a non-terminal status to mark lost or dead", () => {
    assert.equal(canMarkLostOrDead("WORKING"), true);
    assert.equal(canMarkLostOrDead("DEAD"), false);
  });
});

describe("next touch presets", () => {
  it("skip once creates no task", () => {
    assert.equal(nextTouchFromPreset("skip"), null);
  });

  it("call today creates an open call task", () => {
    const draft = nextTouchFromPreset("call_today");
    assert.ok(draft);
    assert.equal(draft.type, "CALL");
    assert.equal(draft.title, "Call");
  });
});

describe("no-show rebook", () => {
  it("uses the locked Call — rebook title", () => {
    assert.equal(REBOOK_TASK_TITLE, "Call — rebook");
  });
});
