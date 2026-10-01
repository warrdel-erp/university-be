# Fee Plan Profile Removal — APIs to Test

Scope: batch-direct fee plans (`fee_plan_item.batch_id`) and removal of `feePlanProfile` / `feePlanProfileId`.  
Auth: Bearer `{{token}}` on all endpoints.

Run migration first: `migrations/20260923210000-drop-fee-plan-profile.cjs`

---

## Removed (expect 404)

| Method | Path |
|--------|------|
| * | `/feePlanProfile/*` |
| GET | `/options/feePlans` |
| GET | `/student/feePlanProfiles/all` |

Do **not** send `feePlanProfileId` on student create/update or fee-plan-item create/update.

---

## 1. Fee plan items (`/feePlanItem`)

| Method | Path | What to verify |
|--------|------|----------------|
| GET | `/feePlanItem/batches` | List by batch; `feePlan` has only `feePlanItemCount` (no profile id/name) |
| GET | `/feePlanItem/batches/overview?batchId=` | Overview; no `feePlanName` from profile |
| GET | `/feePlanItem/batches/year?batchId=&year=` | Year receipts; no `feePlanProfile` on items |
| GET | `/feePlanItem/batches/billing?batchId=&year=` | Billing statuses; `status` string only |
| POST | `/feePlanItem` | Create receipt + sub-items for `batchId` + `year` (no `feePlanProfileId`) |
| PATCH | `/feePlanItem` | Update draft item |
| DELETE | `/feePlanItem?feePlanItemId=` | Delete draft item |
| POST | `/feePlanItem/subItem` | Add component |
| DELETE | `/feePlanItem/subItem?feePlanSubitemId=` | Remove component |
| PATCH | `/feePlanItem/publish` | Body `{ batchId, year }` — publishes year |
| PATCH | `/feePlanItem/unpublish` | Blocked if invoices exist |
| GET | `/feePlanItem/publishHistory?batchId=&year=` | History rows |
| GET | `/feePlanItem/publishHistory/single?feePlanPublishHistoryId=` | Single history row |

---

## 2. Student fee invoices (`/studentFeeInvoice`)

| Method | Path | What to verify |
|--------|------|----------------|
| POST | `/studentFeeInvoice` | Body `{ studentId, feePlanItemId }` — student `batchId` must match item `batchId`; item must be **published** |
| POST | `/studentFeeInvoice/adhoc` | Still works (no fee plan item) |
| GET | `/studentFeeInvoice?studentId=` | List for student; response has no profile cascade |
| GET | `/studentFeeInvoice/single?studentFeeInvoiceId=` | Detail; `feePlan` is item-only |
| GET | `/studentFeeInvoice/all?status=` | Institute table (`all` / `pending` / `completed`) |

---

## 3. Student fee payments (`/studentFeePayment`)

| Method | Path | What to verify |
|--------|------|----------------|
| GET | `/studentFeePayment/payment/details?studentId=` | Details load without profile fields |
| POST | `/studentFeePayment/payment/details` | Record payment against invoice |
| GET | `/studentFeePayment` | Payment list |
| GET | `/studentFeePayment/single?studentFeePaymentId=` | Single payment |

---

## 4. Student (`/student`) — fee-related only

| Method | Path | What to verify |
|--------|------|----------------|
| POST | `/student` | Create without `feePlanProfileId`; optional `batchId` |
| PATCH | `/student/:studentId` (or existing update path) | Update `batchId` only; reject/ignore old `feePlanProfileId` if sent |
| GET | `/student/feePlanStudents?batchId=&courseId=&year=&term=` | Filter by `batchId`; totals from batch fee items |
| GET | `/student/emptyfeeDetails` | Students with **no** `batchId` |

---

## Suggested smoke order

1. Create fee receipts for a batch year → publish year  
2. Ensure students have matching `batchId`  
3. Generate invoice → pay → list invoice/payment  
4. Confirm removed `/feePlanProfile` and `/options/feePlans` return 404  
5. Confirm unpublish fails after invoice exists  

---

## Out of scope (no need to retest for this change)

- Legacy `/feePlan` (old fee plan module)  
- Non-fee student APIs (attendance, promotion, timetable, etc.)  
- Fee type category / catalog CRUD (unchanged unless used as setup data)
