# Schedule Date-Wise — API URL Reference

**Date:** 20 Jul 2026  
**Companion:** [AFFECTED_APIS_SCHEDULE_DATEWISE_REDESIGN.md](./AFFECTED_APIS_SCHEDULE_DATEWISE_REDESIGN.md)  
**Base URL:** `{host}` (e.g. `http://localhost:8080`)  
**Auth:** All routes use `userAuth` (+ `checkAccess` where noted).

Integrate in this order — each step depends on the previous:

```
① /timeTable          structure + courseMapping + periods
② /timeTableCreate    create routine → map cells/teachers → publish
③ /employee           schedule / sectionDates  →  timeTableCellDateWiseId
④ /attendance         mark / list / copy       →  uses date-wise id
⑤ /lesson             mapping / copy           →  uses date-wise id
⑥ /student            roster + week timetable
```

**ID legend**

| Symbol | Field | When |
|--------|-------|------|
| `cell` | `timeTableCellId` | Week template (before / without day) |
| `dw` | `timeTableCellDateWiseId` | Dated period instance (after publish) |

---

## ① `/timeTable` — structure + courseMapping + periods

**Router:** `router/timeTableRoute.js` · **Mount:** `server.js` → `/timeTable`  
**Tables:** `time_table_structure`, `time_table_structure_periods`, `time_table_structure_course`  
**Cutover:** Unchanged — no new cell / date-wise IDs.

### 1. Structure template

| # | Method | Full URL | Purpose |
|---|--------|----------|---------|
| 1 | `POST` | `/timeTable/` | Create structure |
| 2 | `POST` | `/timeTable/structure/clone` | Clone structure |
| 3 | `POST` | `/timeTable/period` | Add period row |
| 4 | `PATCH` | `/timeTable/` | Update periods (array body) |
| 5 | `DELETE` | `/timeTable/` | Delete period — query: `timeTableCreationId` |

### 2. Course mapping

| # | Method | Full URL | Purpose |
|---|--------|----------|---------|
| 6 | `POST` | `/timeTable/courseMapping` | Bind structure → course + session + dates |
| 7 | `PATCH` | `/timeTable/structure` | Update mapping |
| 8 | `DELETE` | `/timeTable/courseMapping` | Remove mapping — query: `timetableStructureCourseMapperId` |

### 3. Read / list

| # | Method | Full URL | Purpose |
|---|--------|----------|---------|
| 9 | `GET` | `/timeTable/` | List structures |
| 10 | `GET` | `/timeTable/all_name` | Structure name dropdown |
| 11 | `GET` | `/timeTable/single` | One structure — query: `timeTableNameId` |
| 12 | `GET` | `/timeTable/structureMappings` | Print / mapping list |

### 4. Delete structure

| # | Method | Full URL | Purpose |
|---|--------|----------|---------|
| 13 | `DELETE` | `/timeTable/structure` | Delete structure name — query: `timeTableNameId` |

---

## ② `/timeTableCreate` — week cells + publish

**Router:** `router/timeTableCreateRoute.js` · **Mount:** `server.js` → `/timeTableCreate`  
**Tables:** `time_table_routine`, `time_table_cell`, `time_table_cell_teachers`, `time_table_cell_date_wise`, `time_table_cell_teachers_date_wise`  
**Week key:** `timeTableCellId` (`cell`) · **Publish creates** date-wise rows (`dw`).

### 1. Read / bootstrap

| # | Method | Full URL | Key params | Returns / notes |
|---|--------|----------|------------|-----------------|
| 1 | `GET` | `/timeTableCreate/` | `courseId?`, `sessionId?` | Routines / terms list |
| 2 | `GET` | `/timeTableCreate/single` | `courseId?` | Routine + structure meta |
| 3 | `GET` | `/timeTableCreate/create` | `courseId`, `classSectionTermId?`, `timeTableType?` | Empty grid |
| 4 | `GET` | `/timeTableCreate/getRoutine` | `classSectionTermId` | Week cells + teachers |
| 5 | `GET` | `/timeTableCreate/getRoutineByTeacher` | `userId`, `courseId`, `sessionId`, `subjectId?` | Filter by cell teacher |

### 2. Routine lifecycle

| # | Method | Full URL | Key params | Returns / notes |
|---|--------|----------|------------|-----------------|
| 6 | `POST` | `/timeTableCreate/` | `timetableStructureCourseMapperId`, dates, `classSectionTermId` | `timeTableRoutineId` |
| 7 | `PATCH` | `/timeTableCreate/create` | Routine patch or periods array | Update routine / periods |
| 8 | `DELETE` | `/timeTableCreate/` | `timeTableRoutineId` | Soft-delete routine + cells + date-wise |
| 9 | `POST` | `/timeTableCreate/clone` | `previousRoutineId`, dates | Clone cells + teachers |
| 10 | `PATCH` | `/timeTableCreate/publish` | `timeTableRoutineId` | **Creates date-wise instances** |

### 3. Mapping (week cell)

| # | Method | Full URL | Key params | Returns / notes |
|---|--------|----------|------------|-----------------|
| 11 | `POST` | `/timeTableCreate/mapping` | Slot or `sourceTimeTableCellId` + copy | **`timeTableCellId`** |
| 12 | `GET` | `/timeTableCreate/mapping` | Body: `timeTableRoutineId` | Cells + teachers |
| 13 | `GET` | `/timeTableCreate/single/mapping` | `courseId?` | Single mapping view |
| 14 | `PATCH` | `/timeTableCreate/mapping` | `timeTableCellId`, `timeTableType` | Change cell type |
| 15 | `PATCH` | `/timeTableCreate/mapping/update-create` | Array; base `timeTableCellId` | Add/update teachers |
| 16 | `DELETE` | `/timeTableCreate/mapping` | `timeTableCellId` | Delete cell + teachers |

### 4. Grid helpers

| # | Method | Full URL | Key params | Returns / notes |
|---|--------|----------|------------|-----------------|
| 17 | `GET` | `/timeTableCreate/cellData` | `courseId`, `classSectionTermId` | `mappingData[].timeTableCellId` per teacher |
| 18 | `GET` | `/timeTableCreate/elective` | `courseId` | Elective grid (same shape) |
| 19 | `GET` | `/timeTableCreate/subjectCount` | `classSectionTermId` | Subject counts from cells |

---

## ③ `/employee` — schedule → `timeTableCellDateWiseId`

**Router:** `router/employeeRoute.js` · **Mount:** `server.js` → `/employee`  
**Start integration here for day-view** (after publish).  
**Date-wise key:** `timeTableCellDateWiseId` (`dw`).

### 1. Date-wise schedule *(integration entry)*

| # | Method | Full URL | Key params | Returns / notes |
|---|--------|----------|------------|-----------------|
| 1 | `GET` | `/employee/schedule` | `userId`, `date?`, `sessionId?`, `groupPeriods?` | **`timeTableCellDateWiseId`**, MARKED |
| 2 | `GET` | `/employee/pastSchedule` | Same as schedule | Past date-wise periods |
| 3 | `GET` | `/employee/upcomingSchedule` | — | Upcoming date-wise periods |
| 4 | `GET` | `/employee/sectionDates` | `classSectionTermId`, `subjectId`, `userId` | Date-wise period list |
| 5 | `GET` | `/employee/sectionCounts` | — | Section counts |

### 2. Week-cell subjects / courses

| # | Method | Full URL | Key params | ID |
|---|--------|----------|------------|-----|
| 6 | `GET` | `/employee/uniqueClassSectionSubjects` | `userId` | week cells |
| 7 | `GET` | `/employee/coursesFromSchedule` | — | week cells |
| 8 | `GET` | `/employee/courses` | — | teacher courses |
| 9 | `GET` | `/employee/cellData` | — | week grid — **`timeTableCellId`** |
| 10 | `GET` | `/employee/subject` | `userId`, `sessionId?`, `term?` | — |
| 11 | `GET` | `/employee/evaluation` | — | — |

### 3. Staff directory *(unchanged for cutover)*

| # | Method | Full URL |
|---|--------|----------|
| 12 | `GET` | `/employee/issuedBook` |
| 13 | `POST` | `/employee/addEmp` |
| 14 | `GET` | `/employee/` |
| 15 | `GET` | `/employee/:id` |
| 16 | `PATCH` | `/employee/:id` |
| 17 | `DELETE` | `/employee/:id` |
| 18 | `POST` | `/employee/import` |

---

## ④ `/attendance` — uses `timeTableCellDateWiseId`

**Router:** `router/attendanceRoute.js` · **Mount:** `server.js` → `/attendance`  
**Period key:** `timeTableCellDateWiseId` (`dw`) on mark / copy / batch.

### 1. Mark / update

| # | Method | Full URL | Key body / params |
|---|--------|----------|-------------------|
| 1 | `POST` | `/attendance/` | `classSectionTermId`, **`timeTableCellDateWiseId`**, `attendance[]` |
| 2 | `PATCH` | `/attendance/` | By `attendanceId` |

### 2. Copy period

| # | Method | Full URL | Key body / params |
|---|--------|----------|-------------------|
| 3 | `POST` | `/attendance/copyPeriod` | `timeTableCellDateWiseId`, `copyToTimeTableCellDateWiseId` |
| 4 | `GET` | `/attendance/copyPeriod` | Query: `timeTableCellDateWiseId` |

### 3. List / lookup

| # | Method | Full URL | Key params |
|---|--------|----------|------------|
| 5 | `GET` | `/attendance/` | List attendance |
| 6 | `GET` | `/attendance/byDate` | `date`, `classSectionTermId`, `userId` |
| 7 | `GET` | `/attendance/previous-sessions/:userId` | Prior sessions + **`dw`** |
| 8 | `GET` | `/attendance/sectionDates` | `classSectionTermId`, `subjectId`, `userId` |

### 4. Reports / batch

| # | Method | Full URL | Key params |
|---|--------|----------|------------|
| 9 | `GET` | `/attendance/studentAttendance/bulk` | `classSectionId`, `subjectId`, `userId` |
| 10 | `POST` | `/attendance/getStudentAttendance/batch` | `filters[].timeTableCellDateWiseId` |

### 5. Import

| # | Method | Full URL | Notes |
|---|--------|----------|-------|
| 11 | `POST` | `/attendance/import` | Deprecated |
| 12 | `POST` | `/attendance/excelImport` | Period header = **`timeTableCellDateWiseId`** |

---

## ⑤ `/lesson` — mapping uses `timeTableCellDateWiseId`

**Router:** `router/lessonRoute.js` · **Mount:** `server.js` → `/lesson`  
**Period key:** `timeTableCellDateWiseId` (`dw`) on map / copy.

### 1. Lesson plan CRUD

| # | Method | Full URL | Purpose |
|---|--------|----------|---------|
| 1 | `POST` | `/lesson/` | Create lesson |
| 2 | `GET` | `/lesson/` | List lessons |
| 3 | `GET` | `/lesson/simple` | Simple list |
| 4 | `GET` | `/lesson/single` | One lesson |
| 5 | `GET` | `/lesson/employee` | Employee subjects + lessons |

### 2. Topics

| # | Method | Full URL |
|---|--------|----------|
| 6 | `POST` | `/lesson/topic` |

### 3. Mapping *(date-wise period)*

| # | Method | Full URL | Key body / params |
|---|--------|----------|-------------------|
| 7 | `POST` | `/lesson/mapping` | `topicId`, **`timeTableCellDateWiseId`** |
| 8 | `POST` | `/lesson/mapping/copy` | `targets[].timeTableCellDateWiseId` |
| 9 | `GET` | `/lesson/mapping` | List mappings |
| 10 | `PATCH` | `/lesson/` | Update mapping meta |
| 11 | `PATCH` | `/lesson/mapping/:lessonMappingId` | Complete mapping |
| 12 | `DELETE` | `/lesson/mapping/:lessonMappingId` | Delete mapping |

### 4. Lecture window

| # | Method | Full URL | Key params |
|---|--------|----------|------------|
| 13 | `POST` | `/lesson/link` | Query: `lessonId`; body: `lectureWindowId` |

---

## ⑥ `/student` — roster + week timetable

**Router:** `router/studentRoute.js` · **Mount:** `server.js` → `/student`  
**Schedule cutover routes** (others in this router are unchanged).

| # | Method | Full URL | Key params | ID |
|---|--------|----------|------------|-----|
| 1 | `GET` | `/student/classSectionStudents` | **`timeTableCellDateWiseId`**, `academicYearId?` | `dw` — roster for period |
| 2 | `GET` | `/student/studentTimetable` | class section / subject context | week cells + teachers (`cell`) |

---

## Quick count

| Step | Mount | Routes listed |
|------|-------|---------------|
| ① | `/timeTable` | 13 |
| ② | `/timeTableCreate` | 19 |
| ③ | `/employee` | 18 |
| ④ | `/attendance` | 12 |
| ⑤ | `/lesson` | 13 |
| ⑥ | `/student` | 2 (schedule) |
| **Total** | | **77** |

---

## Minimal integration chain (copy-paste checklist)

```
GET  /timeTable/
POST /timeTableCreate/
POST /timeTableCreate/mapping
PATCH /timeTableCreate/publish?timeTableRoutineId=
GET  /employee/schedule?userId=
POST /attendance/
POST /lesson/mapping
GET  /student/classSectionStudents?timeTableCellDateWiseId=
```
