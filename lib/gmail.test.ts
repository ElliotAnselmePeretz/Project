import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeBase64Url,
  header,
  messageBody,
  receivedAt,
  authorizationUrl,
  redirectUri,
  type GmailMessage,
} from "./gmail.ts";

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

test("decodes Gmail's base64url, including the characters base64 spells differently", () => {
  const original = "Due >> Friday?? ümlaut";
  assert.equal(decodeBase64Url(b64url(original)), original);
});

test("header lookup is case-insensitive and empty when missing", () => {
  const msg: GmailMessage = { id: "1", payload: { headers: [{ name: "Subject", value: "New task" }] } };
  assert.equal(header(msg, "subject"), "New task");
  assert.equal(header(msg, "From"), "");
});

test("prefers the plain-text part inside nested multiparts", () => {
  const msg: GmailMessage = {
    id: "1",
    payload: {
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            { mimeType: "text/html", body: { data: b64url("<p>html</p>") } },
            { mimeType: "text/plain", body: { data: b64url("plain") } },
          ],
        },
      ],
    },
  };
  assert.deepEqual(messageBody(msg), { text: "plain", isHtml: false });
});

test("falls back to HTML, flagged, when there is no plain text", () => {
  const msg: GmailMessage = { id: "1", payload: { mimeType: "text/html", body: { data: b64url("<b>hi</b>") } } };
  assert.deepEqual(messageBody(msg), { text: "<b>hi</b>", isHtml: true });
});

test("an empty message has an empty body rather than throwing", () => {
  assert.deepEqual(messageBody({ id: "1" }), { text: "", isHtml: false });
});

test("receivedAt reads Gmail's millisecond timestamp", () => {
  assert.equal(receivedAt({ id: "1", internalDate: "1789467600000" }).getTime(), 1789467600000);
});

test("the authorization URL asks for read-only Gmail with a refresh token", () => {
  process.env.GOOGLE_CLIENT_ID = "test-client";
  delete process.env.AUTH_URL;
  const url = new URL(authorizationUrl("http://localhost:3000", "state123"));
  assert.equal(url.searchParams.get("client_id"), "test-client");
  assert.equal(url.searchParams.get("scope"), "https://www.googleapis.com/auth/gmail.readonly");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("state"), "state123");
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:3000/api/gmail/callback");
});

test("AUTH_URL wins over the request origin for the redirect URI", () => {
  process.env.AUTH_URL = "https://studybase.example/";
  assert.equal(redirectUri("http://localhost:3000"), "https://studybase.example/api/gmail/callback");
  delete process.env.AUTH_URL;
});
