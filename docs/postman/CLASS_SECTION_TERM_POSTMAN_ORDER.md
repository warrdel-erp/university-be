# Class Section Term Refactor — Postman test order

Use this as a **folder order** in Postman (or Insomnia). Run top to bottom within each section; do not skip prerequisites.

**Collection file:** [univ-v2.postman_collection.json](./univ-v2.postman_collection.json) — **Students** and **employee** folders are at the bottom (after **course**). Placement key: **classSectionTermId**.

**Base URL:** `http://localhost:8080` (collection variable `{{baseurl}}`)  
**Auth:** Login first → save JWT → `Authorization: Bearer {{token}}`  
**Tenant:** Set defaults once in **Section 0** — most routes no longer need `instituteId` / `academicYearId` in query/body.

**Related:** [AFFECTED_APIS_CLASS_SECTION_TERM.md](../AFFECTED_APIS_CLASS_SECTION_TERM.md) · [API_ROUTE_REPLACEMENTS.md](../API_ROUTE_REPLACEMENTS.md) · [CLASS_SECTION_TERM_TEAM_TASKS.md](../CLASS_SECTION_TERM_TEAM_TASKS.md)

---

## Server mount order (`server.js`)

Routes are registered in dependency-friendly groups. When debugging 404s, confirm the mount path matches this table (not the import order at the top of `server.js`).

| Order | Mount | Scope notes |
|-------|-------|-------------|
| 1 | `/campus`, `/institute`, `/specialization`, `/acedmicYear` | Tenant setup |
| 2 | `/course`, exam/fee/catalog prefixes | Core masters |
| 3 | `/session`, `/subject`, `/terms`, `/syllabus`, `/classSections` | Academic year scoped |
| 4 | `/options` | Dropdowns (`courseTerms`, `classSections`) |
| 5 | `/student`, `/employee`, `/teacher` | Operations |
| 6 | `/timeTable`, `/timeTableCreate` | Timetable |
| 7 | `/section`, `/main`, `/user` | Section master + legacy main + auth |

**Important:** `GET /course/termsWithClassSections` is registered **before** `GET /course/:courseId/terms` so the static segment is not captured as `courseId`.

---

## Section 0 — Auth & tenant context (run once per session)

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 0.1 | `POST` | `/user/login` | Get JWT |
| 0.2 | `PUT` | `/user/saveUserDefaults` | Set active institute + academic year |

**0.2 body example**
```json
{
  "defaultInstituteId": 1,
  "defaultAcademicYearId": 76,
  "defaultRole": "admin"
}
```

**Verify:** Later scoped calls work **without** `academicYearId` / `instituteId` in query.

---

## Section 1 — Master foundation (course, session, section)

*Needed before class sections, students, timetable.*

| # | Method | Path | Notes |
|---|--------|------|-------|
| 1.1 | `GET` | `/course` | List programs — tenant scoped; `instituteId` query optional |
| 1.2 | `GET` | `/course/{{courseId}}/sessions` | Sessions for program |
| 1.3 | `GET` | `/course/withSubjects?instituteId={{instituteId}}` | Programs + subjects (`instituteId` still required here) |
| 1.4 | `GET` | `/session/` | All sessions for active institute (no `academicYearId` query) |
| 1.5 | `POST` | `/session/` | Create session if missing — **no** `academicYearId` in body |
| 1.6 | `POST` | `/session/courseSessionMapping` | Map session ↔ course |
| 1.7 | `GET` | `/section/` | Global sections (A1, A2, …) |
| 1.8 | `POST` | `/section/` | Create section if missing |

**Save variables:** `courseId`, `sessionId`, `sectionId`

**Do NOT call (removed):**
- `POST /main/semester`
- `GET /main/semester`
- `POST /main/createClass`

---

## Section 2 — Options APIs (dropdown smoke — critical)

*Run after Section 1. This is the new FE dropdown flow.*

| # | Method | Path | Query | Save |
|---|--------|------|-------|------|
| 2.1 | `GET` | `/options/courseTerms` | `courseId={{courseId}}` | `term`, `termName` |
| 2.2 | `GET` | `/options/classSections` | `courseId=&term=1&sessionId=` | `classSectionTermId`, `classSectionsId`, `year` |

**2.1 expected:** `[{ "term": 1, "termName": "Semester 1", "courseId": 42 }, …]`  
**2.2 expected:** `[{ "classSectionTermId": 1001, "classSectionsId": 101, "section": "A1", "year": 1, "term": 1 }]`

---

## Section 3 — Class & section master (`/main`)

*Creates physical section + program term rows.*

| # | Method | Path | When |
|---|--------|------|------|
| 3.1 | `POST` | `/main/classSections` | **Create** sections (new body) |
| 3.2 | `GET` | `/main/classSections` | List all |
| 3.3 | `GET` | `/main/classSectionSpecific` | One course/session detail |
| 3.4 | `GET` | `/course/termsWithClassSections` | `courseId=&sessionId=` — **was** `semesterWithClassSections` |
| 3.5 | `GET` | `/classSections/` | `sessionId=&courseId=` |
| 3.6 | `GET` | `/main/classSectionRecord` | `courseId=&classSectionsId=` or `classSectionTermId=` |

**3.1 body (new shape)**
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

**Verify after 3.1:** Response has `classSectionTermId`, `year`, `term` per row.  
**Save:** `classSectionTermId`, `classSectionsId`

---

## Section 4 — Subject & mapping

*After class sections exist.*

| # | Method | Path | Notes |
|---|--------|------|-------|
| 4.1 | `POST` | `/main/subject` | `subject.term` = program term (1…N) |
| 4.2 | `POST` | `/main/sectionSubjectMapper` | **Was** `classSubjectMapper` — no `semesterId` |
| 4.3 | `GET` | `/main/sectionSubjectMapper` | `?term=1` — **not** `semesterId` |
| 4.4 | `GET` | `/terms/list/withSubject` | `instituteId=` only (academic year from context) |

---

## Section 5 — Student enrollment & mapping

*Requires `classSectionTermId` from Section 2 or 3.*

| # | Method | Path | Notes |
|---|--------|------|-------|
| 5.1 | `POST` | `/student` | Create with `classSectionTermId` |
| 5.2 | `GET` | `/student/sectionStudentMapping` | **Was** `classStudentMapping` |
| 5.3 | `POST` | `/student/sectionStudentMapping` | Map student to term placement |
| 5.4 | `POST` | `/student/studentMapping` | Alt mapping — `classSectionTermId` preferred |
| 5.5 | `PATCH` | `/student/{{studentId}}` | Update placement |
| 5.6 | `GET` | `/student/classSectionStudents` | `classSectionTermId=` preferred |

**5.1 preferred body**
```json
{
  "classSectionTermId": 1001,
  "courseId": 42,
  "sessionId": 22,
  "feePlanProfileId": 10
}
```

**5.3 body**
```json
{
  "studentId": 1,
  "classSectionTermId": 1001
}
```

**5.2 query:** `?classSectionTermId=1001` or `?term=2` (no `academicYearId`)

**DB verify:** `students.class_section_term_id` set; **no** `class_sections_id`, `fee_plan_id`, `semester_id`

---

## Section 6 — Promotion

*After at least one enrolled student.*

| # | Method | Path | Notes |
|---|--------|------|-------|
| 6.1 | `GET` | `/student/promotion/list` | `programCourseId=&promotionTerm=` |
| 6.2 | `GET` | `/student/promotion/available-section` | **Was** `available-class-section` |
| 6.3 | `POST` | `/student/promoteStudent` | Prefer `classSectionTermId` |
| 6.4 | `GET` | `/student/promotion/history` | Check `term`, `year`, `classSectionTermId` |

**6.3 preferred body**
```json
{ "studentId": 1, "classSectionTermId": 1002 }
```

---

## Section 7 — Timetable

*After sections + subjects + optional teacher.*

| # | Method | Path | Notes |
|---|--------|------|-------|
| 7.1 | `POST` | `/timeTableCreate/` | Create routine |
| 7.2 | `GET` | `/timeTableCreate/getRoutine` | `classSectionTermId=` or `classSectionsId=&term=` |
| 7.3 | `GET` | `/timeTableCreate/create` | Filter by term |
| 7.4 | `POST` | `/timeTableCreate/mapping` | Optional `classSectionTermIds[]`, `combinedGroupId` |
| 7.5 | `GET` | `/timeTableCreate/getRoutineByTeacher` | Teacher view |
| 7.6 | `GET` | `/student/studentTimetable` | `studentId=` |

**7.1 preferred body**
```json
{
  "classSectionTermId": 1001,
  "timeTableNameId": 5,
  "courseId": 42,
  "startingDate": "2026-01-01",
  "endingDate": "2026-06-30"
}
```

---

## Section 8 — Teacher mapping

| # | Method | Path | Notes |
|---|--------|------|-------|
| 8.1 | `GET` | `/teacher/teacherSection` | Shows `term`, `year`, `classSectionTermId` |
| 8.2 | `POST` | `/teacher/teacherSection` | Section IDs; term via scoped context |
| 8.3 | `GET` | `/teacher/teacherSubject` | Filter by program `term` |

---

## Section 9 — Attendance

*After timetable exists (for period-based attendance).*

| # | Method | Path | Notes |
|---|--------|------|-------|
| 9.1 | `GET` | `/employee/sectionDates` | **Was** `classDates` |
| 9.2 | `GET` | `/attendance/sectionDates` | **Was** `classDates` |
| 9.3 | `GET` | `/employee/sectionCounts` | **Was** `classCounts` |
| 9.4 | `GET` | `/attendance/previous-sessions/{{employeeId}}` | **Was** `previous-classes` |
| 9.5 | `GET` | `/student/classSectionStudents` | Load students for marking |
| 9.6 | `POST` | `/attendance/` | Mark attendance (create) |
| 9.7 | `PATCH` | `/attendance/` | Update existing marks |
| 9.8 | `POST` | `/attendance/getStudentAttendance/batch` | Batch report — scope by `classSectionTermId` |
| 9.9 | `GET` | `/attendance/studentAttendance/bulk` | Bulk export |

---

## Section 10 — Syllabus & CO/PO

| # | Method | Path | Notes |
|---|--------|------|-------|
| 10.1 | `GET` | `/syllabus/semesterSubject` | Query `term=` not `semesterId` |
| 10.2 | `POST` | `/syllabus/` | No `academicYearId` / `instituteId` in body |
| 10.3 | `GET` | `/co` | Scoped — no `academicYearId` query |
| 10.4 | `POST` | `/co` | Create CO |
| 10.5 | `GET` | `/co/weightage` | |
| 10.6 | `POST` | `/co/weightage` | |

---

## Section 11 — Exam & assessment (last — depends on terms, students, timetable)

| # | Method | Path | Notes |
|---|--------|------|-------|
| 11.1 | `GET` | `/course/{{courseId}}/terms` | Program terms |
| 11.2 | `GET` | `/examStructure/examType/single` | `courseId=&sessionId=` |
| 11.3 | `GET` | `/terms/withExamTypesPerCourse` | Exam type ↔ term mapping |
| 11.4 | `GET` | `/examScheduleMapping/student` | Uses student's `classSectionTermId` |
| 11.5 | `GET` | `/internalAssessment` | Filter by `term` |
| 11.6 | `POST` | `/examAttendance` | Exam day attendance |

---

## Recommended Postman folder structure

```
📁 CST — 00 - Auth & Tenant
📁 CST — 01 - Master (Course / Session / Section)
📁 CST — 02 - Options
📁 CST — 03 - Class Section Master
📁 CST — 04 - Subject Mapping
📁 CST — 05 - Student
📁 CST — 06 - Promotion
📁 CST — 07 - Timetable
📁 CST — 08 - Teacher Mapping
📁 CST — 09 - Attendance
📁 CST — 10 - Syllabus & CO
📁 CST — 11 - Exam
```

---

## Minimal smoke path (13 calls)

1. `PUT /user/saveUserDefaults`
2. `GET /options/courseTerms?courseId=`
3. `POST /main/classSections` (new body)
4. `GET /classSections/?sessionId=&courseId=`
5. `GET /options/classSections?courseId=&term=1&sessionId=`
6. `GET /course/termsWithClassSections?courseId=&sessionId=`
7. `POST /student` with `classSectionTermId`
8. `POST /student/sectionStudentMapping` with `classSectionTermId`
9. **DB check:** student has `class_section_term_id`, no `class_sections_id`
10. `GET /student/promotion/list?programCourseId=&promotionTerm=`
11. `POST /student/promoteStudent`
12. `GET /timeTableCreate/getRoutine?classSectionTermId=` or `classSectionsId=&term=`
13. `GET /main/sectionSubjectMapper?term=`

---

## Route rename cheat sheet (old → new)

| Old | New |
|-----|-----|
| `GET /course/semesterWithClassSections` | `GET /course/termsWithClassSections` |
| `POST/GET /main/class` | `POST/GET /main/classSections` |
| `GET /main/classSpecific` | `GET /main/classSectionSpecific` |
| `POST/GET /main/classSubjectMapper` | `POST/GET /main/sectionSubjectMapper` |
| `GET /main/classRecord` | `GET /main/classSectionRecord` |
| `POST/GET /student/classStudentMapping` | `POST/GET /student/sectionStudentMapping` |
| `GET /student/promotion/available-class-section` | `GET /student/promotion/available-section` |
| `GET /employee/classDates` | `GET /employee/sectionDates` |
| `GET /attendance/classDates` | `GET /attendance/sectionDates` |
| `GET /attendance/previous-classes/:id` | `GET /attendance/previous-sessions/:id` |

---

## FE pages to hit while testing (localhost:5173)

| API area | Easiest FE route |
|----------|------------------|
| Options / class sections | `/student-admission` (select course → term → section) |
| `termsWithClassSections` | `/class-creation/{courseId}/{sessionId}` |
| `courseTerms` | `/student-admission`, `/import-student` |
| `sectionStudentMapping` | Student promotion / mapping screens |
| Attendance | `/my-classes` → `/subject-attendance/{timeTableMappingId}/{date}` |
| CO APIs | `/create-course-outcome/{courseId}/{sessionId}` |

---

## Common Postman mistakes

1. Sending `academicYearId` on scoped routes — use `PUT /user/saveUserDefaults` instead.
2. Using old typo `acedmicYearId` in new payloads — field is `academicYearId` when explicitly required (e.g. DELETE `/acedmicYear`).
3. Using `semesterId` — use `term` (integer) or `classSectionTermId`.
4. Storing `classSectionsId` on student — use `classSectionTermId` only.
5. Calling removed routes (`/main/semester`, `/main/createClass`, `/main/class`).
6. Testing attendance before timetable + enrolled students exist.
