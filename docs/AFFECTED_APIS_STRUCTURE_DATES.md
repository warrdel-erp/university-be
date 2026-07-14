# Affected APIs — Timetable Structure Date Window

**Date:** July 2026  
**Migrations:** `20260714120000`, `20260714130000`

---

## Affected APIs

### `POST /timeTable` — create structure

**Status:** Breaking — `startingDate` / `endingDate` required

**Request**

```json
{
  "name": "Morning Schedule",
  "courseId": 42,
  "weekOff": ["Sunday"],
  "maximumPeriod": 6,
  "periodLength": 45,
  "periodGap": 5,
  "startingTime": "09:00 AM",
  "type": "Automatic",
  "isCourse": true,
  "startingDate": "2026-01-01",
  "endingDate": "2026-12-31"
}
```

| New field | Required |
|-----------|----------|
| `startingDate` | Yes (`YYYY-MM-DD`) |
| `endingDate` | Yes (`YYYY-MM-DD`, `>= startingDate`) |

**Response:** unchanged (array of created period rows). Structure dates appear on list APIs below.

---

### `PATCH /timeTable/structure` — update structure endingDate

**Status:** New

**Request**

```json
{
  "timeTableNameId": 10,
  "endingDate": "2027-06-30"
}
```

| Field | Required |
|-------|----------|
| `timeTableNameId` | Yes |
| `endingDate` | Yes (`YYYY-MM-DD`) |

**Response**

```json
{
  "timeTableNameId": 10,
  "courseId": 42,
  "sessionId": null,
  "startingDate": "2026-01-01",
  "endingDate": "2027-06-30"
}
```

Allowed even when linked routines are published. Cannot set `endingDate` before structure `startingDate` or before the latest linked routine `endingDate`.

---

### `GET /timeTable`, `GET /timeTable/all_name`, `GET /timeTable/single`

**Status:** Updated response shape

Each structure now includes:

```json
{
  "timeTableNameId": 10,
  "name": "Morning Schedule",
  "startingDate": "2026-01-01",
  "endingDate": "2026-12-31"
}
```

---

### `POST /timeTableCreate/` — create routine

**Status:** Breaking — dates required; must be inside structure window

**Request**

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
| `startingDate` | Yes | `>= structure.startingDate` |
| `endingDate` | Yes | `<= structure.endingDate` and `>= startingDate` |

Same `timeTableNameId` can be used for many routines.

**400** if dates fall outside structure window.

---

### `POST /timeTableCreate/clone`

**Status:** Updated

Clone `startingDate` / `endingDate` must fall inside the source structure window. Body unchanged.

---

### `PATCH /timeTableCreate/create` — update routine

**Status:** Updated

**Request** (unchanged fields)

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
| `isPublish = false` | Allowed; dates must stay inside structure window |
| `isPublish = true` | **Blocked** — `Published routine cannot be updated` |

---

## Frontend tasks

- [ ] Structure create: add required `startingDate` / `endingDate` fields
- [ ] Structure list/detail: show `startingDate` / `endingDate` from GET `/timeTable*`
- [ ] Structure edit: add `PATCH /timeTable/structure` to update `endingDate` (enabled even after linked routines are published)
- [ ] Routine create: require `startingDate` / `endingDate`; constrain date pickers to selected structure window
- [ ] Routine create: allow reusing the same structure (`timeTableNameId`) for multiple class section terms
- [ ] Routine edit: disable update UI when `isPublish = true`
- [ ] Routine clone: keep new dates inside structure window
- [ ] Handle 400: dates outside structure window; published routine cannot be updated
- [ ] Confirm BE migrations `20260714120000` and `20260714130000` are applied before FE release
