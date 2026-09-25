# List of Affected API URLs

Below is the complete list of all API URLs and endpoints affected by the `session_course_mapping` deprecation and session/batch refactoring.

---

## 1. Refactored & Updated API URLs (Active & Ready)

### 🔹 Course & Session URLs
1. `GET {{baseurl}}/course/my/:courseId/sessions`
   - **Change**: Removed strict user mapping check (`Course not found or not mapped to you`). Now fetches session and batch details directly for `:courseId` from `sessionModel` & `batchModel`.
2. `GET {{baseurl}}/course/:courseId/sessions`
   - **Change**: Fetches session details directly from `sessionModel` & `batchModel` for given `:courseId`.
3. `DELETE {{baseurl}}/course/:courseId`
   - **Change**: Course deletion blocker updated to check `model.sessionModel.count({ where: { courseId } })` instead of deprecated `session_course_mapping`.

### 🔹 Options & Dropdown URLs
4. `GET {{baseurl}}/options/classSections`
   - **Change**: Updated parameters to support filtering directly by `sessionId`, `batchId`, `courseId`, `year`, and `term`.
   - **Query Params**: `?courseId=1&sessionId=2&batchId=3&year=1&term=1`

### 🔹 Assessment Plan URLs
5. `GET {{baseurl}}/assessmentPlan/overview`
   - **Change**: Updated internal queries to join `sessionModel` directly under `courseModel` instead of `sessionCouseMappingModel`.

### 🔹 Fee & Student Invoice URLs
6. `GET {{baseurl}}/studentFeeInvoice/batches`
   - **Change**: Updated batch billing overview keys (`admissionBatch`, `academicYears`).
7. `GET {{baseurl}}/studentFeeInvoice/all`
   - **Change**: Fetches all student invoices by `feePlanItemId`.
8. `POST {{baseurl}}/studentFeeInvoice`
   - **Change**: Cleaned response payload (`{ success: true, message: "Invoice(s) generated successfully" }`).
9. `GET {{baseurl}}/feePlanItem/single`
   - **Change**: Enhanced student list with current term placement & pagination.

---

## 2. Deprecated & Removed API URLs

The following endpoints relied on the legacy `session_course_mapping` table and have been removed from `sessionRoute.js`:

1. `POST {{baseurl}}/session/courseSessionMapping` ❌ *(Removed)*
2. `PATCH {{baseurl}}/session/courseSessionMapping/update` ❌ *(Removed)*
3. `DELETE {{baseurl}}/session/courseSessionMapping` ❌ *(Removed)*

---

## 3. Summary Matrix

| Method | Endpoint URL | Status | Action Required by Frontend |
| :--- | :--- | :--- | :--- |
| `GET` | `/course/my/:courseId/sessions` | ✅ Updated | None (returns session details) |
| `GET` | `/course/:courseId/sessions` | ✅ Updated | None |
| `DELETE`| `/course/:courseId` | ✅ Updated | None |
| `GET` | `/options/classSections` | ✅ Updated | Can pass `batchId` / `sessionId` directly |
| `POST` | `/session/courseSessionMapping` | ❌ Removed | Stop calling this endpoint |
| `PATCH`| `/session/courseSessionMapping/update` | ❌ Removed | Stop calling this endpoint |
| `DELETE`| `/session/courseSessionMapping` | ❌ Removed | Stop calling this endpoint |
