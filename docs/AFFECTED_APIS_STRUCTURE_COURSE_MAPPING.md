# Affected APIs — Structure Course Mapping

**Date:** July 2026  
**Migrations:**
- `20260715173000-remove-course-id-from-time-table-structure.cjs`
- `20260715180000-create-time-table-structure-course.cjs`
- `20260715190000-add-mapper-id-to-time-table-routine.cjs`
- `20260715191000-remove-name-id-and-paranoid-from-routine.cjs`
- `20260715192000-mapping-unique-by-structure-course-session.cjs`

**Audience:** Backend + Frontend

---

## Summary

Date window and course binding move off `time_table_structure` onto a new mapping table.

```
time_table_structure              ← bell template only (no course, no dates)
  ├── time_table_structure_periods
  ├── time_table_structure_course ← (timeTableNameId + courseId + sessionId + startingDate/endingDate)
  └── time_table_routine          ← dates must sit inside mapping window for that course+session
          └── class_schedule_item ← cells (unchanged)
```

| Layer | `courseId` | `startingDate` / `endingDate` | Soft delete |
|-------|------------|-------------------------------|-------------|
| `time_table_structure` | **Removed** | **Removed** | **Removed** (`paranoid: false`) |
| `time_table_structure_course` | Yes (+ required `sessionId`) | Yes (allowed window) | No (`paranoid: false`) |
| `time_table_routine` | Yes | Yes (must be inside window) | No soft delete — FK `timetableStructureCourseMapperId` only (no `timeTableNameId`) |
| `class_schedule_item` | No | No | Unchanged |

One structure may have many mappings for different `(courseId, sessionId)` pairs.

**Scope fields on course mapping:**  
`universityId`, `instituteId`, `academicYearId` (from structure) + required `sessionId` (from request)

**Write flow:**  
`POST /timeTable` → `POST /timeTable/courseMapping` → `POST /timeTableCreate/` → `POST /timeTableCreate/mapping` → `PATCH /timeTableCreate/publish`

---

## API list

| Method | Path | Status |
|--------|------|--------|
| `POST` | `/timeTable` | **Breaking** — remove `startingDate` / `endingDate` / `courseId` |
| `POST` | `/timeTable/courseMapping` | **New** — map course + session + date window to structure |
| `PATCH` | `/timeTable/structure` | **Breaking** — keyed by mapper id; can change structure/course/session/dates |
| `GET` | `/timeTable` | **Updated** — dates on `courseMappings[]`, not structure root |
| `GET` | `/timeTable/single` | **Updated** — one structure by `timeTableNameId` query |
| `POST` | `/timeTableCreate/` | **Updated** — dates vs **structure–course** window (not structure) |
| `POST` | `/timeTableCreate/clone` | **Updated** — same window rule |
| `PATCH` | `/timeTableCreate/create` | **Updated** — same window rule; still blocked when published |
| `POST` | `/timeTableCreate/mapping` | Unchanged contract |
| `PATCH` | `/timeTableCreate/publish` | Unchanged |

Unaffected structure period APIs: `POST /timeTable/period`, `PATCH /timeTable`, `DELETE /timeTable`.

---

## Affected APIs

### `POST /timeTable` — create structure

**Status:** Breaking

Create structure + period rows only. **Do not send** `courseId`, `startingDate`, or `endingDate`.

**Request**

```json
{
  "name": "Morning Schedule",
  "weekOff": ["Sunday"],
  "maximumPeriod": 6,
  "type": "Automatic",
  "isCourse": true
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Structure name |
| `maximumPeriod` | Yes | Period rows to create |
| `type` | Yes | `Automatic` \| `Manual` |
| `periodLength` | Yes* | Required for Automatic |
| `periodGap` | Yes* | Required for Automatic |
| `startingTime` | Yes* | Required for Automatic |
| `weekOff` | No | e.g. `["Sunday"]` |
| `isCourse` | No | Flag on generated period rows |

`universityId` / `instituteId` / `academicYearId` come from auth scope.

**Do not send** `courseId`, `sessionId`, `startingDate`, or `endingDate` — those go on course mapping.

**Next step:** call `POST /timeTable/courseMapping` before creating routines for a course.

---

### `POST /timeTable/courseMapping` — map course + session + dates

**Status:** New

Required once per `(timeTableNameId, courseId, sessionId)` before routines for that course/session.

**Request**

```json
{
  "timeTableNameId": 10,
  "courseId": 34,
  "sessionId": 6,
  "startingDate": "2026-01-01",
  "endingDate": "2026-12-31"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `timeTableNameId` | Yes | Structure PK |
| `courseId` | Yes | Course PK |
| `sessionId` | Yes | Session PK (same structure may map many sessions) |
| `startingDate` | Yes | `YYYY-MM-DD` |
| `endingDate` | Yes | `YYYY-MM-DD`, `>= startingDate` |

Copies from structure on create: `universityId`, `instituteId`, `academicYearId`.

**400** if mapping already exists or structure not in scope.

---

### `PATCH /timeTable/structure` — update course mapping

**Status:** Breaking — keyed by mapper PK; structure/course/session/dates are all changeable

**Request**

```json
{
  "timetableStructureCourseMapperId": 1,
  "timeTableNameId": 10,
  "courseId": 34,
  "sessionId": 6,
  "startingDate": "2026-01-01",
  "endingDate": "2027-06-30"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `timetableStructureCourseMapperId` | Yes | Mapping PK |
| `timeTableNameId` | No | Move mapping to another structure |
| `courseId` | No | Change course (cascades to linked routines) |
| `sessionId` | No | Change session |
| `startingDate` | No | Window start |
| `endingDate` | No | Window end |

At least one updatable field is required.

**Rules**
- Mapping must already exist
- Unique `(timeTableNameId, courseId, sessionId)` must not collide with another row
- `endingDate >= startingDate` (effective values)
- Cannot shrink past min/max routine dates for this mapper
- Allowed even when linked routines are published

---

### `GET /timeTable`

**Status:** Updated response shape

Lists all structures in scope. Structure root has no dates/`courseId`/`sessionId`. Each item includes `courseMappings[]`.

### `GET /timeTable/single?timeTableNameId=`

**Status:** Updated — returns one structure

**Query:** `timeTableNameId` (required)

Same shape as one list item (periods + `courseMappings[]`).

```json
{
  "timeTableNameId": 10,
  "name": "Morning Schedule",
  "universityId": 4,
  "instituteId": 12,
  "academicYearId": 59,
  "courseMappings": [
    {
      "timetableStructureCourseMapperId": 1,
      "timeTableNameId": 10,
      "courseId": 34,
      "universityId": 4,
      "instituteId": 12,
      "academicYearId": 59,
      "sessionId": 6,
      "startingDate": "2026-01-01",
      "endingDate": "2026-12-31",
      "course": {
        "courseId": 34,
        "courseName": "B.Tech CSE",
        "courseCode": "CSE"
      }
    }
  ],
  "timeTableName": [ /* period rows */ ]
}
```

FE date pickers for a course must use the matching `courseMappings` entry (by `courseId` + `sessionId`), not the structure root.

---

### `POST /timeTableCreate/` — create routine

**Status:** Updated validation target

Request body shape is unchanged. Date window is now the **structure–course mapping** for the resolved `courseId`.

```json
{
  "timeTableNameId": 10,
  "classSectionTermId": 101,
  "campusId": 1,
  "timeTableType": "normal",
  "startingDate": "2026-01-01",
  "endingDate": "2026-06-30"
}
```

| Field | Required | Rule |
|-------|----------|------|
| `timeTableNameId` | Yes | Structure PK |
| `classSectionTermId` | Yes for `normal` | Supplies `courseId` |
| `startingDate` | Yes | `>= courseMapping.startingDate` |
| `endingDate` | Yes | `<= courseMapping.endingDate` |

**400** if course mapping missing, or dates outside mapping window, or overlap on same `classSectionTermId`.

Server sets `timetableStructureCourseMapperId` from `(timeTableNameId, courseId)` — clients do not send it.

---

### `POST /timeTableCreate/clone`

**Status:** Updated

New clone dates must fall inside the structure–course mapping for the source routine’s `courseId`. Body unchanged.

---

### `PATCH /timeTableCreate/create` — update routine

**Status:** Updated

```json
{
  "timeTableRoutineId": 55,
  "startingDate": "2026-02-01",
  "endingDate": "2026-06-30",
  "classSectionTermId": 101
}
```

| Condition | Behavior |
|-----------|----------|
| `isPublish = false` | Allowed; dates must stay inside mapping window |
| `isPublish = true` | **Blocked** — `Published routine cannot be updated` |

To extend the overall window after publish, use `PATCH /timeTable/structure` (with `courseId`).

---

### `POST /timeTableCreate/mapping` — write cells

**Status:** Unchanged contract

Still writes `class_schedule_item` with:

- `timeTableNameId`
- `timeTableRoutineId`
- `timeTableCreationId`
- `day` / `period` / teacher / subject / room fields

No direct dependency on the new mapping table (inherits validity via routine).

---

## Frontend checklist

- [ ] Structure create: remove `startingDate` / `endingDate` / `courseId` from `POST /timeTable`
- [ ] After structure create: call `POST /timeTable/courseMapping` (include `sessionId`) before routine create
- [ ] Structure list: read dates from `courseMappings[]` (match by `courseId` + `sessionId`)
- [ ] Mapping edit: `PATCH /timeTable/structure` sends `timetableStructureCourseMapperId`; may change structure/course/session/dates
- [ ] Routine create: constrain date pickers to selected `(timeTableNameId, courseId, sessionId)` mapping window
- [ ] Handle 400 when course mapping is missing (“map the course to this structure with dates first”)
- [ ] Routine edit: still disable when `isPublish = true`
- [ ] Do not expect `deletedAt` / soft-delete on structure or structure-course mapping

---

## Data notes

- Unique: one row per `(time_table_name_id, course_id, session_id)` on `time_table_structure_course`
- Migration backfills mappings from old structure dates × distinct routine `course_id`s, then drops structure `starting_date` / `ending_date` / `deleted_at`
- `course_id` already removed from structure by `20260715173000`
- `20260715190000` adds `timetable_structure_course_mapper_id` on `time_table_routine` (backfilled from structure–course rows)
- `20260715191000` removes `time_table_name_id` and `deleted_at` from `time_table_routine` (hard delete only; structure via mapper)
- `20260715192000` upgrades older unique `(structure, course)` to `(structure, course, session)` and forces `session_id` NOT NULL
- `20260715200000` removes `session_id` from `time_table_structure` (session only on mapper)
