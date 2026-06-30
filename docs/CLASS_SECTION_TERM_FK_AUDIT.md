# Class Section vs Class Section Term — FK Audit

**Date:** June 2026  
**Context:** After `students` moved to `class_section_term_id` only (no `class_sections_id` on student row).

---

## Chain (reference)

```
course
  └── class_sections          ← physical section (year + section + session)
        └── class_section_term  ← program term instance (term 1…N)
              └── students.class_section_term_id          ✅ done
              └── class_student_mapper.class_section_term_id  ✅ done
```

**Rule of thumb**

| Use `classSectionsId` when… | Use `classSectionTermId` when… |
|-----------------------------|--------------------------------|
| Resource belongs to the **physical section** for the whole session/year | Record is **term-specific** (enrollment, promotion step, term timetable, term attendance roll) |
| Example: teacher assigned to section A1 | Example: student placed in A1 **Semester 2** |

---

## Table-by-table audit

### 1. `attendance` — `attendanceModel.js`

| Column | FK target | Status |
|--------|-----------|--------|
| `class_sections_id` | `class_sections` | **Keep** — denormalized snapshot at mark time |
| `class_section_term_id` | — | **Not present — recommended add (phase 2)** |

**Current associations (`models/index.js`)**
- `attendance` → `students` (`student_id`) ✅
- `attendance` → `class_sections` (`class_sections_id`) ✅
- `attendance` → `class_schedule_item` (`time_table_mapping_id`) ✅

**How it works today**
- API/bulk import resolves `classSectionsId` from the student’s `classSectionTermId` join (`resolveStudentClassSectionsId`).
- Attendance is filtered by `classSectionsId` + `timeTableMappingId` + date.

**Gap**
- Cannot filter attendance by **program term** without joining student or inferring term from timetable.
- Same student in term 1 vs term 2 on the same section shares one `class_sections_id` on attendance rows.

**Recommendation**
- **Short term:** keep `class_sections_id`; resolve term via `student.classSectionTermId` in queries.
- **Phase 2:** add nullable `class_section_term_id`, backfill from student at mark time, then use for reports.

---

### 2. `library_book` — `libraryBookModel.js`

| Column | FK target | Status |
|--------|-----------|--------|
| `class_sections_id` | none (integer only, optional) | **Keep as-is** |

**Associations**
- No Sequelize association to `class_sections` in `index.js` (optional metadata field only).

**Recommendation**
- **Do not add `class_section_term_id`.** Library catalog uses section as optional label/filter, not academic placement.
- Optional cleanup: add FK reference to `class_sections` if referential integrity is desired.

---

### 3. `student_class_sections_history` — `studentClassSectionsHistoryModel.js`

| Column | FK target | Status |
|--------|-----------|--------|
| `class_sections_id` | `class_sections` | **Keep** — which physical section |
| `class_section_term_id` | — | **Missing — should add** |

**Current associations**
- `student_class_sections_history` → `students` ✅
- `student_class_sections_history` → `class_sections` (`classSection`) ✅

**Gap**
- Promotion from A1 term 1 → A1 term 2 writes two history rows with the **same** `class_sections_id` and different statuses — indistinguishable without term.
- Aligns with student placement now keyed on `classSectionTermId`.

**Recommendation**
- **Add `class_section_term_id`** (nullable → backfill → NOT NULL for new rows).
- Write `classSectionTermId` on create in `studentService` (admission, promotion, bulk import).
- Keep `class_sections_id` for quick section display without join.

---

### 4. `teacher_section_mapping` — `teacherSectionMappingModel.js`

| Column | FK target | Status |
|--------|-----------|--------|
| `class_sections_id` | `class_sections` | **Keep** — teacher ↔ physical section |

**Current associations**
- `teacher_section_mapping` → `class_sections` (`employeeSection`) ✅
- `teacher_section_mapping` → `employees` ✅

**How term is handled today**
- Which subjects a teacher teaches in which term comes from `teacher_subject_mapping` → `subject.term`, not from this table.

**Recommendation**
- **Keep `class_sections_id` only** unless business requires different coordinators per term on the same section.
- If per-term coordinator is needed later, add optional `class_section_term_id` (do not replace section FK).

---

### 5. `time_table_routine` — `timeTableRoutineModel.js`

| Column | FK target | Status |
|--------|-----------|--------|
| `class_sections_id` | `class_sections` | **Keep** — which section the routine is for |
| `class_section_term_id` | — | **Not present — strongly recommended add** |

**Current associations**
- `time_table_routine` → `class_sections` (`timeTableClassSection`) ✅
- `class_schedule_item` → `time_table_routine` ✅

**Gap**
- `GET /timeTableCreate/getRoutine?classSectionsId=` returns **all** routines for the section — no term filter.
- Same section in term 1 and term 2 typically has **different subjects**; date ranges alone may overlap or be ambiguous.
- Student timetable resolves section from `classSectionTermId` but routine lookup is still section-only.

**Recommendation**
- **Phase 2 (high priority):** add `class_section_term_id` on `time_table_routine`.
- Update create/get APIs to accept `classSectionTermId` or `classSectionsId` + `term`.
- Overlap check should be per `(class_section_term_id, date range)` not only `class_sections_id`.

---

## Summary matrix

| Table / model | `class_sections_id` | `class_section_term_id` | Action |
|---------------|--------------------|-------------------------|--------|
| `students` | ❌ removed | ✅ required | Done |
| `class_student_mapper` | — | ✅ required | Done |
| `attendance` | ✅ keep | ⏳ add later | Phase 2 |
| `library_book` | ✅ optional | ❌ not needed | No change |
| `student_class_sections_history` | ✅ keep | ⏳ **add next** | Backend task |
| `teacher_section_mapping` | ✅ keep | ❌ not needed now | No change |
| `time_table_routine` | ✅ keep | ⏳ **add next** | Backend + FE task |

---

## Sequelize associations — no change required until columns exist

These FKs correctly point at **`class_sections`**, not `class_section_term`:

```text
attendance.class_sections_id           → classSectionModel (classAttendance)
student_class_sections_history       → classSectionModel (classSection)
teacher_section_mapping              → classSectionModel (employeeSection)
time_table_routine                   → classSectionModel (timeTableClassSection)
```

When `class_section_term_id` is added to a table, also add in `models/index.js`:

```javascript
model.belongsTo(classSectionTermModel, {
  foreignKey: 'class_section_term_id',
  as: 'classSectionTerm', // or domain-specific alias
});
classSectionTermModel.hasMany(model, {
  foreignKey: 'class_section_term_id',
  as: '...',
});
```

**Resolve section from term in queries:** use `utility/classSectionIncludes.js` → `studentClassSectionTermWithSectionInclude`, `resolveStudentSection`, `resolveStudentClassSectionsId`.

---

## Related docs

- [AFFECTED_APIS_CLASS_SECTION_TERM.md](./AFFECTED_APIS_CLASS_SECTION_TERM.md)
- [CLASS_SECTION_TERM_TEAM_TASKS.md](./CLASS_SECTION_TERM_TEAM_TASKS.md)
