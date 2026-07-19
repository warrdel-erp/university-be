# Affected APIs — Schedule Date-Wise Redesign

**Date:** July 2026 (updated 19 Jul 2026)  
**Audience:** Backend + Frontend  
**Change:** Replace `class_schedule_item` (one row per teacher) with week cell + teachers + date-wise instance tables. Attendance keys off date-wise class id.

---

## Model split (source of truth)

| Layer | Tables | When |
|-------|--------|------|
| **Week template** | `time_table_cell`, `time_table_cell_teachers` | Routine create/edit; `getRoutine`; mapping APIs |
| **Dated instances** | `time_table_cell_date_wise`, `time_table_cell_teachers_date_wise` | Created on **publish** (and backfill); employee schedule + attendance |

- Week cell PK stays `timeTableMappingId` / `time_table_mapping_id` (same identifier as old schedule item PK for Primary rows).
- Teachers live only on teacher tables (`userId` + `teacherType`), not on the cell row.
- Publish expands routine `startingDate`…`endingDate` into date-wise rows (skips `weekOff`), then copies week teachers onto each date instance.

---

## New / changed tables

| Table | Action | Status |
|-------|--------|--------|
| `time_table_cell` | **NEW** — week template cell; PK = `time_table_mapping_id` | Done |
| `time_table_cell_teachers` | **NEW** — teachers on week cell (`user_id`) | Done |
| `time_table_cell_date_wise` | **NEW** — calendar instance (`time_table_mapping_id` + `date`) | Done |
| `time_table_cell_teachers_date_wise` | **NEW** — teachers on date instance (`user_id`) | Done |
| `attendance` | **ALTER** — `time_table_cell_date_wise_id` is period key; mapping id dual-write points at `time_table_cell` | Done |
| `lesson_mapping` | **ALTER** — `time_table_cell_date_wise_id` period key; mapping dual-write → `time_table_cell` | Done |
| `class_schedule_item` | **DROP** after cutover | Keep until lesson + leftover reads migrate |

**Unchanged tables:** `time_table_structure`, `time_table_structure_periods`, `time_table_structure_course`, `time_table_routine`

**Backfill:**
- `migrations/20260718160000-backfill-time-table-cells-from-class-schedule.cjs` (week cells + teachers)
- `migrations/20260718170000-backfill-time-table-cell-date-wise-from-published.cjs` (date-wise expand)
- `migrations/20260718180000-backfill-attendance-time-table-cell-date-wise-id.cjs` (attendance)
- `migrations/20260718190000-add-lesson-mapping-time-table-cell-date-wise-id.cjs` (lesson mapping)
Groups Primary/Secondary into one cell + teachers; expands published routines into date-wise + date-wise teachers.

---

## Endpoint × table change matrix

### Status legend

| Status | Meaning |
|--------|---------|
| **Done** | Code uses new tables / date-wise id |
| **Partial** | Mostly migrated; some leftover `class_schedule_item` path |
| **Pending** | Still on `class_schedule_item` / old mapping id |
| Unchanged | Contract and tables unchanged |

### `/timeTableCreate` — routine + mapping

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/timeTableCreate/` | Done | Routines / terms list |
| `GET` | `/timeTableCreate/single` | Done | Routine + structure meta |
| `GET` | `/timeTableCreate/create` | Done | Empty grid; elective path uses cells |
| `GET` | `/timeTableCreate/getRoutine` | Done | `time_table_cell` + `time_table_cell_teachers` |
| `GET` | `/timeTableCreate/getRoutineByTeacher` | Done | Filter via cell teachers `userId` |
| `POST` | `/timeTableCreate/` | Unchanged | `time_table_routine` only |
| `PATCH` | `/timeTableCreate/create` | Unchanged | Routine object; periods unchanged |
| `DELETE` | `/timeTableCreate/` | Done | Soft-deletes date-wise → teachers → cells → routine |
| `POST` | `/timeTableCreate/clone` | Done | Copies cells + teachers |
| `PATCH` | `/timeTableCreate/publish` | Done | Expands date-wise + date-wise teachers |
| `POST` | `/timeTableCreate/mapping` | Done | Writes cell + teachers |
| `GET` | `/timeTableCreate/mapping` | Done | Reads cell + teachers |
| `GET` | `/timeTableCreate/single/mapping` | Done | Reads cell + teachers |
| `PATCH` | `/timeTableCreate/mapping` | Done | Updates cell |
| `PATCH` | `/timeTableCreate/mapping/update-create` | Done | Secondary → `time_table_cell_teachers` |
| `DELETE` | `/timeTableCreate/mapping` | Done | Soft-deletes cell + teachers (+ date-wise) |
| `GET` | `/timeTableCreate/cellData` | Partial | Still has leftover `class_schedule_item` reads |
| `GET` | `/timeTableCreate/elective` | Partial | Still has leftover `class_schedule_item` reads |
| `GET` | `/timeTableCreate/subjectCount` | Done | Counts from `time_table_cell` |

### `/attendance`

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `POST` | `/attendance/` | Done | Body: `timeTableCellDateWiseId`; dual-writes mapping id |
| `POST` | `/attendance/copyPeriod` | Done | Source/targets: `timeTableCellDateWiseId` |
| `GET` | `/attendance/copyPeriod` | Done | Query: `timeTableCellDateWiseId` |
| `GET` | `/attendance/` | Done | Join via date-wise → week cell |
| `PATCH` | `/attendance/` | Done | By `attendanceId` |
| `POST` | `/attendance/import` | Done | Keys date-wise id |
| `POST` | `/attendance/excelImport` | Done | Header period id = date-wise id |
| `GET` | `/attendance/byDate` | Done | Term + date (meta may still be light) |
| `GET` | `/attendance/previous-sessions/:userId` | Done | Date-wise teacher rows |
| `GET` | `/attendance/studentAttendance/bulk` | Done | Report via date-wise + teachers |
| `POST` | `/attendance/getStudentAttendance/batch` | Done | Filters: `timeTableCellDateWiseId` |
| `GET` | `/attendance/sectionDates` | Done | Date-wise periods (also on `/employee/sectionDates`) |

### `/employee`

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/employee/schedule` | Done | Date-wise + teachers; MARKED via date-wise id |
| `GET` | `/employee/pastSchedule` | Done | Same |
| `GET` | `/employee/upcomingSchedule` | Done | Same |
| `GET` | `/employee/sectionDates` | Done | Date-wise instances |
| `GET` | `/employee/sectionCounts` | Done | Date-wise / week cells |
| `GET` | `/employee/uniqueClassSectionSubjects` | Done | Week cells + teachers |
| `GET` | `/employee/coursesFromSchedule` | Done | Week cells |
| `GET` | `/employee/cellData` | Partial | Confirm all paths off `class_schedule_item` |

### `/lesson`

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `POST` | `/lesson/mapping` | Done | Body: `timeTableCellDateWiseId`; dual-writes mapping + date |
| `POST` | `/lesson/mapping/copy` | Done | Targets: `timeTableCellDateWiseId` |
| `GET` | `/lesson/mapping` | Done | Join date-wise → week cell → routine |
| Other | `/lesson/*` | Unchanged | Topics / windows / complete by `lessonMappingId` |

### `/student`

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | students by class section | Done | Query: `timeTableCellDateWiseId`; attendance by date-wise id |

### `/timeTable` (structure)

| Method | Path | Status | Tables |
|--------|------|--------|--------|
| Structure CRUD / courseMapping / periods | `/timeTable/*` | Unchanged | structure, periods, mapper only |

---

## Request/response ID renames (frontend)

| Concept | Field | Table |
|---------|-------|--------|
| Week cell id | `timeTableMappingId` | `time_table_cell` (PK unchanged name) |
| Date instance id | `timeTableCellDateWiseId` | `time_table_cell_date_wise` |
| Teacher on week cell | `timeTableCellTeacherId` + `userId` | `time_table_cell_teachers` |
| Teacher on date instance | under date-wise teachers | `time_table_cell_teachers_date_wise` |

| Before | After |
|--------|--------|
| Co-teacher = second `class_schedule_item` row | Teachers on `time_table_cell_teachers` / date-wise teachers |
| Attendance keyed by `timeTableMappingId` + date | Attendance keyed by `timeTableCellDateWiseId` |
| PENDING per teacher mapping row | MARKED once per date-wise cell for all teachers on that instance |

**Breaking FE contracts**

- Mark / copy / batch attendance: send `timeTableCellDateWiseId` (from `/employee/schedule`, `/sectionDates`, or previous-sessions).
- Lesson map / copy and student roster for a period: same — send `timeTableCellDateWiseId`.
- Do **not** invent a separate `timeTableCellId` name in APIs — week cell id remains `timeTableMappingId`.

---

## Cutover checklist

1. ~~Create four cell tables + attendance column~~
2. ~~Migrate mapping / publish / clone / delete routine~~
3. ~~Migrate getRoutine / getRoutineByTeacher~~
4. ~~Backfill cells + teachers + date-wise from `class_schedule_item`~~
5. ~~Employee schedule / past / upcoming → date-wise~~
6. ~~Attendance mark / list / copy → date-wise id~~
7. Finish leftover `timeTableCreate` cellData / elective (and employee cellData if needed)
8. ~~Retarget `lesson_mapping` (+ lesson APIs) off `class_schedule_item`~~
9. ~~Retarget remaining `/student` schedule-id usages~~
10. Backfill `attendance.time_table_cell_date_wise_id` for legacy rows — `20260718180000`
11. Make `attendance.time_table_cell_date_wise_id` NOT NULL; drop dual-write of mapping id when safe
12. Drop `class_schedule_item`

---

## Summary counts (approx.)

| Status | Count |
|--------|-------|
| Done | ~35 |
| Partial | ~3 |
| Pending | leftover cellData / elective |
| Unchanged | structure `/timeTable/*` |

---

## Related code areas

| Layer | Paths |
|-------|--------|
| Models | `timeTableCellModel.js`, `timeTableCellTeachersModel.js`, `timeTableCellDateWiseModel.js`, `timeTableCellTeachersDateWiseModel.js`, `attendanceModel.js`, `lessonMappingModel.js`, `models/index.js` |
| Migrations | `20260718140000` … `20260718190000-add-lesson-mapping-time-table-cell-date-wise-id.cjs` |
| Services | `timeTableCreateServices.js`, `attendanceServices.js`, `employeeServices.js`, `lessonServices.js`, `studentService.js` |
| Repositories | `timeTablecreateRepository.js`, `attendanceRepository.js`, `employeeScheduleRepository.js`, `lessonRepository.js`, `studentRepository.js` |
| Utils | `attendancePlacement.js` |
| Docs / Postman | this file; `docs/postman/univ-v2-timetable.postman_collection.json`, attendance in `univ-v2.postman_collection.json` |
