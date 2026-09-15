import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  classifyUpdate,
  carriesDueDate,
  isManagebacEmail,
  cleanSubject,
  htmlToText,
  stripForwardHeaders,
  makeSnippet,
  stripFooterLines,
  extractDueDate,
  detectSubject,
  findMatchingDeadline,
} from "@/lib/class-updates";

/** An email reduced to what the app needs, independent of how it was fetched. */
export interface EmailInput {
  messageId: string;
  from: string;
  subject: string;
  body: string;
  bodyIsHtml: boolean;
  receivedAt: Date;
}

export interface IngestResult {
  added: number;
  skippedNotManagebac: number;
}

/**
 * Turns emails into class updates for one user. Kept apart from the Gmail
 * fetching so the whole pipeline — classify, match, store — can be exercised
 * without a Google account.
 *
 * Idempotent: an email already stored (by Gmail message id) is ignored.
 */
export async function ingestEmails(userId: string, emails: EmailInput[]): Promise<IngestResult> {
  const [selections, deadlines] = await Promise.all([
    db.select().from(schema.subjectSelections).where(eq(schema.subjectSelections.userId, userId)),
    db.select().from(schema.deadlines).where(eq(schema.deadlines.userId, userId)),
  ]);
  const subjectNames = selections.map((s) => s.subjectName);

  let added = 0;
  let skippedNotManagebac = 0;

  for (const email of emails) {
    const rawText = email.bodyIsHtml ? htmlToText(email.body) : email.body;
    if (!isManagebacEmail(email.from, email.subject, rawText)) {
      skippedNotManagebac++;
      continue;
    }

    const text = stripForwardHeaders(rawText);
    const title = cleanSubject(email.subject);
    const kind = classifyUpdate(title, text);
    const dueAt = carriesDueDate(kind) ? extractDueDate(title, text, email.receivedAt) : null;
    const match = findMatchingDeadline({ title, dueAt }, deadlines);

    const result = await db
      .insert(schema.classUpdates)
      .values({
        id: crypto.randomUUID(),
        userId,
        messageId: email.messageId,
        kind,
        title,
        snippet: makeSnippet(stripFooterLines(text)) || null,
        subject: detectSubject(`${title}\n${text}`, subjectNames),
        dueAt,
        deadlineId: match?.id ?? null,
        receivedAt: email.receivedAt,
      })
      .onConflictDoNothing({ target: [schema.classUpdates.userId, schema.classUpdates.messageId] });

    if (result.rowsAffected > 0) added++;
  }

  return { added, skippedNotManagebac };
}
