# API Route Replacements — Class → Section

**Date:** June 2026  
**Status:** Old paths **removed** from codebase. Use only the **New URL** column.

The academic `class` table is deprecated. Routes that used `/class` in the path are renamed to section-based URLs. Request/response bodies are unchanged unless noted in [AFFECTED_APIS_CLASS_SECTION_TERM.md](./AFFECTED_APIS_CLASS_SECTION_TERM.md).

---

## Master data (`/main`)

| Method | Removed URL | New URL |
|--------|-------------|---------|
| `POST` | `/main/class` | `/main/classSections` |
| `GET` | `/main/class` | `/main/classSections` |
| `GET` | `/main/classSpecific` | `/main/classSectionSpecific` |
| `POST` | `/main/classSubjectMapper` | `/main/sectionSubjectMapper` |
| `GET` | `/main/classSubjectMapper` | `/main/sectionSubjectMapper` |
| `GET` | `/main/classRecord` | `/main/classSectionRecord` |
| `POST` | `/main/createClass` | `/main/classSections` (removed earlier) |
| `POST` | `/main/semester` | `/options/courseTerms?courseId=` |
| `GET` | `/main/semester` | `/options/courseTerms?courseId=` |

---

## Student (`/student`)

| Method | Removed URL | New URL |
|--------|-------------|---------|
| `POST` | `/student/classStudentMapping` | `/student/sectionStudentMapping` |
| `GET` | `/student/classStudentMapping` | `/student/sectionStudentMapping` |
| `GET` | `/student/promotion/available-class-section` | `/student/promotion/available-section` |

---

## Course (`/course`)

| Method | Removed URL | New URL |
|--------|-------------|---------|
| `GET` | `/course/semesterWithClassSections` | `/course/termsWithClassSections` |

**Query (unchanged):** `courseId`, `sessionId`

---

## Employee (`/employee`)

| Method | Removed URL | New URL |
|--------|-------------|---------|
| `GET` | `/employee/classDates` | `/employee/sectionDates` |
| `GET` | `/employee/classCounts` | `/employee/sectionCounts` |

**Query (unchanged):** `classSectionId`, `subjectId`, `employeeId` (for sectionDates); `employeeId`, optional `date` (for sectionCounts)

---

## Attendance (`/attendance`)

| Method | Removed URL | New URL |
|--------|-------------|---------|
| `GET` | `/attendance/classDates` | `/attendance/sectionDates` |
| `GET` | `/attendance/previous-classes/:employeeId` | `/attendance/previous-sessions/:employeeId` |

---

## Unchanged (not academic `class`)

These paths were **not** renamed:

| URL | Notes |
|-----|--------|
| `/classSections` | Section list filter |
| `/options/classSections` | Section dropdown |
| `/classRoom` | Physical classrooms |
| `/options/courseTerms` | Program terms from course |

---

## Controller / handler names (for backend devs)

| Old export | New export |
|------------|------------|
| `addClass` | `addClassSections` |
| `getClass` | `getClassSections` |
| `getClassSpecific` | `getClassSectionSpecific` |
| `addClassSubjectMapper` | `addSectionSubjectMapper` |
| `getClassSubjectMapper` | `getSectionSubjectMapper` |
| `getClassRecord` | `getClassSectionRecord` |
| `classStudentMapping` | `sectionStudentMapping` |
| `getclassStudentMapping` | `getSectionStudentMapping` |
| `getPromotionAvailableClassSection` | `getPromotionAvailableSection` |
| `getClassSectionsGrouped` | `getTermsWithClassSections` |
| `getClassCounts` | `getSectionCounts` |
| `getEmployeeClassDates` | `getEmployeeSectionDates` |
| `getPreviousClasses` | `getPreviousSessions` |

---

## Frontend migration checklist

1. Replace every removed URL in API client / Postman with the matching new URL.
2. Use `GET /options/courseTerms` instead of `/main/semester`.
3. Store `classSectionTermId` from dropdown responses — not `semesterId` or `classId`.
4. See [CLASS_SECTION_TERM_TEAM_TASKS.md](./CLASS_SECTION_TERM_TEAM_TASKS.md) for full FE task list.
