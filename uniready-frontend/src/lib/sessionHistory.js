// Client-side session history, persisted in IndexedDB.
//
// WHY INDEXEDDB (not localStorage): structured, async, non-blocking, and
// already the stated caching strategy elsewhere in this app (see the
// "Offline Strategy" note in the product blueprint). localStorage is
// synchronous/string-only and would block the main thread as history grows.
//
// WHY EXPIRY-BY-EXAM-DATE (not a fixed session count cap): this app is used
// intensively for one exam-prep season (a few months), then the user is
// done, essentially permanently. A fixed cap like "keep the last 50" is an
// arbitrary number with no relationship to the actual usage pattern.
// Instead, each stored session snapshots the exam date it was preparing
// for (from dashboardContent.js's EXAM_TARGET at save time). Once that date
// is more than GRACE_PERIOD_DAYS in the past, the session is considered
// stale and gets pruned — storage naturally resets between prep seasons
// instead of growing forever or being capped by a guessed-at number.
//
// This is explicitly a stopgap for the single-device case. It does NOT
// solve cross-device history (e.g. a student using a shared/cyber-café
// device) — that needs backend persistence with auth, which uniready-api
// doesn't have wired up yet (schema exists, OTP endpoints are stubbed).
// See RESULTS.md / HANDOFF_RESULTS.md for that discussion.

const DB_NAME = "uniready-history";
const DB_VERSION = 1;
const STORE_NAME = "sessionResults";
const GRACE_PERIOD_DAYS = 30;

function isIndexedDbAvailable() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openHistoryDB() {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error("IndexedDB not available in this environment"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("completedAt", "completedAt");
        store.createIndex("examDate", "examDate");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Persists one completed exam session. `sessionResult` should be the same
// shape documented in RESULTS.md (subject, year, topicFilter,
// timeSpentSeconds, answers[]). `examTarget` is passed in separately
// (rather than imported directly) so this module has no dependency on
// dashboardContent.js and stays easy to reuse/test on its own.
export async function saveSessionResult(sessionResult, examTarget) {
  if (!isIndexedDbAvailable()) return null;

  const record = {
    ...sessionResult,
    id: generateId(),
    completedAt: new Date().toISOString(),
    examLabel: examTarget?.label ?? null,
    examDate: examTarget?.date ? new Date(examTarget.date).toISOString() : null,
  };

  const db = await openHistoryDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return record;
}

// Returns all stored sessions, most recent first. Never throws — if
// IndexedDB is unavailable (e.g. a very old browser, or a non-browser
// environment), it resolves to an empty array so callers don't need
// try/catch everywhere.
export async function getAllSessionResults() {
  if (!isIndexedDbAvailable()) return [];

  try {
    const db = await openHistoryDB();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return records.sort(
      (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
    );
  } catch {
    return [];
  }
}

// Deletes sessions whose exam date (snapshotted at save time) is more than
// GRACE_PERIOD_DAYS in the past. Call this on app/dashboard load — it's
// cheap and idempotent, so there's no harm calling it often.
export async function pruneExpiredSessions(now = new Date()) {
  if (!isIndexedDbAvailable()) return 0;

  try {
    const db = await openHistoryDB();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const cutoffMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    const toDelete = records.filter((r) => {
      if (!r.examDate) return false; // no exam date snapshot — never auto-prune it
      return now.getTime() - new Date(r.examDate).getTime() > cutoffMs;
    });

    if (toDelete.length > 0) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const r of toDelete) store.delete(r.id);
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    db.close();
    return toDelete.length;
  } catch {
    return 0;
  }
}

// Convenience: flattens answers from many stored sessions into one array,
// each answer tagged with its session's subject — the shape
// getSubjectBreakdown() in resultsContent.js expects.
export function flattenAnswersWithSubject(sessions) {
  const flattened = [];
  for (const session of sessions) {
    for (const answer of session.answers ?? []) {
      flattened.push({ ...answer, subject: session.subject });
    }
  }
  return flattened;
}