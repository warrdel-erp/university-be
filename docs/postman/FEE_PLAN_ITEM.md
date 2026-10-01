# Fee Plan Item (Batch-direct) APIs

Postman collection: `docs/postman/univ-v2-fee-plan-item.postman_collection.json`

Fee plans are linked directly to `batch.batch_id` via `fee_plan_item.batch_id`.  
Programme year is stored on `fee_plan_item.year` (1, 2, 3…).  
Students are counted from `students.batch_id`.

| | |
|---|---|
| **Auth** | Bearer Token Required |
| **Base URL** | `{{baseurl}}` (default `http://localhost:8080`) |
| **Mount** | `/feePlanItem` |
| **Permission** | `FEES_PLAN` |

### Headers (all endpoints)

| Header | Required | Description |
|---|---|---|
| Authorization | Yes | `Bearer {{token}}` |
| Accept | Yes | `application/json` |

---

## Workflow

```
POST /feeTypeCategory  →  POST /feeTypeCatalog
        ↓
GET /feePlanItem/batches
        ↓
GET /feePlanItem/batches/overview?batchId=
        ↓
GET /feePlanItem/batches/year?batchId=&year=
        ↓
GET /feePlanItem/batches/billing?batchId=&year=
        ↓
PATCH /feePlanItem/publish { batchId, year }
        ↓
POST /studentFeeInvoice { studentId, feePlanItemId }
        ↓
GET /feePlanItem/publishHistory?batchId=&year=
```

---

## 0. Fee type category (`/feeTypeCategory`)

Permission: `FEES_TYPE` (read) / `FEES_TYPE_ADD` / `FEES_TYPE_EDIT` / `FEES_TYPE_DELETE`

| Method | Endpoint | Body / Query |
|---|---|---|
| POST | `/feeTypeCategory` | `{ name, description? }` |
| GET | `/feeTypeCategory` | — |
| GET | `/feeTypeCategory/single?feeTypeCategoryId=` | query |
| PATCH | `/feeTypeCategory` | `{ feeTypeCategoryId, name?, description? }` |
| DELETE | `/feeTypeCategory?feeTypeCategoryId=` | query |

---

## 0b. Fee type catalog (`/feeTypeCatalog`)

Permission: `FEES_TYPE` (read) / `FEES_TYPE_ADD` / `FEES_TYPE_EDIT` / `FEES_TYPE_DELETE`

| Method | Endpoint | Body / Query |
|---|---|---|
| POST | `/feeTypeCatalog` | `{ name, amount, feeTypeCategoryId, ledgerType, description? }` |
| GET | `/feeTypeCatalog` | — |
| GET | `/feeTypeCatalog/single?feeTypeCatalogId=` | query |
| PATCH | `/feeTypeCatalog` | `{ feeTypeCatalogId, name?, amount?, feeTypeCategoryId?, ledgerType?, description? }` |
| DELETE | `/feeTypeCatalog?feeTypeCatalogId=` | query |

### ledgerType (enum)

```
Account Receivable
Account Payable
```

### Create catalog body example

```json
{
  "name": "Tuition Fee",
  "amount": "50000.00",
  "feeTypeCategoryId": 1,
  "ledgerType": "Account Receivable",
  "description": null
}
```

---

## 1. Get fee plan batches

Fee Plans list UI — batches grouped by programme + session.

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/feePlanItem/batches` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` |

### Query parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| courseId | Integer | No | — | Programme filter |
| sessionId | Integer | No | — | Session filter |
| search | String | No | — | Matches course name/code, session name, batch year, plan name |
| status | Enum | No | — | Filter by `currentYearStatus` |

### status (enum)

```
Published
In Review
Draft
Setup Required
```

### Success response

```json
{
  "success": true,
  "message": "Fee plan batches retrieved successfully",
  "data": {
    "activeCalendarYear": 2026,
    "academicYear": "2026-27",
    "academicYearId": 5,
    "yearTitle": "2026-27",
    "summary": {
      "totalBatches": 7,
      "published": 3,
      "inReview": 1,
      "draft": 1,
      "setupRequired": 2
    },
    "groups": [
      {
        "courseId": 1,
        "courseName": "B.Arch",
        "courseCode": "BARCH",
        "sessionId": 2,
        "sessionName": "Morning Session",
        "batches": [
          {
            "batchId": 1,
            "batch": 2026,
            "admissionBatch": "2026-31",
            "academicYears": "2026 - 2031",
            "currentYear": 1,
            "currentTerms": [
              { "term": 1, "termName": "Semester 1" },
              { "term": 2, "termName": "Semester 2" }
            ],
            "currentPositionLabel": "Semester 1 – Semester 2 · Year 1",
            "feePlan": {
              "feePlanItemCount": 2
            },
            "studentCount": 124,
            "currentYearStatus": "Published"
          }
        ]
      }
    ]
  },
  "paginationData": null
}
```

### currentYearStatus rules

| Status | When |
|---|---|
| Setup Required | No `fee_plan_item` rows for this `batchId` |
| Published | All items have `publishStatus = published` |
| Draft | Items exist; all are draft |
| In Review | Mix of published + draft items |

### Errors

| Status | Reason |
|---|---|
| 400 | Validation error / active academic year missing |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## 2. Get batch fee plan overview

Batch fee-plan screen header + programme fee summary + fee years table.

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/feePlanItem/batches/overview` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` |

### Query parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| batchId | Integer | Yes | — | Batch ID |

### Path parameters

None.

### Success response

```json
{
  "success": true,
  "message": "Batch fee plan overview retrieved successfully",
  "data": {
    "batch": {
      "batchId": 1,
      "batch": 2026,
      "admissionBatch": "2026-31",
      "status": "published"
    },
    "session": {
      "sessionId": 2,
      "sessionName": "Morning Session"
    },
    "course": {
      "courseId": 1,
      "courseName": "B.Arch",
      "courseCode": "BARCH",
      "duration": 5,
      "totalTerms": 10,
      "termType": "semester",
      "termRange": {
        "from": "Semester 1",
        "to": "Semester 10"
      }
    },
    "currentAcademicYear": "2026-27",
    "currentYear": 1,
    "currentPositionLabel": "Semester 1 – Semester 2 · Year 1",
    "studentCount": 124,
    "feePlanName": "UG Architecture Fee Plan",
    "summary": {
      "totalCurrentlyPlanned": 310000,
      "plannedYears": 2,
      "totalYears": 5,
      "currentYearAmount": 150000,
      "futurePlannedAmount": 160000
    },
    "feeYears": [
      {
        "year": 1,
        "yearLabel": "Year 1",
        "yearRole": "Current",
        "isCurrent": true,
        "academicYear": "2026-27",
        "academicCalendarYear": 2026,
        "academicPosition": "Semester 1 – Semester 2",
        "terms": [
          { "term": 1, "termName": "Semester 1" },
          { "term": 2, "termName": "Semester 2" }
        ],
        "configurationStatus": "Approved",
        "feeReceiptCount": 2,
        "componentCount": 8,
        "amount": 150000
      },
      {
        "year": 2,
        "yearLabel": "Year 2",
        "yearRole": "Planned",
        "isCurrent": false,
        "academicYear": "2027-28",
        "academicCalendarYear": 2027,
        "academicPosition": "Semester 3 – Semester 4",
        "terms": [
          { "term": 3, "termName": "Semester 3" },
          { "term": 4, "termName": "Semester 4" }
        ],
        "configurationStatus": "Draft",
        "feeReceiptCount": 2,
        "componentCount": 7,
        "amount": 160000
      },
      {
        "year": 3,
        "yearLabel": "Year 3",
        "yearRole": "Planned",
        "isCurrent": false,
        "academicYear": "2028-29",
        "academicCalendarYear": 2028,
        "academicPosition": "Semester 5 – Semester 6",
        "terms": [
          { "term": 5, "termName": "Semester 5" },
          { "term": 6, "termName": "Semester 6" }
        ],
        "configurationStatus": "Not Started",
        "feeReceiptCount": 0,
        "componentCount": 0,
        "amount": null
      }
    ]
  },
  "paginationData": null
}
```

### yearRole (enum)

```
Completed
Current
Planned
```

### configurationStatus (enum)

```
Approved
Draft
In Review
Not Started
```

### configurationStatus rules

| Status | When |
|---|---|
| Not Started | No `fee_plan_item` rows for that year |
| Approved | All items for that year have `publishStatus = published` |
| Draft | Items exist; all draft |
| In Review | Mix of published + draft |

### Errors

| Status | Reason |
|---|---|
| 400 | Validation error / batch missing session or course / active academic year missing |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Batch not found |
| 500 | Internal Server Error |

---

## 3. Get batch fee plan by year

Year detail — all planned fee receipts (`fee_plan_item` rows) for one programme year, with sub-items. Student invoices are generated later into `student_fee_invoice`.

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/feePlanItem/batches/year` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` |

### Query parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| batchId | Integer | Yes | — | Batch ID |
| year | Integer | Yes | — | Programme year (`1` … `course.courseDuration`) |

### Path parameters

None.

### Success response

```json
{
  "success": true,
  "message": "Batch fee plan year retrieved successfully",
  "data": {
    "batchId": 1,
    "batch": 2026,
    "year": 1,
    "yearLabel": "Year 1",
    "isCurrent": true,
    "academicYear": "2026-27",
    "academicPosition": "Semester 1 – Semester 2",
    "terms": [
      { "term": 1, "termName": "Semester 1" },
      { "term": 2, "termName": "Semester 2" }
    ],
    "configurationStatus": "Approved",
    "feeReceiptCount": 2,
    "componentCount": 8,
    "amount": 150000,
    "feeReceipts": [
      {
        "feePlanItemId": 11,
        "year": 1,
        "name": "Admission / Semester I Fee",
        "academicPeriod": "Semester I",
        "createDate": "2026-06-01",
        "dueDate": "2026-07-15",
        "publishStatus": "published",
        "publishedAt": "2026-09-23T14:30:00.000Z",
        "amount": 75000,
        "feePlanSubItems": [
          {
            "feePlanSubitemId": 101,
            "feeTypeId": 5,
            "name": "Tuition Fee",
            "ledgerType": "income",
            "amount": 50000,
            "isMainSubItem": true
          }
        ]
      }
    ]
  },
  "paginationData": null
}
```

### configurationStatus (enum)

```
Approved
Draft
In Review
Not Started
```

### Validation error response

```json
{
  "success": false,
  "message": "year must be between 1 and 5",
  "errors": null
}
```

### Errors

| Status | Reason |
|---|---|
| 400 | Validation error / year out of range / batch missing session or course / active academic year missing |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Batch not found |
| 500 | Internal Server Error |

---

## 4. Get batch billing details

Billing UI — planned fee receipts for a batch year with raise status.

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/feePlanItem/batches/billing` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` |

### Query parameters

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| batchId | Integer | Yes | — | Batch ID |
| year | Integer | Yes | — | Fee / programme year |

### Success response

```json
{
  "success": true,
  "message": "Batch billing details retrieved successfully",
  "data": {
    "batch": {
      "batchId": 1,
      "batch": 2026,
      "admissionBatch": "2026-31",
      "status": "published"
    },
    "session": { "sessionId": 2, "sessionName": "Morning Session" },
    "course": { "courseId": 1, "courseName": "B.Arch", "courseCode": "BARCH" },
    "academicYear": "2026-27",
    "currentYear": 1,
    "currentPositionLabel": "Semester 1 – Semester 2 · Year 1",
    "studentCount": 124,
    "feeYear": {
      "year": 1,
      "yearLabel": "Year 1",
      "configurationStatus": "Approved"
    },
    "plannedFeeReceipts": [
      {
        "feePlanItemId": 11,
        "name": "Admission / Semester I Fee",
        "academicPeriod": "Semester I",
        "plannedRaiseDate": "2026-07-01",
        "dueDate": "2026-08-15",
        "publishStatus": "published",
        "amountPerStudent": 75000,
        "expectedStudents": 124,
        "expectedBatchAmount": 9300000,
        "raisedInvoiceCount": 0,
        "status": "Ready to Raise",
        "feePlanSubItems": []
      },
      {
        "feePlanItemId": 12,
        "name": "Semester II Fee",
        "academicPeriod": "Semester II",
        "plannedRaiseDate": "2027-01-01",
        "dueDate": null,
        "publishStatus": "published",
        "amountPerStudent": 80000,
        "expectedStudents": 124,
        "expectedBatchAmount": 9920000,
        "raisedInvoiceCount": 0,
        "status": "Upcoming",
        "feePlanSubItems": []
      }
    ]
  }
}
```

### status (enum)

```
Ready to Raise
Upcoming
Due
Done
Draft
```

### status rules

| Status | When |
|---|---|
| Done | `raisedInvoiceCount >= expectedStudents` (and expectedStudents > 0) |
| Draft | Fee receipt / year not published yet |
| Upcoming | Published and `plannedRaiseDate` is after today |
| Due | Published, `dueDate` before today, not Done |
| Ready to Raise | Published, raise date reached, not Done |

Amounts: `amountPerStudent` and `expectedBatchAmount` use `decimalMoney` (`toMoneyNumber`, `decimalAdd`, `decimalMultiply`).

### Errors

| Status | Reason |
|---|---|
| 400 | Validation / year out of range |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Batch not found |
| 500 | Internal Server Error |

---

## 5. Create fee plan item + sub-items

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/feePlanItem` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` + `FEES_PLAN_ADD` |

### Request body

```json
{
  "batchId": 1,
  "year": 1,
  "name": "Admission / Semester I Fee",
  "academicPeriod": "Semester I",
  "createDate": "2026-07-01",
  "dueDate": "2026-08-15",
  "feePlanSubItems": [
    {
      "feeTypeCatalogId": 1,
      "amount": "50000.00",
      "isMainSubItem": true
    },
    {
      "feeTypeCatalogId": 2,
      "amount": "25000.00",
      "isMainSubItem": false
    }
  ]
}
```

### Body fields

| Field | Type | Required | Nullable | Description |
|---|---|---|---|---|
| batchId | Integer | Yes | No | Batch ID |
| year | Integer | Yes | No | Programme year |
| name | String | Yes | No | Planned receipt label |
| academicPeriod | String | Yes | No | Period tag (e.g. Semester I) |
| createDate | Date `YYYY-MM-DD` | Yes | No | Planned raise date |
| dueDate | Date `YYYY-MM-DD` | No | Yes | Due date |
| feePlanSubItems | Array | Yes | No | Min 1 fee component |
| feePlanSubItems[].feeTypeCatalogId | Integer | Yes | No | Fee type catalog ID |
| feePlanSubItems[].amount | String/Number | Yes | No | Line amount |
| feePlanSubItems[].isMainSubItem | Boolean | No | No | Main line flag |
| feePlanSubItems[].isMainItem | Boolean | No | No | Alias for isMainSubItem |

### Errors

| Status | Reason |
|---|---|
| 400 | Validation / year out of range / duplicate feeTypeCatalogId / catalog not found |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Batch not found |
| 500 | Internal Server Error |

---

## 6. Update fee plan item

| | |
|---|---|
| **Method** | `PATCH` |
| **Endpoint** | `/feePlanItem` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` + `FEES_PLAN_EDIT` |

### Request body

```json
{
  "feePlanItemId": 11,
  "name": "Admission / Semester I Fee",
  "academicPeriod": "Semester I",
  "createDate": "2026-07-01",
  "dueDate": "2026-08-15",
  "year": 1,
  "feePlanSubItems": [
    {
      "feeTypeCatalogId": 1,
      "amount": "55000.00",
      "isMainSubItem": true
    }
  ]
}
```

If `feePlanSubItems` is sent, all existing sub-items for that item are replaced.

### Errors

| Status | Reason |
|---|---|
| 400 | Validation / no updatable fields |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Fee plan item not found |
| 500 | Internal Server Error |

---

## 7. Delete fee plan item

| | |
|---|---|
| **Method** | `DELETE` |
| **Endpoint** | `/feePlanItem` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` + `FEES_PLAN_DELETE` |

### Query parameters

| Name | Type | Required | Description |
|---|---|---|---|
| feePlanItemId | Integer | Yes | Fee plan item ID |

Deletes the item and all of its `fee_plan_sub_items`.

---

## 8. Add fee plan sub-item

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/feePlanItem/subItem` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` + `FEES_PLAN_ADD` |

### Request body

```json
{
  "feePlanItemId": 11,
  "feeTypeCatalogId": 3,
  "amount": "5000.00",
  "isMainSubItem": false
}
```

---

## 9. Delete fee plan sub-item

| | |
|---|---|
| **Method** | `DELETE` |
| **Endpoint** | `/feePlanItem/subItem` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` + `FEES_PLAN_DELETE` |

### Query parameters

| Name | Type | Required | Description |
|---|---|---|---|
| feePlanSubitemId | Integer | Yes | Sub-item ID |

---

## 10. Publish fee plan year

Publish unit = all `fee_plan_item` rows for `batchId` + `year`.

| | |
|---|---|
| **Method** | `PATCH` |
| **Endpoint** | `/feePlanItem/publish` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN_PUBLISH` |

### Request body

```json
{
  "batchId": 1,
  "year": 1
}
```

### Rules

- Every item for that year must have ≥1 sub-item.
- Sets `publish_status = published` on all items for the year.
- Writes an append-only row to `fee_plan_publish_history` (`feePlanPublishHistoryId`).
- Published items cannot be edited/deleted until unpublished.

### Success response (data)

```json
{
  "batchId": 1,
  "year": 1,
  "feePlanPublishHistoryId": 12,
  "publishStatus": "published",
  "publishedAt": "2026-09-23T14:30:00.000Z",
  "publishedBy": 46
}
```

---

## 11. Unpublish fee plan year

| | |
|---|---|
| **Method** | `PATCH` |
| **Endpoint** | `/feePlanItem/unpublish` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN_PUBLISH` |

### Request body

```json
{
  "batchId": 1,
  "year": 1
}
```

Blocked if any `student_fee_invoice` with `status = generated` exists for those items.

---

## 12. Publish history

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/feePlanItem/publishHistory` |
| **Auth** | Bearer Token Required |
| **Permission** | `FEES_PLAN` |

### Query parameters

| Name | Type | Required | Description |
|---|---|---|---|
| batchId | Integer | Yes | Batch ID |
| year | Integer | No | Filter by programme year |

### Single history row

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/feePlanItem/publishHistory/single?feePlanPublishHistoryId=` |

`feePlanPublishHistoryId` is the history row id from the publish/unpublish response.

---

## Business rules

- Source of truth for fee plan assignment is `fee_plan_item.batch_id` (not student-level only).
- Multiple fee receipts per year = multiple `fee_plan_item` rows with the same `batch_id` + `year`.
- `feeReceiptCount` = number of `fee_plan_item` rows for that year (planned receipts to be paid — not student invoices).
- `componentCount` = number of `fee_plan_sub_items` across those receipts.
- Student invoices are created later in `student_fee_invoice` (from a `fee_plan_item`).
- All money math uses `utility/decimalMoney.js` (`toMoneyNumber`, `decimalAdd`, `decimalMultiply`).
- `studentCount` / `expectedStudents` = distinct students with `students.batch_id = batchId` (no academic-year filter).
- Current year / terms follow active academic calendar year vs admission batch year.
- Term labels use course `termType` (e.g. `Semester 1`, `Semester 2`) — exact Roman-numeral UI copy is not required.
- Only published batches (`batch.status = published`) appear in the list API.
- `name` / `academicPeriod` live on `fee_plan_item`.
- Year publish status lives on each `fee_plan_item.publish_status` (`draft` | `published`).
- Publish/unpublish is by `batchId` + `year`; history is append-only in `fee_plan_publish_history`.
- Batch-direct invoice generation requires published item + matching `student.batchId`.
- Invoice generation requires published `fee_plan_item` and matching `student.batchId`.

## Removed / not used

- Path params `/:batchId` and `/:year` — use query params instead.
- `feePlanItems.updatedAt` / Sequelize timestamps on `fee_plan_item` — model uses `timestamps: false`; do not rely on `lastUpdatedAt` from item timestamps.
- Calling planned receipts “invoices” — invoices are `student_fee_invoice` only.

---

## Changelog

### v6 (2026-09-23)

- Removed `fee_plan_profile` / `feePlanProfileId` — fee plans are batch-direct only.
- Students link via `batchId`; invoices/payments use `feePlanItemId`.

### v5 (2026-09-23)

- Responses only return stored / derived values — no seeded names, `statusDetail`, `action`, or publish `configurationStatus`.
- Billing `status` is a single enum string; `feeYear.label` removed.
- Delete responses return ids only (no `deleted: true` flag).

### v4 (2026-09-23)

- Added `publish_status` / `published_at` / `published_by` on `fee_plan_item`.
- Publish unit = `batchId` + `year` via `PATCH /feePlanItem/publish` and `/unpublish`.
- Append-only `fee_plan_publish_history` + `GET /feePlanItem/publishHistory`.
- Overview / billing status uses item `publishStatus` (Approved when year published).
- Invoice generation for batch-direct items requires item published + matching `student.batchId`.
- Published items are locked from edit/delete until unpublished (unpublish blocked if invoices exist).

### v3 (2026-09-23)

- Added `name` + `academic_period` columns on `fee_plan_item`.
- Added CRUD: `POST/PATCH/DELETE /feePlanItem`, `POST/DELETE /feePlanItem/subItem`.
- Added `GET /feePlanItem/batches/billing?batchId=&year=` with status Ready to Raise / Upcoming / Due / Done.
- Money fields use `decimalMoney` helpers.
- Postman collection includes `feeTypeCategory` + `feeTypeCatalog` CRUD (mounts `/feeTypeCategory`, `/feeTypeCatalog`).

### v2 (2026-09-23)

- Fixed `feePlanItems.updatedAt` unknown column (`timestamps: false` + explicit attributes).
- Added `GET /feePlanItem/batches/overview?batchId=`.
- Added `GET /feePlanItem/batches/year?batchId=&year=`.
- Overview / year use query params (not path params).

### v1 (2026-09-23)

- New `/feePlanItem` module for batch-direct fee plans.
- `GET /feePlanItem/batches` list API for Fee Plans UI.
