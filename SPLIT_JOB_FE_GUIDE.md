# Split Job Logs — FE Integration Reference

## Endpoint
`GET /examinationSession/answerSheets?examinationSessionId=<id>`

---

## Response shape (per row)
```jsonc
{
  "id": 1,
  "examinationSessionId": 42,
  "s3File": {
    "id": 7,
    "fileName": "batch_oct_2026.pdf",
    "s3Key": "uploads/batch_oct_2026.pdf",
    "downloadUrl": "https://s3.../presigned-url"   // expires in 15 min
  },
  "creator": { "userId": 3, "userName": "admin", "email": "a@b.com" },

  // Array of split attempts, newest first. Empty [] if never split.
  "splitJobs": [
    {
      "id": "uuid-of-job",          // jobDbId — use this to poll status
      "bullmqJobId": "uuid",        // BullMQ internal id (rarely needed in FE)
      "status": "COMPLETED",        // see status table below
      "progress": 100,              // 0–100
      "totalStudents": 60,
      "processedStudents": 60,
      "totalBatches": 6,
      "completedBatches": 6,
      "failedBatches": 0,
      "errorMessage": null,         // string if status is FAILED
      "errorDetails": null,         // array of per-batch errors (see below)
      "resultSummary": null,        // present when COMPLETED / PARTIALLY_COMPLETED (see below)
      "statusLog": [                // ordered timeline of every status transition
        { "status": "PENDING",       "progress": 0,   "timestamp": "2026-08-29T15:00:00.000Z" },
        { "status": "DOWNLOADING",   "progress": 0,   "timestamp": "2026-08-29T15:00:01.123Z" },
        { "status": "SCANNING_QR",   "progress": 5,   "timestamp": "2026-08-29T15:00:04.456Z" },
        { "status": "VALIDATING_DB", "progress": 25,  "timestamp": "2026-08-29T15:00:12.789Z" },
        { "status": "SPLITTING",     "progress": 30,  "timestamp": "2026-08-29T15:00:13.001Z" },
        { "status": "COMPLETED",     "progress": 100, "timestamp": "2026-08-29T15:04:12.000Z" }
      ],
      "createdAt": "2026-08-29T15:00:00.000Z",
      "updatedAt": "2026-08-29T15:04:12.000Z"
    }
  ]
}
```

---

## `statusLog` — full event timeline
Every entry has `event` + `timestamp` (ISO 8601 UTC). Status-change entries also have `status` + `progress`.

```jsonc
// ── On job creation ──────────────────────────────────────────────────────────
{ "event": "JOB_CREATED",       "status": "PENDING", "progress": 0 }

// ── Orchestrator stages ──────────────────────────────────────────────────────
{ "event": "STATUS_CHANGE",     "status": "DOWNLOADING",   "progress": 0  }
{ "event": "DOWNLOADING_DONE",  "durationMs": 1240 }

{ "event": "STATUS_CHANGE",     "status": "SCANNING_QR",   "progress": 5  }
{ "event": "SCANNING_QR_START", "totalPages": 120 }
{ "event": "SCANNING_QR_DONE",  "totalPages": 120, "totalStudents": 60, "durationMs": 8200 }

{ "event": "STATUS_CHANGE",       "status": "VALIDATING_DB", "progress": 25 }
{ "event": "VALIDATING_DB_DONE",  "validatedCount": 60, "durationMs": 340 }

// ── Fan-out (one entry per batch) ────────────────────────────────────────────
{ "event": "BATCH_ENQUEUED", "batchIndex": 0, "batchJobId": "uuid", "segmentCount": 10 }
{ "event": "BATCH_ENQUEUED", "batchIndex": 1, "batchJobId": "uuid", "segmentCount": 10 }
// … one per batch …

{ "event": "STATUS_CHANGE",   "status": "SPLITTING", "progress": 30 }
{ "event": "SPLITTING_START", "totalBatches": 6, "totalStudents": 60 }

// ── Per-batch events (concurrent — order not guaranteed) ─────────────────────
{ "event": "BATCH_STARTED",    "batchIndex": 2, "batchJobId": "uuid", "segmentCount": 10, "attempt": 1 }
{ "event": "BATCH_COMPLETED",  "batchIndex": 2, "batchJobId": "uuid", "segmentCount": 10,
                                "processedStudents": 30, "totalStudents": 60,
                                "completedBatches": 3, "totalBatches": 6, "durationMs": 4100 }

// ── On retry (non-final failure) ─────────────────────────────────────────────
{ "event": "BATCH_ATTEMPT_FAILED", "batchIndex": 4, "batchJobId": "uuid",
                                    "attempt": 2, "maxAttempts": 3, "error": "S3 timeout" }

// ── On permanent batch failure (all retries exhausted) ───────────────────────
{ "event": "BATCH_PERMANENTLY_FAILED", "batchIndex": 4, "batchJobId": "uuid",
                                        "attempts": 3, "error": "S3 timeout", "segmentCount": 10 }

// ── If server restarted between orchestration and batch ──────────────────────
{ "event": "TEMP_PDF_REDOWNLOADED", "batchIndex": 2,
                                     "reason": "Temp file missing — server likely restarted..." }

// ── Finalization ─────────────────────────────────────────────────────────────
{ "event": "STATUS_CHANGE",  "status": "COMPLETED", "progress": 100 }   // or PARTIALLY_COMPLETED
{ "event": "JOB_FINALIZED",  "status": "COMPLETED",
                              "processedStudents": 60, "totalStudents": 60,
                              "failedStudentsCount": 0,
                              "completedBatches": 6, "failedBatches": 0, "totalBatches": 6 }

// ── On orchestrator-level failure ────────────────────────────────────────────
{ "event": "STATUS_CHANGE", "status": "FAILED", "progress": 5 }
{ "event": "JOB_FAILED",    "error": "QR scanning failed on 2 pages", "details": [ ... ] }
```

> **UI tip:** sort by `timestamp`, group consecutive `BATCH_STARTED`/`BATCH_COMPLETED` pairs to show per-batch progress rows.

---

## Status values & what to show

| `status`              | Meaning                               | UI                                       |
|-----------------------|---------------------------------------|------------------------------------------|
| `PENDING`             | Queued, not started                   | Spinner / "Queued"                       |
| `DOWNLOADING`         | Downloading PDF from S3               | Spinner + progress bar (progress: 0–5)   |
| `SCANNING_QR`         | Reading QR codes per page             | Spinner + progress bar (progress: 5–20)  |
| `VALIDATING_DB`       | Matching QR data to students          | Spinner + progress bar (progress: 20–25) |
| `SPLITTING`           | Splitting pages into per-student PDFs | Progress bar (progress: 25–100)          |
| `COMPLETED`           | All students processed OK             | ✅ Green badge                           |
| `PARTIALLY_COMPLETED` | Some batches failed                   | ⚠️ Yellow badge + show `failedBatches`   |
| `FAILED`              | Entire job failed                     | ❌ Red badge + show `errorMessage`       |

---

## `errorDetails` shape (when batches fail)
```jsonc
// errorDetails is an array, one entry per failed batch
[
  {
    "batchIndex": 2,
    "jobId": "bullmq-batch-job-id",
    "error": "Student roll 2024CS042 not found in DB"
  }
]
```

---

## Display logic (pseudo-code)
```js
const latestJob = row.splitJobs[0] ?? null;   // newest attempt

if (!latestJob)                                 → show "Not split yet" + Split button
if (latestJob.status === 'COMPLETED')           → show ✅, disable Split button
if (latestJob.status === 'PARTIALLY_COMPLETED') → show ⚠️, show failedBatches, disable Split button
if (['PENDING','DOWNLOADING','SCANNING_QR',
     'VALIDATING_DB','SPLITTING'].includes(latestJob.status))
                                                → show progress bar, poll every 3s, disable Split button
if (latestJob.status === 'FAILED')              → show ❌ + errorMessage, enable Split button (retry allowed)

// To show history: map over row.splitJobs (all attempts, newest first)
```

## `resultSummary` shape (when COMPLETED or PARTIALLY_COMPLETED)
```jsonc
{
  "totalStudents": 60,
  "processedStudents": 57,
  "failedStudentsCount": 3,        // 0 when COMPLETED
  "totalBatches": 6,
  "completedBatches": 5,
  "failedBatches": 1,              // 0 when COMPLETED

  // Only present when failedStudentsCount > 0 (absent on full COMPLETED)
  "failedSegments": [
    {
      "batchIndex": 2,             // which worker batch failed
      "page": 43,                  // 1-indexed page in the original PDF
      "qrValue": "2024CS042",      // scanned QR content
      "studentId": 101,            // DB student id (null if QR unrecognised)
      "examScheduleId": 9,         // DB exam schedule id
      "failedReason": "Student not found in DB",
      "attemptsMade": 3
    }
  ]
}
```

### When to show `resultSummary`
| Status                | `resultSummary`        | `failedSegments`   |
|-----------------------|------------------------|-----------------------|
| `COMPLETED`           | ✅ present, `failedStudentsCount: 0` | absent (`null`) |
| `PARTIALLY_COMPLETED` | ✅ present, `failedStudentsCount > 0` | array of failures |
| anything else         | `null`                 | —                     |

---

## Polling (in-progress jobs)
```
GET /answerSheetQr/splitPdf/job/:jobDbId
```
Poll every **3 seconds** while status is not terminal.
Terminal statuses: `COMPLETED`, `PARTIALLY_COMPLETED`, `FAILED`

---

## Split button guard (BE also enforces this)
BE returns **`409`** if you try to split a `COMPLETED` / `PARTIALLY_COMPLETED` file.
Always disable the button in FE when `latestJob?.status` is one of those two.
