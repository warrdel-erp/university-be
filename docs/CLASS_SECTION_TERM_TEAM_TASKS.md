# Class Section Term Refactor — Team Task List

**Date:** June 2026  
**Audience:** Backend, Frontend, QA  
**Related docs:** [AFFECTED_APIS_CLASS_SECTION_TERM.md](./AFFECTED_APIS_CLASS_SECTION_TERM.md) · [API_ROUTE_REPLACEMENTS.md](./API_ROUTE_REPLACEMENTS.md)

---

## Overview

Academic placement now uses **`class_section_term`** instead of `class` + `semester`. Students link to a section **only through `classSectionTermId`** — `students.class_sections_id` and `students.fee_plan_id` have been removed.

**Tenant context:** Set active institute and academic year via `PUT /user/saveUserDefaults`. Do not send `academicYearId` on most scoped APIs — see [AFFECTED_APIS — Tenant context](./AFFECTED_APIS_CLASS_SECTION_TERM.md#tenant-context--academic-year).

```
course → class_sections (year + section + session) → class_section_term (term)
                                                        ↓
              students / class_student_mapper / timetable / exams / attendance
```

---

## Backend — Completed

| # | Task | Status |
|---|------|--------|
| 1 | Create `class_section_term` table + add `year` on `class_sections` | Done |
| 2 | Add `university_id`, `institute_id` on `class_section_term` | Done |
| 3 | Backfill year/terms; drop `class_sections.class_id`; rename `class` → `class_deprecated` | Done |
| 4 | Add `class_section_term_id` on `students` and `class_student_mapper`; drop `semester_id` | Done |
| 5 | Add `term` on `exam_schedule`, `internal_assessment`, `syllabus_unit`; rename `semester` → `semester_deprecated` | Done |
| 6 | Remove `classModel`; update `POST /main/class` to create sections + term rows in one call | Done |
| 7 | Remove `POST /main/createClass`, `POST /main/semester`, `GET /main/semester` | Done |
| 8 | Add `GET /options/courseTerms` for term dropdown from course metadata | Done |
| 9 | Replace all `classGroup` / `classModel` reads with `classSectionTerms` includes | Done |
| 10 | Update student enrollment, promotion, timetable, attendance, exam, syllabus services for term/year | Done |
| 11 | Drop `students.class_sections_id` and `students.fee_plan_id` (migration `20260629230000`) | Done |
| 12 | Add shared helpers in `utility/classSectionIncludes.js` (`resolveStudentSection`, `studentClassSectionTermWithSectionInclude`) | Done |
| 13 | Write affected-API doc for team | Done |
| 14 | Rename `/class*` API paths to section-based routes; old paths removed | Done |
| 15 | Fix API field spelling `acedmicYearId` → `academicYearId`; remove redundant `academicYearId` from scoped route payloads | Done |
| 16 | Tenant reads via `getTenantStore()` / `getAcademicYearId()`; DB writes via `scoped()` (no manual tenant injection in controllers) | Done |
| 17 | Combined multi-section timetable (`combined_group_id` on `class_schedule_item`) | Done |

---

## Backend — Remaining (optional / follow-up)

| # | Task | Priority | Notes |
|---|------|----------|-------|
| 1 | Add `class_section_term_id` to `student_class_sections_history` | **Done** | Written on admission/promotion |
| 2 | Add `class_section_term_id` to `time_table_routine` | **Done** | Create/get/overlap APIs updated |
| 3 | Add `class_section_term_id` to `attendance` | Medium | Phase 2 — keep `class_sections_id`, add term for reports |
| 4 | Update Postman collection for new request/response shapes | High | Include tenant defaults flow; drop `academicYearId` from scoped-route examples |
| 5 | Drop `class_deprecated` and `semester_deprecated` tables when no code references them | Low | After full verification |
| 6 | Clean legacy fee paths that still reference old semester shapes | Medium | Fee v2 uses `feePlanProfileId` on student |
| 7 | Fix employee dashboard student count (`userServices`) | Medium | Section → students must join via `class_section_term` |
| 8 | Mark `docs/CLASS_SECTION_SEMESTER_ID_REMOVAL.md` as superseded | Low | Outdated pre-refactor guide |

**No change needed:** `teacher_section_mapping`, `library_book` — keep `class_sections_id` only ([FK audit](./CLASS_SECTION_TERM_FK_AUDIT.md)).

---

## Frontend — Task List (one by one)

Complete these in order where possible.

### Phase 0 — Tenant context (do first)

| # | Task | Details |
|---|------|---------|
| 0a | **Save user defaults on login / institute switch** | `PUT /user/saveUserDefaults` with `defaultInstituteId`, `defaultAcademicYearId`, `defaultRole` |
| 0b | **Stop sending tenant IDs on scoped APIs** | Remove `academicYearId`, `instituteId`, `universityId` from query/body when only used for filtering — backend uses request context |
| 0c | **Rename payload field** | Replace `acedmicYearId` with `academicYearId` in any remaining client code; prefer omitting it and using defaults |
| 0d | **Academic year CRUD** | Route stays `/acedmicYear`; `DELETE` still needs `academicYearId` query (which row to delete) |

### Phase 1 — Master data & dropdowns

| # | Task | Details |
|---|------|---------|
| 1 | **Replace semester dropdown** | Use `GET /options/courseTerms?courseId=` instead of `GET /main/semester` |
| 2 | **Update class-section dropdown** | Use `GET /options/classSections?courseId=&term=&sessionId=`; store **`classSectionTermId`** from response |
| 3 | **Update create-section form** | `POST /main/classSections` body: each section row needs `{ sectionId, section, year, term }` — remove top-level `term`, `className`, `classId` |
| 4 | **Update section list/detail screens** | Read `year` and `classSectionTerms[]` instead of `classGroup.term`, `classGroup.className`, `classId` |
| 5 | **Update subject mapper filter** | `GET /main/sectionSubjectMapper?term=` — replace `semesterId` query param |

### Phase 2 — Student enrollment & profile

| # | Task | Details |
|---|------|---------|
| 6 | **Student create / admission** | Send `classSectionTermId` (preferred) or `classSectionsId` + `term` for backend to resolve; do **not** expect `classSectionsId` on student record in DB |
| 7 | **Section–student mapping** | `POST /student/sectionStudentMapping` — use `classSectionTermId` instead of `semesterId` |
| 8 | **Section–student mapping list** | `GET /student/sectionStudentMapping?classSectionTermId=` or `?term=` |
| 9 | **Student profile / detail** | Section info comes from `studentClassSectionTerm` → `classSection` (or mapped fields `term`, `year`, `section` in API response); remove reads of `student.classSectionsId`, `student.feePlanId`, `student.semesterId` |
| 10 | **Student PATCH** | Allowed placement field: `classSectionTermId`; remove `classSectionsId`, `semesterId`, `feePlanId` from update payloads |
| 11 | **Fee assignment** | Use `feePlanProfileId` only — `feePlanId` on student removed |

### Phase 3 — Promotion

| # | Task | Details |
|---|------|---------|
| 12 | **Promotion list** | Filter by program `term` / `promotionTerm`; display `classSectionTermId`, `year`, `term` |
| 13 | **Available sections for promotion** | Use response fields `classSectionTermId`, `sameSection`, `year`, `term` |
| 14 | **Promote student** | `POST /student/promoteStudent` — send `classSectionsId` (target section) **or** `classSectionTermId`; backend resolves next term |
| 15 | **Promotion history** | Show `term`, `year`, `classSectionTermId` per history entry |

### Phase 4 — Timetable, attendance, exams

| # | Task | Details |
|---|------|---------|
| 16 | **Timetable create/view** | Pass `classSectionTermId` or `classSectionsId` + `term`; stop using `classGroup` fields in UI labels |
| 16b | **Combined section timetable** | `POST /timeTableCreate/mapping` — `classSectionTermIds[]`, optional `combinedGroupId`; delete group with `?deleteCombinedGroup=true` |
| 17 | **Student timetable** | Resolved from student's `classSectionTermId` — no direct `student.classSectionsId` |
| 18 | **Attendance (single + batch)** | Scope by `classSectionTermId` when available |
| 19 | **Teacher section mapping** | Display `term`, `year`, `classSectionTermId` on section cards |
| 20 | **Exam schedule filters** | Use program `term` (integer 1…N), not `semesterId` |
| 21 | **Syllabus / internal assessment** | Filter by `term` query param |
| 22 | **Hall ticket / exam eligibility** | Students matched via `classSectionTermId` join |

### Phase 5 — Response field cleanup (global)

| # | Task | Old → New |
|---|------|-----------|
| 23 | Term display | `classGroup.term` → `term` or `classSectionTerms[].term` |
| 24 | Year display | `classGroup.className` → `year` (show as `"Year {year}"`) |
| 25 | Student placement key | `semesterId` → `classSectionTermId` |
| 26 | Section key for APIs | Prefer `classSectionTermId`; `classSectionsId` only when picking physical section |
| 27 | Remove dead fields | `classId`, `classGroup.semesterId`, `student.classSectionsId`, `student.feePlanId` |
| 28 | **Migrate API paths** | See [API_ROUTE_REPLACEMENTS.md](./API_ROUTE_REPLACEMENTS.md) — old URLs return 404 |
| 29 | **Tenant payload cleanup** | Remove `academicYearId` / `instituteId` / `universityId` from API client wrappers on scoped routes; use `saveUserDefaults` |

---

## QA — Test Checklist

Run in this order after FE updates:

| # | Test | Endpoint / action |
|---|------|-------------------|
| 1 | Load course terms | `GET /options/courseTerms?courseId=` |
| 1b | User defaults set | `PUT /user/saveUserDefaults` — active institute + academic year |
| 2 | Create sections | `POST /main/classSections` (new body, no `academicYearId`) |
| 3 | List sections | `GET /classSections/?sessionId=&courseId=` |
| 4 | Section dropdown | `GET /options/classSections?courseId=&term=1&sessionId=` |
| 5 | Grouped sections | `GET /course/termsWithClassSections?courseId=&sessionId=` |
| 6 | Enroll student | `POST /student` + `POST /student/sectionStudentMapping` with `classSectionTermId` |
| 7 | Verify student has no `class_sections_id` in DB | SQL: `SELECT class_section_term_id FROM students WHERE student_id = ?` |
| 8 | Promotion list | `GET /student/promotion/list?programCourseId=&promotionTerm=` |
| 9 | Promote student | `POST /student/promoteStudent` |
| 10 | Timetable | `GET /timeTableCreate/getRoutine?classSectionsId=&term=` |
| 11 | Subject mapper | `GET /main/sectionSubjectMapper?term=` |
| 12 | Attendance batch | `POST /attendance/getStudentAttendance/batch` |
| 13 | Exam schedule by term | Create/list with `term` not `semesterId` |
| 14 | Student timetable | `GET /student/studentTimetable?studentId=` |
| 15 | Scoped routes without `academicYearId` | e.g. `GET /main/sectionSubjectMapper?term=1` succeeds with only user defaults set |

---

## Migrations (run order)

```bash
npm run migrate
```

| Migration | Purpose |
|-----------|---------|
| `20260629190000-create-class-section-term-and-add-year.cjs` | `class_section_term` + `class_sections.year` |
| `20260629200000-add-university-institute-to-class-section-term.cjs` | Tenant columns on term table |
| `20260629210000-deprecate-class-table-and-backfill-section-terms.cjs` | Backfill; deprecate `class` |
| `20260629220000-deprecate-semester-table.cjs` | `class_section_term_id` on students/mapper; deprecate `semester` |
| `20260629230000-drop-student-class-sections-and-fee-plan.cjs` | Drop `students.class_sections_id`, `students.fee_plan_id` |
| `20260629240000-add-class-section-term-id-to-history-and-routine.cjs` | `class_section_term_id` on history + timetable routine |
| `20260629250000-add-combined-group-id-to-class-schedule-item.cjs` | Combined multi-section timetable slots |

---

## Key code references

| File | Purpose |
|------|---------|
| `utility/requestContext.js` | `getTenantStore()`, `getAcademicYearId()`, `buildRequestContextStore()` |
| `utility/scoped.js` | `scoped()`, `buildScope()` — tenant injection on DB reads/writes |
| `utility/classSectionIncludes.js` | Term/year resolution, student section includes |
| `utility/courseTerms.js` | Term list from `course.totalTerms` + `termType` |
| `repository/classSectionTermRepository.js` | Resolve `classSectionTermId` by section + term |
| `models/classSectionTermModel.js` | Term entity model |
| `docs/AFFECTED_APIS_CLASS_SECTION_TERM.md` | Full API contract changes (incl. tenant context) |
| `docs/API_ROUTE_REPLACEMENTS.md` | Old → new route URLs |
| `docs/CLASS_SECTION_TERM_FK_AUDIT.md` | Per-table `classSectionsId` vs `classSectionTermId` audit |

---

## Questions

Raise blockers in team channel with:
- API path + method
- Request body / query used
- Expected vs actual response
- Student `classSectionTermId` from DB if enrollment-related
