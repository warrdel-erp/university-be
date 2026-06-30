# Affected APIs — Class Section Term Refactor

**Status:** Active after migrations `20260629190000` – `20260629250000`  
**Date:** June 2026  
**Audience:** Backend + Frontend teams  
**Team task list:** [CLASS_SECTION_TERM_TEAM_TASKS.md](./CLASS_SECTION_TERM_TEAM_TASKS.md)

---

## Summary

Academic placement no longer uses the `class` or `semester` tables. Everything flows through:

```
course → class_sections (year + section + session) → class_section_term (program term)
                                                        ↓
                         students / mapper / timetable / exams / attendance
```

| Old concept | New concept |
|-------------|-------------|
| `class` table + `classGroup.term` | `class_sections.year` + `class_section_term.term` |
| `semesterId` | `classSectionTermId` or program `term` (1…N) |
| `students.class_sections_id` | **Removed** — resolve section via `classSectionTermId` |
| `students.fee_plan_id` | **Removed** — use `feePlanProfileId` only |
| `POST /main/semester` | Removed — terms from `course.totalTerms` + `course.termType` |
| `POST /main/createClass` | Removed — use `POST /main/classSections` only |

**Primary keys for FE dropdowns:** `classSectionTermId` (required for student placement), `classSectionsId`, `year`, `term`

**Tenant context:** Active `instituteId`, `universityId`, and `academicYearId` come from the authenticated user’s defaults (`PUT /user/saveUserDefaults`), not from most request bodies or query params. See [Tenant context & academic year](#tenant-context--academic-year) below.

---

## Route renames (`class` → section) — **removed**

Old paths are **deleted** from the router. Use only the new URLs. Full table: [API_ROUTE_REPLACEMENTS.md](./API_ROUTE_REPLACEMENTS.md).

| Method | Use this URL | Was |
|--------|--------------|-----|
| `POST` | `/main/classSections` | `/main/class` |
| `GET` | `/main/classSections` | `/main/class` |
| `GET` | `/main/classSectionSpecific` | `/main/classSpecific` |
| `POST` | `/main/sectionSubjectMapper` | `/main/classSubjectMapper` |
| `GET` | `/main/sectionSubjectMapper` | `/main/classSubjectMapper` |
| `GET` | `/main/classSectionRecord` | `/main/classRecord` |
| `POST` | `/student/sectionStudentMapping` | `/student/classStudentMapping` |
| `GET` | `/student/sectionStudentMapping` | `/student/classStudentMapping` |
| `GET` | `/student/promotion/available-section` | `/student/promotion/available-class-section` |
| `GET` | `/course/termsWithClassSections` | `/course/semesterWithClassSections` |
| `GET` | `/employee/sectionDates` | `/employee/classDates` |
| `GET` | `/employee/sectionCounts` | `/employee/classCounts` |
| `GET` | `/attendance/sectionDates` | `/attendance/classDates` |
| `GET` | `/attendance/previous-sessions/:employeeId` | `/attendance/previous-classes/:employeeId` |

**Unchanged (not academic class):** `/classRoom`, `/classSections` (options filter), `classRoomSectionId`, timetable `classSectionTermId` query params.

---

## Tenant context & academic year

After `userAuth`, the backend builds request context from the JWT user row (and optional `X-Institute-Id` header):

| Context field | Source |
|---------------|--------|
| `instituteId` | `X-Institute-Id` header **or** `defaultInstituteId` from user defaults |
| `universityId` | User row or resolved from active institute |
| `academicYearId` | `defaultAcademicYearId` from user defaults |
| `userId`, `defaultRole` | User session |

**Set active tenant (FE):** `PUT /user/saveUserDefaults` with `defaultInstituteId`, `defaultAcademicYearId`, `defaultRole`, etc. Context is refreshed on that response.

**DB scoping:** Repositories use `scoped(model).create()` / `findAll()` — tenant columns are injected automatically. Do **not** send `universityId`, `instituteId`, or `academicYearId` on scoped routes when they are only used for tenant filtering.

### `academicYearId` spelling & payloads

| Layer | Name |
|-------|------|
| **API JSON field** | `academicYearId` (correct spelling; replaces old typo `acedmicYearId` in payloads) |
| **HTTP route mount** | `/acedmicYear` (unchanged) |
| **DB table / column** | `acedmic_year`, `acedmic_year_id` (unchanged) |

**Removed from query/body** on scoped routes (context used instead), including but not limited to:

- `GET /main/classSections`, `/main/classSectionSpecific`, `/main/sectionSubjectMapper`, `/main/classSectionRecord`
- `GET /course/`, `/course/withSubjects`, `/course/:courseId/sessions`
- `GET /terms/list/withSubject`
- `POST /session` (create), syllabus unit CRUD, exam structure list/single, timetable CRUD
- `GET /student/emptyEnrollNumber`, `/student/emptyFeeDetails`, `/student/sectionStudentMapping`
- Teacher mapping list/create/update query and body optional tenant fields
- Fee plan profile create/update optional `academicYearId`

**Still required in payload** when the ID identifies a **resource**, not the active tenant:

| Method | Path | Field | Why |
|--------|------|-------|-----|
| `DELETE` | `/acedmicYear` | `academicYearId` (query) | Which academic year row to delete |
| `PATCH` | `/acedmicYear` | `academicYearId` (body, optional) | Which year to update; defaults to active year if omitted |

---

## Removed APIs

| Method | Path | Reason |
|--------|------|--------|
| `POST` | `/main/semester` | `semester` table deprecated → `semester_deprecated` |
| `GET` | `/main/semester` | Term list from course metadata |
| `POST` | `/main/createClass` | Duplicate of `/main/classSections` |

---

## New / Updated Options APIs

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/options/courseTerms?courseId=` | **New.** Returns program terms from course (`term`, `termName`) — replaces semester list |
| `GET` | `/options/classSections?courseId=&term=&sessionId=` | **Updated.** `term` required; returns `classSectionTermId` per section |

**Example — course terms**
```http
GET /options/courseTerms?courseId=42
```
```json
[
  { "term": 1, "termName": "Semester 1", "name": "Semester 1", "courseId": 42 },
  { "term": 2, "termName": "Semester 2", "name": "Semester 2", "courseId": 42 }
]
```

**Example — class sections for a term**
```http
GET /options/classSections?courseId=42&term=1&sessionId=22
```
```json
[
  {
    "classSectionTermId": 1001,
    "classSectionsId": 101,
    "section": "A1",
    "year": 1,
    "term": 1
  }
]
```

---

## 1. Class & Section Master (`/main`, `/classSections`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `POST` | `/main/classSections` | **Breaking** | Body changed — see below |
| `GET` | `/main/classSections` | Updated | Uses `classSectionTerms` instead of `classGroup` |
| `GET` | `/main/classSectionSpecific` | Updated | Sections expose `year` + nested `terms[]` |
| `GET` | `/main/classSectionRecord` | Updated | Students filtered via `classSectionTermId` join |
| `GET` | `/classSections/` | Updated | Returns `year` + `classSectionTerms[]` per section |

### `POST /main/classSections` — new body

**Before**
```json
{
  "courseId": 42,
  "sessionId": 22,
  "acedmicYearId": 76,
  "term": 2,
  "className": "2",
  "sections": [{ "sectionId": 16, "section": "2A" }]
}
```

**After** (academic year from user defaults — do not send in body)
```json
{
  "courseId": 42,
  "sessionId": 22,
  "sections": [
    { "sectionId": 16, "section": "A1", "year": 1, "term": 1 },
    { "sectionId": 16, "section": "A1", "year": 1, "term": 2 },
    { "sectionId": 17, "section": "A2", "year": 1, "term": 1 }
  ]
}
```

- Each item creates/finds one `class_sections` row (by `year` + `sectionId`) and one `class_section_term` row (by `term`).
- Top-level `term`, `className`, `classId` removed from request.
- Response includes `classSectionTermId`, `year`, `term` per section.

### `GET /main/classSectionRecord` — query params

| Param | Required | Description |
|-------|----------|-------------|
| `courseId` | Yes | |
| `classSectionsId` | Yes* | Physical section — students matched via term join |
| `classSectionTermId` | No | Preferred for term-scoped record |
| `term` | No | Filter by program term |

> `academicYearId` is **not** accepted on this route — scoped queries use the active year from user defaults.

---

## 2. Subject & Mapping (`/main`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `POST` | `/main/subject` | Unchanged | `subject.term` = program term |
| `POST` | `/main/sectionSubjectMapper` | Updated | No `semesterId` — maps by `subjectId` (subject carries `term`) |
| `GET` | `/main/sectionSubjectMapper` | **Breaking** | Query `semesterId` → **`term`** |

**Before:** `GET /main/sectionSubjectMapper?semesterId=5`  
**After:** `GET /main/sectionSubjectMapper?term=2`

---

## 3. Course (`/course`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/course/termsWithClassSections` | Updated | Groups by program `term` via `class_section_term`; response includes `classSectionTermId` |

**Query:** `courseId`, `sessionId`

**Response shape (per term group):**
```json
{
  "term": 1,
  "termName": "Semester 1",
  "classSections": [
    {
      "classSectionTermId": 1001,
      "name": "A1",
      "year": 1,
      "classSectionsId": 101
    }
  ]
}
```

---

## 4. Student Enrollment & Mapping (`/student`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `POST` | `/student/studentMapping` | Updated | Prefer `classSectionTermId`; `classSectionsId` + `term` accepted for resolution |
| `POST` | `/student/sectionStudentMapping` | **Breaking** | Use `classSectionTermId` instead of `semesterId` |
| `GET` | `/student/sectionStudentMapping` | **Breaking** | Query by `classSectionTermId` or `term` |
| `POST` | `/student` (create) | **Breaking** | Sets `classSectionTermId` only — **`classSectionsId` not stored on student** |
| `PATCH` | `/student/:id` | **Breaking** | `classSectionTermId` allowed; `classSectionsId`, `semesterId`, `feePlanId` removed |

### Student table — removed columns

| Column | Replacement |
|--------|-------------|
| `class_sections_id` | Join via `class_section_term_id` → `class_section_term.class_sections_id` |
| `fee_plan_id` | Use `fee_plan_profile_id` (`feePlanProfileId`) |
| `semester_id` | Use `class_section_term_id` |

### `POST /student` (create)

**Preferred body (placement)**
```json
{
  "classSectionTermId": 1001,
  "courseId": 42,
  "sessionId": 22
}
```

**Alternative (backend resolves term row)**
```json
{
  "classSectionsId": 101,
  "term": 1,
  "courseId": 42,
  "sessionId": 22
}
```

**Fee:** send `feePlanProfileId` — not `feePlanId`.

### `POST /student/sectionStudentMapping`

**Before**
```json
{ "studentId": 1, "semesterId": 5, "sessionId": 22, "acedmicYearId": 76 }
```

**After**
```json
{ "studentId": 1, "classSectionTermId": 1001, "sessionId": 22 }
```

> `academicYearId` is injected from request context — do not send in body.

### `GET /student/sectionStudentMapping`

**Before:** `?semesterId=5&academicYearId=76`  
**After:** `?classSectionTermId=1001` or `?term=2` (no `academicYearId` query param)

> Legacy alias: `semesterId` query param may still be accepted as alias for `classSectionTermId` during transition.

### Student response — section data shape

Section info is loaded via `studentClassSectionTerm` → `classSection`:

```json
{
  "studentId": 1,
  "classSectionTermId": 1001,
  "studentClassSectionTerm": {
    "classSectionTermId": 1001,
    "term": 1,
    "classSectionsId": 101,
    "classSection": {
      "classSectionsId": 101,
      "section": "A1",
      "year": 1,
      "sessionId": 22
    }
  }
}
```

Some APIs flatten this to `term`, `year`, `sectionName` in the response — check each endpoint.

---

## 5. Promotion (`/student/promotion`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/student/promotion/list` | Updated | `promotionTerm` = target program term; students resolved via `classSectionTermId` |
| `GET` | `/student/promotion/available-section` | Updated | Returns options with `classSectionTermId`, `sameSection` flag |
| `POST` | `/student/promoteStudent` | Updated | Accepts `classSectionsId` (target section) or `classSectionTermId`; updates `classSectionTermId` on student |
| `GET` | `/student/promotion/history` | Updated | History chain shows `term`, `year`, `classSectionTermId` |
| `GET` | `/student/classSectionStudents` | Updated | Prefer `classSectionTermId` query |

### `POST /student/promoteStudent`

**Before**
```json
{ "studentId": 1, "classSectionsId": 882 }
```

**After (preferred)**
```json
{ "studentId": 1, "classSectionTermId": 1002 }
```

**After (still supported — backend resolves term)**
```json
{ "studentId": 1, "classSectionsId": 882 }
```

Promotion advances to the next **program term** — may stay on the same physical section (e.g. term 1 → term 2, same section A1). Only `classSectionTermId` is updated on the student row.

---

## 6. Timetable (`/timeTableCreate`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `POST` | `/timeTableCreate/` | **Breaking** | Prefer `classSectionTermId`; or `classSectionsId` + `term` — both stored on routine |
| `PATCH` | `/timeTableCreate/create` | Updated | Same term resolution + overlap per `classSectionTermId` |
| `GET` | `/timeTableCreate/getRoutine` | **Breaking** | Query `classSectionTermId` (preferred) or `classSectionsId` (+ optional `term`) |
| `GET` | `/timeTableCreate/create` | Updated | Filter by `classSectionTermId` or `classSectionsId` + `term` |
| `GET` | `/timeTableCreate/getRoutineByTeacher` | Updated | Sections include `term`, `year` from `classSectionTerms` |
| `POST` | `/timeTableCreate/mapping` | Updated | Optional `classSectionTermIds[]`, `combinedGroupId` for multi-section combined slots |
| `GET` | `/student/studentTimetable` | Updated | Loads routine by student's `classSectionTermId` |

### `POST /timeTableCreate/` — placement

**Preferred**
```json
{
  "classSectionTermId": 1001,
  "timeTableNameId": 5,
  "courseId": 42,
  "startingDate": "2026-01-01",
  "endingDate": "2026-06-30"
}
```

**Alternative**
```json
{
  "classSectionsId": 101,
  "term": 1,
  "timeTableNameId": 5,
  "startingDate": "2026-01-01",
  "endingDate": "2026-06-30"
}
```

Overlap check is scoped to **`classSectionTermId`** when present (not whole section).

### `GET /timeTableCreate/getRoutine`

**Before:** `?classSectionsId=101`  
**After:** `?classSectionTermId=1001` or `?classSectionsId=101&term=1`

---

## 7. Attendance (`/attendance`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `POST` | `/attendance/` | Updated | `classSectionsId` on attendance row resolved from student's term placement |
| `POST` | `/attendance/getStudentAttendance/batch` | Updated | Scope by `classSectionTermId` when provided |
| `GET` | `/attendance/studentAttendance/bulk` | Updated | Same |
| `GET` | `/employee/sectionDates` | Updated | Section labels use `year` not `classGroup` |
| `GET` | `/attendance/sectionDates` | Updated | Same as employee sectionDates |

---

## 8. Teacher Mapping (`/teacher`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/teacher/teacherSection` | Updated | Mappings show `term`, `year`, `classSectionTermId` |
| `POST` | `/teacher/teacherSection` | Updated | Prefer `classSectionTermIds[]` per term |
| `GET` | `/teacher/teacherSubject` | Updated | Term filter via program `term` |

---

## 9. Exam & Assessment

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/examScheduleMapping/student` | Updated | Uses student's `classSectionTermId` / program `term` |
| Exam schedule create/update | Various | Updated | `term` column replaces `semester_id` on `exam_schedule` |
| Internal assessment APIs | `/internalAssessment` | Updated | Filter/store by program `term` |
| `GET` | `/syllabus/semesterSubject` | Updated | Query `term` preferred over `semesterId` |
| Hall ticket generation | Various | Updated | Eligible students matched via `classSectionTermId` join |

**Exam schedule filter:** use program `term` (integer 1…N), not `semesterId`.

---

## 10. Syllabus (`/syllabus`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/syllabus/semesterSubject` | Updated | `term` query param; syllabus units store `term` |
| `POST` | `/syllabus/` | Updated | `academicYearId` / `instituteId` from context — send `courseId`, `sessionId`, `subjects` only |
| Syllabus unit CRUD | Various | Updated | `syllabus_unit.term` replaces `semester_id`; no `academicYearId` in unit create/update body |

---

## Response Field Mapping (FE migration)

| Old field | New field |
|-----------|-----------|
| `classGroup.term` | `classSectionTerms[].term` or top-level `term` |
| `classGroup.semesterId` | **Removed** — use `term` |
| `classGroup.className` | `year` → display as `"Year {year}"` |
| `classId` | **Removed** |
| `semesterId` (student) | `classSectionTermId` |
| `classSectionsId` (student column) | **Removed** — use `studentClassSectionTerm.classSectionsId` or nested `classSection.classSectionsId` |
| `feePlanId` (student) | **Removed** — use `feePlanProfileId` |
| `semesterId` (mapper) | `classSectionTermId` |
| `studentSemester.name` | `termName` from course (`"Semester 1"`) |
| `studentSections` (direct FK include) | `studentClassSectionTerm.classSection` |
| `semesterName` | `termName` |
| `acedmicYearId` (payload typo) | `academicYearId` — or omit and use user defaults |

---

## Database Tables (reference)

| Table | Status |
|-------|--------|
| `class_sections` | Active — has `year` column; no `class_id`, no `semester_id` |
| `class_section_term` | Active — `class_section_term_id`, `class_sections_id`, `term`, `university_id`, `institute_id` |
| `students` | `class_section_term_id` active; **`class_sections_id` removed**; **`fee_plan_id` removed**; `semester_id` removed |
| `class_student_mapper` | `class_section_term_id` active; `semester_id` removed |
| `class_subject_mapper` | `semester_id` removed |
| `exam_schedule`, `internal_assessment`, `syllabus_unit` | `term` active; `semester_id` removed |
| `student_class_sections_history` | Still uses `class_sections_id` (follow-up: add `class_section_term_id`) |
| `class_schedule_item` | `combined_group_id` nullable — links duplicate slots across sections in combined timetable |
| `class` | Renamed → `class_deprecated` |
| `semester` | Renamed → `semester_deprecated` |

---

## Recommended FE Flow

1. **Set tenant defaults:** `PUT /user/saveUserDefaults` — `defaultInstituteId`, `defaultAcademicYearId`, `defaultRole`
2. **Load terms:** `GET /options/courseTerms?courseId=`
3. **Load sections for term:** `GET /options/classSections?courseId=&term=&sessionId=`
4. **Store selection:** save **`classSectionTermId`** as the student placement key
5. **Create sections:** `POST /main/classSections` with `{ year, term, sectionId }` per row (no `academicYearId` in body)
6. **Enroll student:** pass `classSectionTermId` to create/mapping APIs
7. **Assign fee:** pass `feePlanProfileId` (not `feePlanId`)
8. **Timetable / attendance / exams:** pass `classSectionTermId` or `classSectionsId` + `term` — do not repeat tenant IDs in query

---

## Smoke Test Order

1. `GET /options/courseTerms?courseId=`
2. `POST /main/classSections` (new body shape)
3. `GET /classSections/?sessionId=&courseId=`
4. `GET /options/classSections?courseId=&term=1&sessionId=`
5. `GET /course/termsWithClassSections?courseId=&sessionId=`
6. `POST /student` with `classSectionTermId`
7. `POST /student/sectionStudentMapping` with `classSectionTermId`
8. Verify DB: student has `class_section_term_id`, no `class_sections_id`
9. `GET /student/promotion/list?programCourseId=&promotionTerm=`
10. `POST /student/promoteStudent` with `classSectionsId` or `classSectionTermId`
11. `GET /timeTableCreate/getRoutine?classSectionsId=&term=`
12. `GET /main/sectionSubjectMapper?term=`
13. `GET /student/studentTimetable?studentId=`

---

## Not Changed (out of scope)

- Legacy fee invoice tables (`fee_invoice`, etc.) — separate from student `fee_plan_id` removal
- `/feePlanProfile` plan types (`semester`, `trimester` enum labels)
- Master CRUD: `/course`, `/session`, `/section`, `/subject` (except `subject.term` usage)

### Tables that still use `class_sections_id` (not `class_section_term_id`)

See [CLASS_SECTION_TERM_FK_AUDIT.md](./CLASS_SECTION_TERM_FK_AUDIT.md) for full analysis.

| Table | Why `class_sections_id` remains | `class_section_term_id` planned? |
|-------|--------------------------------|----------------------------------|
| `attendance` | Denormalized section at mark time | Phase 2 |
| `library_book` | Optional catalog metadata | No |
| `student_class_sections_history` | Physical section in history | **Done** |
| `teacher_section_mapping` | Teacher ↔ section for session | No (term via subjects) |
| `time_table_routine` | Routine scoped to section | **Done** |

These are **not bugs** — they correctly FK to `class_sections`. Term-specific behavior must join through `class_section_term` or add the column per audit.

---

## Pending / Follow-up

| Item | Owner | Notes |
|------|-------|-------|
| Add `class_section_term_id` to `attendance` | Backend | Phase 2 — term-scoped reports |
| Update Postman collection | Backend / QA | New shapes + tenant context (no `academicYearId` on scoped routes) |
| Employee dashboard student list per section | Backend | `classSection.hasMany(student)` association removed |
| Drop `class_deprecated`, `semester_deprecated` | Backend | After full verification |

**FK audit (all tables):** [CLASS_SECTION_TERM_FK_AUDIT.md](./CLASS_SECTION_TERM_FK_AUDIT.md)

## Questions / Contact

For API contract issues during FE integration, verify against:
- `utility/requestContext.js` — `getTenantStore()`, `getAcademicYearId()`, `buildRequestContextStore()`
- `utility/scoped.js` — `scoped()`, `buildScope()` for tenant-aware DB access
- `utility/classSectionIncludes.js` — `resolveStudentSection`, `resolveStudentClassSectionsId`, includes
- `utility/courseTerms.js` — term list from course
- `repository/classSectionTermRepository.js` — `classSectionTermId` lookup
- `docs/CLASS_SECTION_TERM_TEAM_TASKS.md` — step-by-step team task list
