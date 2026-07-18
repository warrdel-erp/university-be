# Affected APIs — Schedule Date-Wise Redesign

**Date:** July 2026  
**Audience:** Backend + Frontend  
**Change:** Replace `class_schedule_item` (one row per teacher) with week cell + teachers + date-wise instance tables. Attendance keys off date-wise class id.

---

## New / changed tables

| Table | Action |
|-------|--------|
| `time_table_cell` | **NEW** — week template cell (day, period, subject, room) |
| `time_table_cell_teachers` | **NEW** — teachers on week cell |
| `time_table_cell_date_wise` | **NEW** — actual calendar-day class instance |
| `time_table_cell_teachers_date_wise` | **NEW** — teachers on that date instance |
| `attendance` | **ALTER** — FK `time_table_mapping_id` → `time_table_cell_date_wise_id` |
| `lesson_mapping` | **ALTER** — retarget FK off `time_table_mapping_id` |
| `class_schedule_item` | **DROP** after cutover |

**Unchanged tables:** `time_table_structure`, `time_table_structure_periods`, `time_table_structure_course`, `time_table_routine`

---

## Endpoint × table change matrix

### `/timeTableCreate` — routine + mapping

| Method | Path | Status | Tables read/write after change |
|--------|------|--------|--------------------------------|
| `GET` | `/timeTableCreate/` | Updated | `time_table_routine` (counts); cells optional |
| `GET` | `/timeTableCreate/single` | Updated | `time_table_routine`, `time_table_cell` |
| `GET` | `/timeTableCreate/create` | Breaking | `time_table_cell`, `time_table_cell_teachers` (replace `class_schedule_item`) |
| `GET` | `/timeTableCreate/getRoutine` | Breaking | `time_table_cell`, `time_table_cell_teachers` |
| `GET` | `/timeTableCreate/getRoutineByTeacher` | Breaking | `time_table_cell`, `time_table_cell_teachers` |
| `POST` | `/timeTableCreate/` | Unchanged contract | `time_table_routine` only |
| `PATCH` | `/timeTableCreate/create` | Unchanged contract | `time_table_routine` (routine object); periods unchanged |
| `DELETE` | `/timeTableCreate/` | Breaking | deletes `time_table_cell*` cascades + routine |
| `POST` | `/timeTableCreate/clone` | Breaking | copies `time_table_cell` + `time_table_cell_teachers` |
| `PATCH` | `/timeTableCreate/publish` | Breaking | sets publish + expands `time_table_cell_date_wise` + `time_table_cell_teachers_date_wise` |
| `POST` | `/timeTableCreate/mapping` | Breaking | writes `time_table_cell` + `time_table_cell_teachers` |
| `GET` | `/timeTableCreate/mapping` | Breaking | reads `time_table_cell` + teachers |
| `GET` | `/timeTableCreate/single/mapping` | Breaking | reads `time_table_cell` + teachers |
| `PATCH` | `/timeTableCreate/mapping` | Updated | updates cell type on `time_table_cell` |
| `PATCH` | `/timeTableCreate/mapping/update-create` | Breaking | writes Secondary into `time_table_cell_teachers` |
| `DELETE` | `/timeTableCreate/mapping` | Breaking | soft-deletes `time_table_cell` + teachers |
| `GET` | `/timeTableCreate/cellData` | Breaking | `time_table_cell`, `time_table_cell_teachers` |
| `GET` | `/timeTableCreate/elective` | Breaking | `time_table_cell`, `time_table_cell_teachers` |
| `GET` | `/timeTableCreate/subjectCount` | Updated | counts from `time_table_cell` |

### `/attendance`

| Method | Path | Status | Tables read/write after change |
|--------|------|--------|--------------------------------|
| `POST` | `/attendance/` | Breaking | `attendance` → `time_table_cell_date_wise_id`; reads date-wise + teachers |
| `POST` | `/attendance/copyPeriod` | Breaking | same FK change |
| `GET` | `/attendance/copyPeriod` | Breaking | same FK change |
| `GET` | `/attendance/` | Breaking | join via date-wise cell |
| `PATCH` | `/attendance/` | Updated | row update; FK already date-wise |
| `POST` | `/attendance/import` | Breaking | import keys date-wise id |
| `POST` | `/attendance/excelImport` | Breaking | import keys date-wise id |
| `GET` | `/attendance/byDate` | Breaking | date-wise + teachers |
| `GET` | `/attendance/previous-sessions/:employeeId` | Breaking | date-wise teachers |
| `GET` | `/attendance/studentAttendance/bulk` | Breaking | date-wise id |
| `POST` | `/attendance/getStudentAttendance/batch` | Breaking | body uses date-wise id (replaces `timeTableMappingId`) |
| `GET` | `/attendance/sectionDates` | Breaking | date-wise instances |

### `/employee`

| Method | Path | Status | Tables read/write after change |
|--------|------|--------|--------------------------------|
| `GET` | `/employee/schedule` | Breaking | `time_table_cell_date_wise`, `time_table_cell_teachers_date_wise`, `attendance` |
| `GET` | `/employee/pastSchedule` | Breaking | same date-wise tables + `attendance` |

### `/lesson`

| Method | Path | Status | Tables read/write after change |
|--------|------|--------|--------------------------------|
| Lesson mapping create/update/delete/copy/get | `/lesson/*` mapping routes | Breaking | `lesson_mapping` FK retargeted off `time_table_mapping_id` (to cell or date-wise id) |

### `/student`

| Method | Path | Status | Tables read/write after change |
|--------|------|--------|--------------------------------|
| Routes using `timeTableMappingId` | `/student/*` | Breaking | replace with date-wise / cell id |

### `/timeTable` (structure)

| Method | Path | Status | Tables |
|--------|------|--------|--------|
| Structure CRUD / courseMapping / periods | `/timeTable/*` | Unchanged | structure, periods, mapper only |

---

## Request/response ID renames (frontend)

| Today | After redesign |
|-------|----------------|
| `timeTableMappingId` (cell + teacher in one) | `timeTableCellId` (week) and/or `timeTableCellDateWiseId` (day) |
| Co-teacher = second mapping row | teachers on `time_table_cell_teachers` / date-wise teachers |
| Attendance keyed by mapping id | Attendance keyed by `timeTableCellDateWiseId` |
| PENDING per teacher mapping | MARKED once per date-wise cell for all teachers |

---

## Summary counts

| Status | Endpoint count (approx) |
|--------|-------------------------|
| Breaking | ~30 |
| Updated | ~5 |
| Unchanged | structure `/timeTable/*` period/mapping APIs |

---

## Related code areas

| Layer | Paths |
|-------|--------|
| Models | `classScheduleModel.js` → four new models; `attendanceModel.js`; `lessonMappingModel.js`; `models/index.js` |
| Services | `timeTableCreateServices.js`, `attendanceServices.js`, `employeeServices.js`, `lessonServices.js` |
| Repositories | `timeTablecreateRepository.js`, `attendanceRepository.js`, `employeeRepository.js`, `lessonRepository.js` |
| Utils | `attendancePlacement.js` |
| Postman | `docs/postman/univ-v2-timetable.postman_collection.json`, attendance section in `univ-v2.postman_collection.json` |
