import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyUpdate,
  carriesDueDate,
  isManagebacEmail,
  cleanSubject,
  htmlToText,
  stripForwardHeaders,
  makeSnippet,
  extractDueDate,
  detectSubject,
  findMatchingDeadline,
  stripFooterLines,
} from "./class-updates.ts";

// The subjects below are illustrative, not copied from real ManageBac emails —
// the rules are keyword-based precisely because the real wording can vary.

test("classifies the common kinds of notification", () => {
  assert.equal(classifyUpdate("New task: Paper 1 practice", ""), "task");
  assert.equal(classifyUpdate("Grade posted for Unit 3 test", ""), "grade");
  assert.equal(classifyUpdate("Ms Rossi commented on your IA draft", ""), "comment");
  assert.equal(classifyUpdate("Due date changed: Economics essay", ""), "change");
  assert.equal(classifyUpdate("New announcement in Biology HL", ""), "announcement");
  assert.equal(classifyUpdate("Parents' evening on Thursday", ""), "event");
});

test("more specific kinds win over task when both apply", () => {
  assert.equal(classifyUpdate("A comment on your task", ""), "comment", "comment beats task");
  assert.equal(classifyUpdate("Task due date was changed", ""), "change", "change beats task");
});

test("falls back to the body when the subject says nothing, then to other", () => {
  assert.equal(classifyUpdate("ManageBac notification", "You have a new assignment due Friday."), "task");
  assert.equal(classifyUpdate("ManageBac notification", "Welcome to the portal."), "other");
});

test("only tasks and changes carry a due date worth extracting", () => {
  assert.ok(carriesDueDate("task"));
  assert.ok(carriesDueDate("change"));
  assert.ok(!carriesDueDate("grade"));
  assert.ok(!carriesDueDate("announcement"));
});

test("recognises ManageBac even when forwarding hides the original sender", () => {
  assert.ok(isManagebacEmail("notifications@managebac.com", "Task", ""));
  assert.ok(
    isManagebacEmail("claudio@school.edu", "FW: New task", "From: ManageBac <noreply@managebac.com>"),
    "Outlook forwarding puts ManageBac in the body, not the From line",
  );
  assert.ok(!isManagebacEmail("friend@gmail.com", "Lunch?", "See you at noon"));
});

test("cleanSubject strips stacked forward and reply prefixes", () => {
  assert.equal(cleanSubject("FW: RE: Fwd: New task: Essay"), "New task: Essay");
  assert.equal(cleanSubject("   "), "(no subject)");
});

test("htmlToText drops markup, scripts and entities", () => {
  const text = htmlToText(
    "<html><head><style>p{}</style></head><body><p>Due&nbsp;<b>Friday</b></p><script>x()</script><p>Tom &amp; Jerry</p></body></html>",
  );
  assert.equal(text, "Due Friday\nTom & Jerry");
});

test("stripForwardHeaders removes the Outlook forward block only", () => {
  const out = stripForwardHeaders(
    "---------- Forwarded message ----------\nFrom: ManageBac\nSent: Monday\nTo: Claudio\nSubject: Task\nPlease submit by Friday.",
  );
  assert.equal(out, "Please submit by Friday.");
});

test("makeSnippet collapses whitespace and cuts with an ellipsis", () => {
  assert.equal(makeSnippet("a\n\n b"), "a b");
  const long = makeSnippet("word ".repeat(100), 20);
  assert.ok(long.length <= 20);
  assert.ok(long.endsWith("…"));
});

const RECEIVED = new Date(2026, 8, 15, 10, 0);

test("extractDueDate finds an explicit date even with newsletter-style footers", () => {
  const date = extractDueDate(
    "New task: Paper 1 practice",
    "Due on 22 September 2026. To stop these emails, unsubscribe in your notification settings. noreply@managebac.com",
    RECEIVED,
  );
  assert.ok(date, "the unsubscribe footer must not throw the email away");
  assert.equal(date!.getDate(), 22);
  assert.equal(date!.getMonth(), 8);
});

test("extractDueDate refuses vague or implausible dates", () => {
  assert.equal(extractDueDate("Task", "Due sometime next week", RECEIVED), null);
  assert.equal(extractDueDate("Task", "Due 3 March 2031", RECEIVED), null, "years away is a misparse");
  assert.equal(extractDueDate("Task", "No date here at all", RECEIVED), null);
});

const SUBJECTS = ["English A: Literature", "French B", "Economics", "Biology", "Mathematics: Analysis and Approaches"];

test("detectSubject matches full names, short names and first words", () => {
  assert.equal(detectSubject("New task in Biology HL", SUBJECTS), "Biology");
  assert.equal(detectSubject("English A class announcement", SUBJECTS), "English A: Literature");
  assert.equal(detectSubject("Mathematics homework posted", SUBJECTS), "Mathematics: Analysis and Approaches");
  assert.equal(detectSubject("School trip letter", SUBJECTS), null);
});

test("findMatchingDeadline spots a task already in Deadlines", () => {
  const deadlines = [
    { id: "d1", title: "Paper 1 practice", dueAt: new Date(2026, 8, 22, 23, 59) },
    { id: "d2", title: "IA draft", dueAt: new Date(2026, 8, 25) },
  ];
  const match = findMatchingDeadline({ title: "New task: Paper 1 Practice!", dueAt: new Date(2026, 8, 22, 9) }, deadlines);
  assert.equal(match?.id, "d1", "same day, titles overlap once punctuation and case are ignored");
});

test("findMatchingDeadline does not match across days or on unrelated titles", () => {
  const deadlines = [{ id: "d1", title: "Paper 1 practice", dueAt: new Date(2026, 8, 22) }];
  assert.equal(findMatchingDeadline({ title: "Paper 1 practice", dueAt: new Date(2026, 8, 23) }, deadlines), null);
  assert.equal(findMatchingDeadline({ title: "Lab report", dueAt: new Date(2026, 8, 22) }, deadlines), null);
  assert.equal(findMatchingDeadline({ title: "Paper 1 practice", dueAt: null }, deadlines), null);
});

test("matching sees past a notification prefix on the email's title", () => {
  // Found by running sample emails through the pipeline: the "New task:" prefix
  // meant neither title contained the other, which would have offered a duplicate.
  const deadlines = [{ id: "d1", title: "Economics Paper 1 practice", dueAt: new Date(2026, 8, 17, 9) }];
  const match = findMatchingDeadline({ title: "New task: Paper 1 practice", dueAt: new Date(2026, 8, 17, 12) }, deadlines);
  assert.equal(match?.id, "d1");
});

test("htmlToText does not leave a gap where inline formatting ended", () => {
  assert.equal(htmlToText("<p>Set in <b>Economics</b>.</p>"), "Set in Economics.");
});

test("stripFooterLines removes notification footers but keeps the message", () => {
  assert.equal(
    stripFooterLines("Paper 1 practice is due on 17 September.\nUnsubscribe from notifications\nManage your notification settings"),
    "Paper 1 practice is due on 17 September.",
  );
});
