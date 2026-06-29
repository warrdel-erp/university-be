# Affected APIs — Class Section Term Refactor

**Status:** Active after migrations `20260629190000` – `20260629230000`  
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
| `POST /main/createClass` | Removed — use `POST /main/class` only |

**Primary keys for FE dropdowns:** `classSectionTermId` (required for student placement), `classSectionsId`, `year`, `term`

---

## Removed APIs

| Method | Path | Reason |
|--------|------|--------|
| `POST` | `/main/semester` | `semester` table deprecated → `semester_deprecated` |
| `GET` | `/main/semester` | Term list from course metadata |
| `POST` | `/main/createClass` | Duplicate of `/main/class` |

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
| `POST` | `/main/class` | **Breaking** | Body changed — see below |
| `GET` | `/main/class` | Updated | Uses `classSectionTerms` instead of `classGroup` |
| `GET` | `/main/classSpecific` | Updated | Sections expose `year` + nested `terms[]` |
| `GET` | `/main/classRecord` | Updated | Students filtered via `classSectionTermId` join |
| `GET` | `/classSections/` | Updated | Returns `year` + `classSectionTerms[]` per section |

### `POST /main/class` — new body

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

**After**
```json
{
  "courseId": 42,
  "sessionId": 22,
  "acedmicYearId": 76,
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

### `GET /main/classRecord` — query params

| Param | Required | Description |
|-------|----------|-------------|
| `courseId` | Yes | |
| `classSectionsId` | Yes* | Physical section — students matched via term join |
| `classSectionTermId` | No | Preferred for term-scoped record |
| `term` | No | Filter by program term |
| `acedmicYearId` | No | |

---

## 2. Subject & Mapping (`/main`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `POST` | `/main/subject` | Unchanged | `subject.term` = program term |
| `POST` | `/main/classSubjectMapper` | Updated | No `semesterId` — maps by `subjectId` (subject carries `term`) |
| `GET` | `/main/classSubjectMapper` | **Breaking** | Query `semesterId` → **`term`** |

**Before:** `GET /main/classSubjectMapper?semesterId=5`  
**After:** `GET /main/classSubjectMapper?term=2`

---

## 3. Course (`/course`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/course/semesterWithClassSections` | Updated | Groups by program `term` via `class_section_term`; response includes `classSectionTermId` |

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
| `POST` | `/student/classStudentMapping` | **Breaking** | Use `classSectionTermId` instead of `semesterId` |
| `GET` | `/student/classStudentMapping` | **Breaking** | Query by `classSectionTermId` or `term` |
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

### `POST /student/classStudentMapping`

**Before**
```json
{ "studentId": 1, "semesterId": 5, "sessionId": 22, "acedmicYearId": 76 }
```

**After**
```json
{ "studentId": 1, "classSectionTermId": 1001, "sessionId": 22, "acedmicYearId": 76 }
```

### `GET /student/classStudentMapping`

**Before:** `?semesterId=5&acedmicYearId=76`  
**After:** `?classSectionTermId=1001&acedmicYearId=76` or `?term=2&acedmicYearId=76`

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
| `GET` | `/student/promotion/available-class-section` | Updated | Returns options with `classSectionTermId`, `sameSection` flag |
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
| `GET` | `/timeTableCreate/getRoutine` | Updated | Prefer `classSectionTermId` or `classSectionsId` + `term` |
| `POST` | `/timeTableCreate/` | Updated | Routine scoped per term instance |
| `GET` | `/timeTableCreate/getRoutineByTeacher` | Updated | Sections include `term`, `year` from `classSectionTerms` |
| `GET` | `/student/studentTimetable` | Updated | Loads routine from student's `classSectionTermId` (not `student.classSectionsId`) |

**Response fields changed:**
- Removed: `classGroup.term`, `classGroup.semesterId`, `classGroup.className`
- Added: `term`, `year`, `classSectionTermId` (from `classSectionTerms` join)

---

## 7. Attendance (`/attendance`)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `POST` | `/attendance/` | Updated | `classSectionsId` on attendance row resolved from student's term placement |
| `POST` | `/attendance/getStudentAttendance/batch` | Updated | Scope by `classSectionTermId` when provided |
| `GET` | `/attendance/studentAttendance/bulk` | Updated | Same |
| `GET` | `/employee/classDates` | Updated | Section labels use `year` not `classGroup` |

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
| Syllabus unit CRUD | Various | Updated | `syllabus_unit.term` replaces `semester_id` |

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
| `class` | Renamed → `class_deprecated` |
| `semester` | Renamed → `semester_deprecated` |

---

## Recommended FE Flow

1. **Load terms:** `GET /options/courseTerms?courseId=`
2. **Load sections for term:** `GET /options/classSections?courseId=&term=&sessionId=`
3. **Store selection:** save **`classSectionTermId`** as the student placement key
4. **Create sections:** `POST /main/class` with `{ year, term, sectionId }` per row
5. **Enroll student:** pass `classSectionTermId` to create/mapping APIs
6. **Assign fee:** pass `feePlanProfileId` (not `feePlanId`)
7. **Timetable / attendance / exams:** pass `classSectionTermId` or `classSectionsId` + `term`

---

## Smoke Test Order

1. `GET /options/courseTerms?courseId=`
2. `POST /main/class` (new body shape)
3. `GET /classSections/?sessionId=&courseId=`
4. `GET /options/classSections?courseId=&term=1&sessionId=`
5. `GET /course/semesterWithClassSections?courseId=&sessionId=`
6. `POST /student` with `classSectionTermId`
7. `POST /student/classStudentMapping` with `classSectionTermId`
8. Verify DB: student has `class_section_term_id`, no `class_sections_id`
9. `GET /student/promotion/list?programCourseId=&promotionTerm=`
10. `POST /student/promoteStudent` with `classSectionsId` or `classSectionTermId`
11. `GET /timeTableCreate/getRoutine?classSectionsId=&term=`
12. `GET /main/classSubjectMapper?term=`
13. `GET /student/studentTimetable?studentId=`

---

## Not Changed (out of scope)

- Legacy fee invoice tables (`fee_invoice`, etc.) — separate from student `fee_plan_id` removal
- `/feePlanProfile` plan types (`semester`, `trimester` enum labels)
- Master CRUD: `/course`, `/session`, `/section`, `/subject` (except `subject.term` usage)
- `attendance.class_sections_id` — still stored on attendance rows (resolved from student placement)

---

## Pending / Follow-up

| Item | Owner | Notes |
|------|-------|-------|
| Add `class_section_term_id` to `student_class_sections_history` | Backend | History still keyed by section only |
| Update Postman collection | Backend / QA | New shapes for class create, student enroll, promotion |
| Employee dashboard student list per section | Backend | `classSection.hasMany(student)` association removed |
| Drop `class_deprecated`, `semester_deprecated` | Backend | After full verification |

---

## Questions / Contact

For API contract issues during FE integration, verify against:
- `utility/classSectionIncludes.js` — `resolveStudentSection`, `resolveStudentClassSectionsId`, includes
- `utility/courseTerms.js` — term list from course
- `repository/classSectionTermRepository.js` — `classSectionTermId` lookup
- `docs/CLASS_SECTION_TERM_TEAM_TASKS.md` — step-by-step team task list
