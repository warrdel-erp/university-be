# Schedule Date-Wise Redesign — Integration Guide

**Date:** 20 Jul 2026  
**Audience:** Frontend / Integration / QA  
**Goal:** Wire clients so attendance, lesson, and roster work end-to-end on the new IDs.

---

## 1. Start here — IDs you must use

| Use case | Send this ID | Do **not** send |
|----------|--------------|-----------------|
| Week grid / mapping / cellData / elective | `timeTableCellId` | `timeTableMappingId` |
| Mark attendance / copy period / batch | `timeTableCellDateWiseId` | mapping id + date pair |
| Lesson map / copy | `timeTableCellDateWiseId` | mapping id |
| Student roster for a period | `timeTableCellDateWiseId` | mapping id |
| Co-teachers | Multiple teacher rows on one cell (`userId` + `teacherType`) | Second schedule-item row |

**Where to get `timeTableCellDateWiseId`**

1. `GET /employee/schedule` (or past / upcoming) — each period instance  
2. `GET /employee/sectionDates` or `GET /attendance/sectionDates`  
3. `GET /attendance/previous-sessions/:userId`

**Where to get `timeTableCellId`**

1. `GET /timeTableCreate/getRoutine`  
2. `POST/GET /timeTableCreate/mapping` responses  
3. `GET /timeTableCreate/cellData` / `/elective` (`mappingData[].timeTableCellId`)

---

## 2. Integration order (do this sequence)

Work top → bottom. Later steps need IDs from earlier ones.

**Full URL list (all routers, same order):** [SCHEDULE_DATEWISE_API_URLS.md](./SCHEDULE_DATEWISE_API_URLS.md)

```
① /timeTable          structure + courseMapping + periods
② /timeTableCreate    create routine → map cells/teachers → publish
③ /employee           schedule / sectionDates  →  timeTableCellDateWiseId
④ /attendance         mark / list / copy       →  uses date-wise id
⑤ /lesson             mapping / copy           →  uses date-wise id
⑥ /student            roster + week timetable
```

### Happy-path smoke (minimum)

| Step | Call | Pass |
|------|------|------|
| A | `GET /timeTable/` | Structure exists |
| B | `POST /timeTableCreate/` | `timeTableRoutineId` |
| C | `POST /timeTableCreate/mapping` | `timeTableCellId` |
| D | `PATCH /timeTableCreate/publish?timeTableRoutineId=` | Date-wise rows created |
| E | `GET /employee/schedule?userId=` | Response includes `timeTableCellDateWiseId` |
| F | `POST /attendance/` body `{ timeTableCellDateWiseId, … }` | Marked |
| G | `POST /lesson/mapping` body `{ timeTableCellDateWiseId, … }` | Mapped |
| H | `GET /student/classSectionStudents?timeTableCellDateWiseId=` | Roster |

Until **D (publish)** succeeds, E–H have nothing to key on.

### 2.1 Existing database (legacy `class_schedule_item` data)

**GET handlers do not read `class_schedule_item`.** They query only `time_table_cell`, `time_table_cell_teachers`, and (for day views) `time_table_cell_date_wise`. Deploying the new code **without** backfill migrations will return **empty** week grids and schedules even when legacy rows still exist.

Run migrations **1–8** in [§6](#6-migrations-backend--testing) before testing GET APIs against old data.

| After this migration | GET APIs that start returning legacy data |
|----------------------|-------------------------------------------|
| `20260718160000` | Week template: `GET /timeTableCreate/getRoutine`, `mapping`, `cellData`, `elective`, `getRoutineByTeacher`; student week timetable |
| `20260718170000` | Day view: `GET /employee/schedule`, `sectionDates`; anything needing `timeTableCellDateWiseId` |
| `20260718180000` | Existing **attendance** rows linked to date-wise ids |
| `20260718190000` | Existing **lesson_mapping** rows linked to date-wise ids |

**ID compatibility:** backfill sets `time_table_cell_id` = the **Primary** (or lowest) legacy `time_table_mapping_id` per slot. If the FE still stores old mapping ids, week-grid calls using that id as `timeTableCellId` often still work. Secondary co-teacher mapping ids are **not** kept as cell ids — use one cell id + `teachers` array. `timeTableCellDateWiseId` is new; it appears only after publish + `170000` (or a new publish on deployed code).

**Verify backfill (PostgreSQL):**

```sql
SELECT COUNT(*) AS legacy_rows FROM class_schedule_item;
SELECT COUNT(*) AS cells FROM time_table_cell;
SELECT COUNT(*) AS date_wise FROM time_table_cell_date_wise;
SELECT COUNT(*) AS attendance_with_date_wise
FROM attendance WHERE time_table_cell_date_wise_id IS NOT NULL;
```

Legacy row count ≠ cell count (co-teachers collapse to one cell). Date-wise count > 0 only for **published** routines after `170000`.

---

## 3. Data model (short)

| Layer | Tables | Client uses |
|-------|--------|-------------|
| Week template | `time_table_cell` + `time_table_cell_teachers` | Before publish; edit grid |
| Dated instances | `time_table_cell_date_wise` + `time_table_cell_teachers_date_wise` | After publish; attendance / lesson / teacher day view |

- One cell → many teachers (`Primary` / secondary via `teacherType`).  
- One room per cell / date instance (`classRoomSectionId`).  
- Publish expands `startingDate`…`endingDate` (skips `weekOff`) into date-wise rows and copies teachers.

---

## 4. Routers by full URL (server mount → path)

Auth + institute / academic-year headers as usual. Listed in **integration order**.

---

### 4.1 `/timeTable` — structure setup  
Router: `timeTableRoute.js` · Status: **Unchanged** (no new IDs)

| Method | Full URL | Purpose |
|--------|----------|---------|
| `POST` | `/timeTable/` | Create structure |
| `POST` | `/timeTable/period` | Add periods |
| `POST` | `/timeTable/structure/clone` | Clone structure |
| `PATCH` | `/timeTable/` | Edit periods |
| `DELETE` | `/timeTable/` | Delete period/row |
| `POST` | `/timeTable/courseMapping` | Bind structure → course + session + dates |
| `PATCH` | `/timeTable/structure` | Update mapping dates / course |
| `DELETE` | `/timeTable/courseMapping` | Remove course mapping |
| `GET` | `/timeTable/` | List structures |
| `GET` | `/timeTable/all_name` | Name dropdown |
| `GET` | `/timeTable/single` | One structure |
| `GET` | `/timeTable/structureMappings` | Print / mapping list |
| `DELETE` | `/timeTable/structure` | Delete structure name |

**Integrate:** finish structure + `courseMapping` before creating a routine.

---

### 4.2 `/timeTableCreate` — week cells + publish  
Router: `timeTableCreateRoute.js` · Week key: **`timeTableCellId`**

#### Read / bootstrap

| Method | Full URL | Key fields |
|--------|----------|------------|
| `GET` | `/timeTableCreate/` | `courseId`, `sessionId` |
| `GET` | `/timeTableCreate/single` | `courseId` |
| `GET` | `/timeTableCreate/create` | `courseId`, `classSectionTermId` (or elective) |
| `GET` | `/timeTableCreate/getRoutine` | `classSectionTermId` → cells + teachers |
| `GET` | `/timeTableCreate/getRoutineByTeacher` | `userId`, `courseId`, `sessionId`, `subjectId?` |

#### Routine lifecycle

| Method | Full URL | Key fields |
|--------|----------|------------|
| `POST` | `/timeTableCreate/` | `timetableStructureCourseMapperId`, dates, `classSectionTermId` |
| `PATCH` | `/timeTableCreate/create` | Routine or periods patch |
| `DELETE` | `/timeTableCreate/` | `timeTableRoutineId` |
| `POST` | `/timeTableCreate/clone` | `previousRoutineId`, dates |
| `PATCH` | `/timeTableCreate/publish` | Query: `timeTableRoutineId` → **creates date-wise** |

#### Mapping (week cell)

| Method | Full URL | Key fields |
|--------|----------|------------|
| `POST` | `/timeTableCreate/mapping` | Slot / copy; returns `timeTableCellId` |
| `GET` | `/timeTableCreate/mapping` | Body: `timeTableRoutineId` |
| `GET` | `/timeTableCreate/single/mapping` | `courseId` |
| `PATCH` | `/timeTableCreate/mapping` | Body: `timeTableCellId` + `timeTableType` |
| `PATCH` | `/timeTableCreate/mapping/update-create` | Array; base row `timeTableCellId`; teachers via `userId` / `timeTableCellTeacherId` |
| `DELETE` | `/timeTableCreate/mapping` | Query: `timeTableCellId` |

#### Grid helpers

| Method | Full URL | Key fields |
|--------|----------|------------|
| `GET` | `/timeTableCreate/cellData` | `courseId`, `classSectionTermId` → `mappingData[].timeTableCellId` + teacher per entry |
| `GET` | `/timeTableCreate/elective` | `courseId` |
| `GET` | `/timeTableCreate/subjectCount` | `classSectionTermId` |

**Integrate:** map teachers → **publish** → only then call `/employee/schedule` or attendance.

---

### 4.3 `/employee` — teacher day schedule (source of date-wise id)  
Router: `employeeRoute.js`

#### Date-wise schedule (start FE day-view here)

| Method | Full URL | Key query / response |
|--------|----------|----------------------|
| `GET` | `/employee/schedule` | `userId`, `date?`, `sessionId?` → **`timeTableCellDateWiseId`**, MARKED status |
| `GET` | `/employee/pastSchedule` | Same shape |
| `GET` | `/employee/upcomingSchedule` | Same shape |
| `GET` | `/employee/sectionDates` | `classSectionTermId`, `subjectId`, `userId` → date-wise period list |
| `GET` | `/employee/sectionCounts` | Counts |

#### Week-cell subjects (no date-wise required)

| Method | Full URL | Notes |
|--------|----------|-------|
| `GET` | `/employee/uniqueClassSectionSubjects` | `userId` |
| `GET` | `/employee/coursesFromSchedule` | From week cells |
| `GET` | `/employee/courses` | Teacher courses |
| `GET` | `/employee/cellData` | Week grid for teacher |
| `GET` | `/employee/subject` | `userId`, `sessionId?`, `term?` |
| `GET` | `/employee/evaluation` | — |

Staff CRUD (`/employee/`, `/addEmp`, `/:id`, …) is unrelated to schedule IDs.

**Integrate:** take `timeTableCellDateWiseId` from schedule / sectionDates into attendance + lesson + student roster.

---

### 4.4 `/attendance` — mark with date-wise id  
Router: `attendanceRoute.js` · Period key: **`timeTableCellDateWiseId`**

| Method | Full URL | Body / query |
|--------|----------|--------------|
| `POST` | `/attendance/` | `classSectionTermId`, `timeTableCellDateWiseId` (or array), `attendance[]` |
| `PATCH` | `/attendance/` | By `attendanceId` |
| `POST` | `/attendance/copyPeriod` | `timeTableCellDateWiseId`, `copyToTimeTableCellDateWiseId` |
| `GET` | `/attendance/copyPeriod` | `timeTableCellDateWiseId` |
| `GET` | `/attendance/` | List (joins date-wise → week cell) |
| `GET` | `/attendance/byDate` | `date`, `classSectionTermId`, `userId` |
| `GET` | `/attendance/previous-sessions/:userId` | Prior sessions + date-wise ids |
| `GET` | `/attendance/sectionDates` | Same idea as employee sectionDates |
| `GET` | `/attendance/studentAttendance/bulk` | Report |
| `POST` | `/attendance/getStudentAttendance/batch` | `filters[].timeTableCellDateWiseId` |
| `POST` | `/attendance/excelImport` | Period header = date-wise id |
| `POST` | `/attendance/import` | Deprecated |

**Integrate:** never send legacy `timeTableMappingId` for mark/copy/batch.

---

### 4.5 `/lesson` — map lesson to date-wise period  
Router: `lessonRoute.js` · Period key: **`timeTableCellDateWiseId`**

| Method | Full URL | Notes |
|--------|----------|-------|
| `POST` | `/lesson/` | Create lesson plan |
| `GET` | `/lesson/` | List |
| `GET` | `/lesson/simple` | Simple list |
| `GET` | `/lesson/single` | One lesson |
| `GET` | `/lesson/employee` | Employee subjects + lessons |
| `POST` | `/lesson/topic` | Add topic |
| `POST` | `/lesson/mapping` | Body: `topicId`, **`timeTableCellDateWiseId`** |
| `POST` | `/lesson/mapping/copy` | `targets[].timeTableCellDateWiseId` |
| `GET` | `/lesson/mapping` | Reads via date-wise → cell → routine |
| `PATCH` | `/lesson/` | Update mapping meta |
| `PATCH` | `/lesson/mapping/:lessonMappingId` | Complete |
| `DELETE` | `/lesson/mapping/:lessonMappingId` | Delete |
| `POST` | `/lesson/link` | Link to lecture window |

**Integrate:** same date-wise id as attendance for that period instance.

---

### 4.6 `/student` — roster + week view  
Router: `studentRoute.js`

| Method | Full URL | Key |
|--------|----------|-----|
| `GET` | `/student/classSectionStudents` | Query: **`timeTableCellDateWiseId`** |
| `GET` | `/student/studentTimetable` | Week cells + teachers |

---

### 4.7 Also mounted (schedule stack)

| Mount | Role for this redesign |
|-------|------------------------|
| `/faculityLoad` | Unchanged for date-wise cutover |
| `/lecture` | Unchanged; linked from `/lesson/link` |
| `/dashboard` | May show teacher schedule helpers; use same date-wise ids if present |

---

### 4.8 `/examAttendance` — exam room capacity student attendance
Router: `examAttendanceRoute.js`

| Method | Full URL | Key fields / params |
|--------|----------|---------------------|
| `GET` | `/examAttendance/` | Query: `examinationSessionId` (req), filters (opt) |
| `GET` | `/examAttendance/room` | Query: `examScheduleId`, `examScheduleRoomCapacityId` |
| `GET` | `/examAttendance/:examScheduleId` | Param: `examScheduleId` |
| `PATCH` | `/examAttendance/` | Body: `examScheduleId`, `examScheduleRoomCapacityId`, array of `students` |
| `POST` | `/examAttendance/status` | Body: `examScheduleId`, `examScheduleRoomCapacityId`, `status` |

---

### 4.9 `/examSchedule` — seat allocation options
Router: `examScheduleRoute.js`

| Method | Full URL | Key fields / params |
|--------|----------|---------------------|
| `POST` | `/examSchedule/allocateSeats/randomly` | Body: `examScheduleId` |
| `POST` | `/examSchedule/allocateSeats/ascending` | Body: `examScheduleId` |
| `POST` | `/examSchedule/allocateSeats/descending` | Body: `examScheduleId` |

---

## 5. FE contract checklist

- [ ] Replace all `timeTableMappingId` in week UI with `timeTableCellId`
- [ ] After publish, day/attendance/lesson screens use `timeTableCellDateWiseId` only
- [ ] Co-teachers: one cell, multiple `mappingData` / teacher rows (`teacherType`)
- [ ] MARKED once per date-wise cell (shared by all teachers on that instance)
- [ ] Do not call attendance/lesson/roster until schedule returns date-wise ids (published routine)

---

## 6. Migrations (backend / testing)

Run in order (one create / one alter per table):

| # | File | Table |
|---|------|--------|
| 1 | `20260718140000` | create `time_table_cell` |
| 2 | `20260718141000` | create `time_table_cell_teachers` |
| 3 | `20260718142000` | create `time_table_cell_date_wise` |
| 4 | `20260718143000` | create `time_table_cell_teachers_date_wise` |
| 5 | `20260718160000` | backfill week cells + teachers |
| 6 | `20260718170000` | backfill date-wise for published routines |
| 7 | `20260718180000` | alter `attendance` |
| 8 | `20260718190000` | alter `lesson_mapping` |

Pending later: `attendance.time_table_cell_date_wise_id` NOT NULL; drop `class_schedule_item`.

---

## 7. Code map

| Layer | Paths |
|-------|--------|
| **API URL index** | [SCHEDULE_DATEWISE_API_URLS.md](./SCHEDULE_DATEWISE_API_URLS.md) — all routes in integration order |
| Mounts | `server.js` (schedule stack) |
| Routers | `timeTableRoute.js`, `timeTableCreateRoute.js`, `employeeRoute.js`, `attendanceRoute.js`, `lessonRoute.js`, `studentRoute.js` |
| Services / repos | `timeTableCreateServices.js`, `employeeServices.js` + `employeeScheduleRepository.js`, `attendanceServices.js`, `lessonServices.js`, `studentService.js` |
| Postman | `docs/postman/univ-v2-timetable.postman_collection.json`, attendance in `univ-v2.postman_collection.json` |
