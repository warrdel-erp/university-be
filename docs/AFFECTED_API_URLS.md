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
4. `GET {{baseurl}}/course` (List Courses)
   - **Change**: Refactored `getAllCourse` in `mainRepository.js` to join `sessionModel` directly as `sessions` instead of `sessionCouseMappingModel`.

### 🔹 Class Section URLs
5. `GET {{baseurl}}/classSections`
   - **Change**: Refactored course hierarchy queries in `mainRepository.js` to include `sessionModel` directly as `sessions`.

### 🔹 Options & Dropdown URLs
6. `GET {{baseurl}}/options/classSections`
   - **Change**: Updated parameters to support filtering directly by `sessionId`, `batchId`, `courseId`, `year`, and `term`.
   - **Query Params**: `?courseId=1&sessionId=2&batchId=3&year=1&term=1`
7. `GET {{baseurl}}/options/subjects` & `GET {{baseurl}}/options/my/subjects`
   - **Change**: Refactored subject resolution to query subjects via `batchModel` ➔ `curriculumBatchMappingModel` ➔ `curriculumSubjectTermMappingModel` and `curriculumModel`. Removed invalid `academicYearId` and `term` filters on `subjectModel` and resolved subjects using teacher mappings (`teacherSubjectMappingModel`) and scheduled timetable cells (`timeTableCellTeachersModel`).
   - **Query Params**: `?userId=56&courseId=34&sessionId=6&term=8`



### 🔹 Assessment Plan & Exam Result URLs
7. `GET {{baseurl}}/assessmentPlan/overview`
   - **Change**: Updated internal queries to join `sessionModel` directly under `courseModel` instead of `sessionCouseMappingModel`. Removed redundant helper functions (`resolvePositiveInt`, `decimalCeilDivide`, `paginationMeta`).
8. `POST {{baseurl}}/assessmentPlan` / `GET {{baseurl}}/assessmentPlan/:id`
   - **Change**: Refactored `findSessionCourseMapping` in `assessmentPlanRepository.js` to query `sessionModel` directly using `sessionId` and `courseId`.
9. `GET {{baseurl}}/examResult`
   - **Change**: Refactored `findSessionCourseMappingsByIds` in `examResultRepository.js` to query `sessionModel` directly.

### 🔹 Fee & Student Invoice URLs
10. `GET {{baseurl}}/studentFeeInvoice/batches`
   - **Change**: Updated batch billing overview keys (`admissionBatch`, `academicYears`).
11. `GET {{baseurl}}/studentFeeInvoice/all`
   - **Change**: Fetches all student invoices by `feePlanItemId`.
12. `POST {{baseurl}}/studentFeeInvoice`
   - **Change**: Cleaned response payload (`{ success: true, message: "Invoice(s) generated successfully" }`).
13. `GET {{baseurl}}/feePlanItem/single`
   - **Change**: Enhanced student list with current term placement & pagination.

### 🔹 Timetable & Attendance Section Dates URLs
14. `GET {{baseurl}}/timeTableCreate/getRoutineByTeacher`, `GET {{baseurl}}/timeTableCreate/my/getRoutineByTeacher`, `GET {{baseurl}}/lesson/getRoutineByTeacher`, `GET {{baseurl}}/lesson/my/getRoutineByTeacher`
   - **Change**: Fixed `Unknown column 'startingDate' in 'field list'` error by querying only valid attributes (`sessionId`, `sessionName`, `academicYearId`) from `sessionModel` and removing deprecated `startingDate`/`endingDate` keys from the response payload.

15. `GET {{baseurl}}/employee/sectionDates`, `GET {{baseurl}}/employee/my/sectionDates`, `GET {{baseurl}}/attendance/sectionDates`
   - **Change**: Updated `getEmployeeSectionDateWiseRows` in `employeeScheduleRepository.js` to filter date-wise section rows up to today (`date <= todayStr`), returning only past and today's dates while excluding future upcoming dates.
   - **Query Params**: `?classSectionTermId=1&subjectId=50&userId=56`



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
| `GET` | `/course` | ✅ Updated | None (uses direct `sessionModel` join) |
| `GET` | `/classSections` | ✅ Updated | None |
| `GET` | `/options/classSections` | ✅ Updated | Can pass `batchId` / `sessionId` directly |
| `GET` | `/assessmentPlan/overview` | ✅ Updated | None |
| `GET` | `/examResult` | ✅ Updated | None |
| `GET` | `/timeTableCreate/getRoutineByTeacher` | ✅ Updated | None (returns teacher routine with session dates) |
| `POST` | `/session/courseSessionMapping` | ❌ Removed | Stop calling this endpoint |
| `PATCH`| `/session/courseSessionMapping/update` | ❌ Removed | Stop calling this endpoint |
| `DELETE`| `/session/courseSessionMapping` | ❌ Removed | Stop calling this endpoint |
