# Affected APIs — Schedule Date-Wise Redesign

**Date:** July 2026 (updated 20 Jul 2026)  
**Audience:** Backend + Frontend  
**Change:** Replace `class_schedule_item` (one row per teacher) with week cell + teachers + date-wise instance tables. Attendance / lesson / roster keys off date-wise class id.

---

## Model split (source of truth)

| Layer | Tables | When |
|-------|--------|------|
| **Week template** | `time_table_cell`, `time_table_cell_teachers` | Routine create/edit; `getRoutine`; mapping / cellData / elective |
| **Dated instances** | `time_table_cell_date_wise`, `time_table_cell_teachers_date_wise` | Created on **publish** (and backfill); employee schedule + attendance |

- Week cell PK is `timeTableCellId` / `time_table_cell_id` (numeric id reused from Primary `class_schedule_item.time_table_mapping_id` during backfill).
- Teachers live only on teacher tables (`userId` + `teacherType`), not on the cell row — **2–3 teachers per cell** via join rows.
- Room is a single `class_room_section_id` on the cell / date-wise row.
- Publish expands routine `startingDate`…`endingDate` into date-wise rows (skips `weekOff`), then copies week teachers onto each date instance.

---

## New / changed tables

| Table | Action | Status |
|-------|--------|--------|
| `time_table_cell` | **NEW** — week template cell; PK = `time_table_cell_id` | Done |
| `time_table_cell_teachers` | **NEW** — teachers on week cell (`user_id`) | Done |
| `time_table_cell_date_wise` | **NEW** — calendar instance (`time_table_cell_id` + `date`) | Done |
| `time_table_cell_teachers_date_wise` | **NEW** — teachers on date instance (`user_id`) | Done |
| `attendance` | **ALTER** — `time_table_cell_date_wise_id` period key; dual-write `time_table_cell_id` → `time_table_cell` | Done |
| `lesson_mapping` | **ALTER** — `time_table_cell_date_wise_id` period key; dual-write `time_table_cell_id` → `time_table_cell` | Done |
| `class_schedule_item` | **DROP** after cutover | Keep until table drop; app reads no longer use it |

**Unchanged tables:** `time_table_structure`, `time_table_structure_periods`, `time_table_structure_course`, `time_table_routine`

### Migrations (one create / one alter per table)

| Order | Migration | Table |
|-------|-----------|--------|
| 1 | `20260718140000` | create `time_table_cell` |
| 2 | `20260718141000` | create `time_table_cell_teachers` |
| 3 | `20260718142000` | create `time_table_cell_date_wise` |
| 4 | `20260718143000` | create `time_table_cell_teachers_date_wise` |
| 5 | `20260718160000` | backfill week cells + teachers from `class_schedule_item` |
| 6 | `20260718170000` | date-wise expand for published routines |
| 7 | `20260718180000` | **attendance** — add date-wise id, rename mapping → cell id, backfill, FK |
| 8 | `20260718190000` | **lesson_mapping** — same pattern as attendance |

---

## Server mount order (`server.js`)

Schedule stack is grouped together:

```
/timeTable          → structure + courseMapping + periods
/timeTableCreate    → week cells + teachers; publish → date-wise
/faculityLoad
/attendance         → keys: timeTableCellDateWiseId
/lesson             → mapping keys: timeTableCellDateWiseId
/lecture
```

Related consumers (also date-wise / week-cell):

```
/employee           → schedule / past / upcoming / cellData / sectionDates
/student            → classSectionStudents + studentTimetable
/dashboard          → teacher dashboard may use schedule helpers
```

---

## Endpoint × table change matrix

### Status legend

| Status | Meaning |
|--------|---------|
| **Done** | Code uses new tables / date-wise id |
| Unchanged | Contract and tables unchanged |

---

### `/timeTable` — structure (router sections)

| # | Section | Method | Path | Status |
|---|---------|--------|------|--------|
| 1 | Structure template | `POST`/`PATCH`/`DELETE` | `/`, `/period`, `/structure/clone` | Unchanged |
| 2 | Course mapping | `POST`/`PATCH`/`DELETE` | `/courseMapping`, `/structure` | Unchanged |
| 3 | Read / list | `GET` | `/`, `/all_name`, `/single`, `/structureMappings` | Unchanged |
| 4 | Delete structure | `DELETE` | `/structure` | Unchanged |

---

### `/timeTableCreate` — routine + week cells (router sections)

| # | Section | Method | Path | Status | Notes |
|---|---------|--------|------|--------|-------|
| 1 | Read / bootstrap | `GET` | `/` | Done | Routines / terms list |
| | | `GET` | `/single` | Done | Routine + structure meta |
| | | `GET` | `/create` | Done | Empty grid; elective path uses cells |
| | | `GET` | `/getRoutine` | Done | `time_table_cell` + teachers |
| | | `GET` | `/getRoutineByTeacher` | Done | Filter via cell teachers `userId` |
| 2 | Routine lifecycle | `POST` | `/` | Unchanged | `time_table_routine` only |
| | | `PATCH` | `/create` | Unchanged | Routine object; periods unchanged |
| | | `DELETE` | `/` | Done | Soft-deletes date-wise → teachers → cells → routine |
| | | `POST` | `/clone` | Done | Copies cells + teachers |
| | | `PATCH` | `/publish` | Done | Expands date-wise + date-wise teachers |
| 3 | Mapping lifecycle | `POST` | `/mapping` | Done | Writes cell + teachers |
| | | `GET` | `/mapping` | Done | Reads cell + teachers |
| | | `GET` | `/single/mapping` | Done | Reads cell + teachers |
| | | `PATCH` | `/mapping` | Done | Updates cell (`timeTableCellId` + type) |
| | | `PATCH` | `/mapping/update-create` | Done | Secondary → `time_table_cell_teachers` |
| | | `DELETE` | `/mapping` | Done | Soft-deletes cell + teachers (+ date-wise) |
| 4 | Grid helpers | `GET` | `/cellData` | Done | Cells + teachers (one mapping entry per teacher) |
| | | `GET` | `/elective` | Done | Same as cellData |
| | | `GET` | `/subjectCount` | Done | Counts from `time_table_cell` |

---

### `/attendance` — period key = `timeTableCellDateWiseId` (router sections)

| # | Section | Method | Path | Status | Notes |
|---|---------|--------|------|--------|-------|
| 1 | Mark / update | `POST` | `/` | Done | Body: `timeTableCellDateWiseId`; dual-writes week cell id |
| | | `PATCH` | `/` | Done | By `attendanceId` |
| 2 | Copy period | `POST`/`GET` | `/copyPeriod` | Done | Source/targets: `timeTableCellDateWiseId` |
| 3 | List / lookup | `GET` | `/` | Done | Join via date-wise → week cell |
| | | `GET` | `/byDate` | Done | Term + date |
| | | `GET` | `/previous-sessions/:userId` | Done | Date-wise teacher rows |
| | | `GET` | `/sectionDates` | Done | Date-wise periods |
| 4 | Reports / batch | `GET` | `/studentAttendance/bulk` | Done | Via date-wise + teachers |
| | | `POST` | `/getStudentAttendance/batch` | Done | Filters: `timeTableCellDateWiseId` |
| 5 | Import | `POST` | `/import`, `/excelImport` | Done | Header / keys = date-wise id |

---

### `/employee` — schedule consumers (router sections)

| # | Section | Method | Path | Status | Notes |
|---|---------|--------|------|--------|-------|
| 1 | Date-wise schedule | `GET` | `/schedule` | Done | Date-wise + teachers; MARKED via date-wise id |
| | | `GET` | `/pastSchedule` | Done | Same |
| | | `GET` | `/upcomingSchedule` | Done | Same |
| | | `GET` | `/sectionDates` | Done | Date-wise instances |
| | | `GET` | `/sectionCounts` | Done | Date-wise / week cells |
| 2 | Week-cell subjects | `GET` | `/uniqueClassSectionSubjects` | Done | Week cells + teachers |
| | | `GET` | `/coursesFromSchedule` | Done | Week cells |
| | | `GET` | `/courses` | Done | Teacher courses |
| | | `GET` | `/cellData` | Done | `getTeacherWeekCells` |
| | | `GET` | `/subject`, `/evaluation` | Done | — |
| 3 | Staff directory CRUD | `GET`/`POST`/`PATCH`/`DELETE` | `/`, `/addEmp`, `/:id`, … | Unchanged | Not schedule |

---

### `/lesson` — mapping key = `timeTableCellDateWiseId` (router sections)

| # | Section | Method | Path | Status | Notes |
|---|---------|--------|------|--------|-------|
| 1 | Lesson plan CRUD | `POST`/`GET` | `/`, `/simple`, `/single`, `/employee` | Unchanged | Topics / windows by `lessonMappingId` |
| 2 | Topics | `POST` | `/topic` | Unchanged | — |
| 3 | Mapping | `POST` | `/mapping` | Done | Body: `timeTableCellDateWiseId` |
| | | `POST` | `/mapping/copy` | Done | Targets: `timeTableCellDateWiseId` |
| | | `GET` | `/mapping` | Done | Join date-wise → week cell → routine |
| | | `PATCH`/`DELETE` | `/`, `/mapping/:id` | Unchanged | By `lessonMappingId` |
| 4 | Lecture window | `POST` | `/link` | Unchanged | — |

---

### `/student`

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/classSectionStudents` | Done | Query: `timeTableCellDateWiseId` |
| `GET` | `/studentTimetable` | Done | Week cells + teachers |

---

## Request/response ID renames (frontend)

| Concept | Field | Table |
|---------|-------|--------|
| Week cell id | `timeTableCellId` | `time_table_cell.time_table_cell_id` |
| Date instance id | `timeTableCellDateWiseId` | `time_table_cell_date_wise` |
| Teacher on week cell | `timeTableCellTeacherId` + `userId` | `time_table_cell_teachers` |
| Teacher on date instance | under date-wise teachers | `time_table_cell_teachers_date_wise` |
| Room | `classRoomSectionId` / `room` | on cell / date-wise parent row |

| Before | After |
|--------|--------|
| Co-teacher = second `class_schedule_item` row | Teachers on `time_table_cell_teachers` / date-wise teachers |
| Attendance keyed by `timeTableMappingId` + date | Attendance keyed by `timeTableCellDateWiseId` |
| PENDING per teacher mapping row | MARKED once per date-wise cell for all teachers on that instance |

**Breaking FE contracts**

- Mark / copy / batch attendance: send `timeTableCellDateWiseId` (from `/employee/schedule`, `/sectionDates`, or previous-sessions).
- Lesson map / copy and student roster for a period: same — send `timeTableCellDateWiseId`.
- Week-template APIs use `timeTableCellId` (not legacy `timeTableMappingId`).
- `PATCH /timeTableCreate/mapping` (type change): body `timeTableCellId` + `timeTableType`.
- `cellData` / `elective`: one `mappingData` entry per teacher on the cell (`teacherType` from `time_table_cell_teachers`).

---

## Cutover checklist

1. ~~Create four cell tables (one migration each)~~
2. ~~Migrate mapping / publish / clone / delete routine~~
3. ~~Migrate getRoutine / getRoutineByTeacher~~
4. ~~Backfill cells + teachers + date-wise from `class_schedule_item`~~
5. ~~Employee schedule / past / upcoming → date-wise~~
6. ~~Attendance mark / list / copy → date-wise id~~
7. ~~Finish leftover `timeTableCreate` cellData / elective (+ employee cellData)~~
8. ~~Retarget `lesson_mapping` (+ lesson APIs) off `class_schedule_item`~~
9. ~~Retarget remaining `/student` schedule-id usages~~
10. ~~Backfill `attendance.time_table_cell_date_wise_id` — `20260718180000`~~
11. Make `attendance.time_table_cell_date_wise_id` NOT NULL; drop dual-write of week cell id when safe
12. Drop `class_schedule_item` (model + table)

---

## Summary counts (approx.)

| Status | Count |
|--------|-------|
| Done | ~38 |
| Partial | 0 |
| Pending | drop `class_schedule_item` + NOT NULL on attendance date-wise id |
| Unchanged | structure `/timeTable/*` + staff/lesson CRUD |

---

## Related code areas

| Layer | Paths |
|-------|--------|
| Server | `server.js` — schedule stack mounts |
| Routers | `timeTableRoute.js`, `timeTableCreateRoute.js`, `attendanceRoute.js`, `employeeRoute.js`, `lessonRoute.js`, `studentRoute.js` |
| Models | `timeTableCellModel.js`, `timeTableCellTeachersModel.js`, `timeTableCellDateWiseModel.js`, `timeTableCellTeachersDateWiseModel.js`, `attendanceModel.js`, `lessonMappingModel.js`, `models/index.js` |
| Migrations | `20260718140000` … `143000` (creates), `160000`/`170000` (backfills), `180000`/`190000` (attendance / lesson_mapping) |
| Services | `timeTableCreateServices.js`, `attendanceServices.js`, `employeeServices.js`, `lessonServices.js`, `studentService.js` |
| Repositories | `timeTablecreateRepository.js`, `attendanceRepository.js`, `employeeScheduleRepository.js`, `lessonRepository.js`, `studentRepository.js` |
| Utils | `attendancePlacement.js` |
| Docs / Postman | this file; `docs/postman/univ-v2-timetable.postman_collection.json`, attendance in `univ-v2.postman_collection.json` |
