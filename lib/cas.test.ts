import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAS_STRANDS,
  STRAND_META,
  isValidStrand,
  validateActivity,
  casTotals,
  strandsOf,
  MAX_HOURS,
} from "./cas.ts";

const ok = { title: "Football training", hours: 2, strands: ["activity"] };

test("CAS has the three strands", () => {
  assert.deepEqual([...CAS_STRANDS], ["creativity", "activity", "service"]);
  assert.ok(isValidStrand("service"));
  assert.ok(!isValidStrand("adventure"));
  assert.equal(STRAND_META.service.label, "Service");
});

test("accepts a well-formed activity", () => {
  assert.equal(validateActivity(ok), null);
});

test("an activity can serve more than one strand", () => {
  assert.equal(validateActivity({ ...ok, strands: ["activity", "service"] }), null);
});

test("rejects a blank name", () => {
  assert.ok(validateActivity({ ...ok, title: "" }));
  assert.ok(validateActivity({ ...ok, title: "   " }));
});

test("rejects negative or absurd hours, allows zero", () => {
  assert.ok(validateActivity({ ...ok, hours: -1 }));
  assert.ok(validateActivity({ ...ok, hours: MAX_HOURS + 1 }));
  assert.ok(validateActivity({ ...ok, hours: Number.NaN }));
  assert.equal(validateActivity({ ...ok, hours: 0 }), null, "logging zero hours is allowed");
});

test("allows fractional hours", () => {
  assert.equal(validateActivity({ ...ok, hours: 1.5 }), null);
});

test("requires at least one real strand", () => {
  assert.ok(validateActivity({ ...ok, strands: [] }));
  assert.ok(validateActivity({ ...ok, strands: ["cooking"] }));
});

test("totals of nothing are zero, not NaN", () => {
  const t = casTotals([]);
  assert.equal(t.totalHours, 0);
  assert.equal(t.activityCount, 0);
  assert.deepEqual(t.byStrand, { creativity: 0, activity: 0, service: 0 });
});

test("hours count toward every strand an activity serves, but once overall", () => {
  const t = casTotals([
    { hours: 10, creativity: false, activity: true, service: true }, // coaching
    { hours: 4, creativity: true, activity: false, service: false },
  ]);
  assert.equal(t.byStrand.activity, 10);
  assert.equal(t.byStrand.service, 10, "the same 10 hours serve both strands");
  assert.equal(t.byStrand.creativity, 4);
  assert.equal(t.totalHours, 14, "but the total counts each activity once");
  assert.equal(t.activityCount, 2);
});

test("null hours are treated as zero rather than poisoning the total", () => {
  const t = casTotals([
    { hours: null, creativity: true, activity: false, service: false },
    { hours: 3, creativity: true, activity: false, service: false },
  ]);
  assert.equal(t.totalHours, 3);
  assert.equal(t.byStrand.creativity, 3);
});

test("strandsOf lists the strands in a stable order", () => {
  assert.deepEqual(strandsOf({ hours: 1, creativity: true, activity: false, service: true }), [
    "creativity",
    "service",
  ]);
  assert.deepEqual(strandsOf({ hours: 1, creativity: false, activity: false, service: false }), []);
});
