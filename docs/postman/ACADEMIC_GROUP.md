# Academic Group — API guide

Formation-only APIs for reusable student groups (teaching / activity).  
**Mount:** `/academicGroup`  
**Postman collection:** [univ-v2-academic-group.postman_collection.json](./univ-v2-academic-group.postman_collection.json)  
**Also in:** [univ-v2.postman_collection.json](./univ-v2.postman_collection.json) folder `academicGroup`  
**Auth:** Bearer `{{token}}` (tenant from `saveUserDefaults`)

### Import
1. Postman → Import → `docs/postman/univ-v2-academic-group.postman_collection.json`
2. Set collection variables: `baseurl`, `token`, `courseId`, `sessionId`, `term`, `userId`, `studentId`
3. Run folders **1 → 2 → 3 → 4** (IDs auto-saved by test scripts)

---

## Tables (4)

| Table | Purpose |
|-------|---------|
| `academic_group_scope` | Step 1 — group type, title, program/session/term, academic context |
| `academic_group` | Step 2 — name, code, capacity, draft/published (**many groups per scope**) |
| `academic_group_user` | Step 3 — faculty `userId` + `role` |
| `academic_group_student` | Step 4 — student members |

**Rule:** create a **new scope every time** you create a group (1 scope → 1 group).

---

## Enums

| Field | Values |
|-------|--------|
| `groupType` | `teaching`, `activity` |
| `selectionScope` | `program_specific`, `cross_program` |
| `academicContextType` | `course`, `activity`, `none` |
| `publishStatus` | `draft`, `published` |
| faculty `role` | `primary_faculty`, `co_faculty`, `supervisor`, `mentor`, `external_faculty`, `evaluator` |

### Context rules
| `academicContextType` | Required field |
|-----------------------|----------------|
| `course` | `contextSubjectId` (FK → `subject`) |
| `activity` | `activityName` |
| `none` | neither |

### Program-specific rules
When `selectionScope` = `program_specific`: **`courseId`**, **`sessionId`**, **`term`** are required.

---

## Wizard order (4 POSTs)

Run in order. Save IDs into collection variables.

| # | Method | Path | Saves |
|---|--------|------|-------|
| 1 | `POST` | `/academicGroup/scope` | `{{academicGroupScopeId}}` |
| 2 | `POST` | `/academicGroup` | `{{academicGroupId}}` |
| 3 | `POST` | `/academicGroup/user` | `{{academicGroupUserId}}` (optional) |
| 4 | `POST` | `/academicGroup/student` | — |

### Supporting pickers (not under `/academicGroup`)
| Purpose | API |
|---------|-----|
| Cascading course / session / year / section / term | `GET /options/studentFilters` |
| Student list for assignment | `GET /student/all?courseId=&sessionId=&term=` |
| Faculty list | `GET /academicGroup/availableUsers?academicGroupId=` |

---

## Full API list

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/academicGroup/scope` | Create scope |
| `GET` | `/academicGroup/scope/all` | All scopes with course/session names + `groups[]` |
| `GET` | `/academicGroup/scope/single?academicGroupScopeId=` | Scope detail (+ linked `groups[]`) |
| `PATCH` | `/academicGroup/scope` | Update scope |
| `DELETE` | `/academicGroup/scope?academicGroupScopeId=` | Soft-delete scope (cascades **all** groups + members) |
| `POST` | `/academicGroup` | Create group for a scope (reuse same `academicGroupScopeId`) |
| `GET` | `/academicGroup/all` | Paginated list + scope names + faculty/student print fields |
| `GET` | `/academicGroup/single?academicGroupId=` | Group + scope + users + students (print fields) |
| `PATCH` | `/academicGroup` | Update name / code / capacity / status |
| `PATCH` | `/academicGroup/publish` | Set `published` |
| `DELETE` | `/academicGroup?academicGroupId=` | Soft-delete group + members |
| `POST` | `/academicGroup/user` | Add faculty |
| `GET` | `/academicGroup/user?academicGroupId=` | Faculty list for group |
| `PATCH` | `/academicGroup/user` | Change role |
| `DELETE` | `/academicGroup/user` | Soft-remove faculty (body) |
| `GET` | `/academicGroup/availableUsers` | Teachers not already in this group (or as students) |
| `POST` | `/academicGroup/student` | Add students |
| `GET` | `/academicGroup/availableStudents` | Students matching scope, not already in this group (or as faculty) |
| `DELETE` | `/academicGroup/student` | Soft-remove students (body) |

### Timetable Academic Group APIs
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/timetableAcademicGroup/mapping` | Map structure to scope |
| `GET` | `/timetableAcademicGroup/mapping` | Filtered structure-scope course mappings |
| `GET` | `/timetableAcademicGroup/allMappings` | All structure-scope course mappings |
| `DELETE` | `/timetableAcademicGroup/mapping` | Delete structure-scope course mapping |
| `POST` | `/timetableAcademicGroup/routine` | Create routine for academic group |
| `GET` | `/timetableAcademicGroup/cascadingGroupRoutines` | Cascading scope -> group -> routines |
| `GET` | `/timetableAcademicGroup/groupRoutinesWrappedInStructure` | Routines wrapped in structure |
| `DELETE` | `/timetableAcademicGroup/routine` | Delete routine for academic group |
| `GET` | `/timetableAcademicGroup/subjectOptions` | Options list of subjects (`[{ subjectId, name }]`) filtered by `classSectionTermId` or `academicGroupId` |


### List filters (`GET /all`)
`page`, `limit`, `search`, `courseId`, `sessionId`, `term`, `groupType`, `publishStatus`

Each row includes:
- `scope` — full scope + `course` / `session` / `contextSubject` names
- `users[]` — membership + `role` + nested `user` (identity/contact) + `employee` (`employeeId`, `employeeName`, `employeeCode`, dept/campus basics)
- `students[]` — membership + nested `student` (name, enroll/scholar, contact, placement/status basics)
- `print` — flattened keys for UI/print: group header, course/session/subject names, `faculty[]`, `students[]` (name + enroll/scholar + contact), `memberCount`, `remainingCapacity`

`GET /single` returns the same shape for one group.

### Available students (`GET /availableStudents`)
Required: `academicGroupId`  
Optional: `page`, `limit`, `search`, `classSectionsId`, `year`, `term` (`1` or `1,2,3,4,5`), `academicYearId`

1. Loads scope → `courseId`, `sessionId` (and default `term` from scope when query `term` omitted)
2. Finds `class_sections` for that course+session, then `class_section_term` for related terms
3. Returns students placed on those class-section terms
4. **Excludes** anyone already in `academic_group_student` for this group, and any student whose `userId` is already in `academic_group_user`

**Response `data` extras:** `courseId`, `sessionId`, `terms`, `capacity`, `memberCount`, `remainingCapacity`

```
GET {{baseurl}}/academicGroup/availableStudents?academicGroupId=1&page=1&limit=20&term=1,2,3,4,5
```

### Available users (`GET /availableUsers`)
Required: `academicGroupId`  
Optional: `page`, `limit`, `search`, `campusId`, `subjectId`

1. Lists teachers (`employee` + `user` where `isTeacher`)
2. **Excludes** `userId`s already in `academic_group_user` for this group
3. **Excludes** `userId`s of students already in `academic_group_student` for this group

**Response:** `result[]`, `totalCount`, `page`, `limit`, `totalPages`, `academicGroupId`, `facultyMemberCount`

```
GET {{baseurl}}/academicGroup/availableUsers?academicGroupId=1&page=1&limit=20&search=
```

---

## Example bodies

### 1. Create scope
```json
{
  "groupType": "teaching",
  "title": "Dissertation",
  "selectionScope": "program_specific",
  "courseId": 34,
  "sessionId": 6,
  "term": 10,
  "academicContextType": "activity",
  "activityName": "Design Thinking Workshop"
}
```

With subject context:
```json
{
  "groupType": "teaching",
  "title": "Dissertation",
  "selectionScope": "program_specific",
  "courseId": 34,
  "sessionId": 6,
  "term": 10,
  "academicContextType": "course",
  "contextSubjectId": 114
}
```

### 2. Create group
```json
{
  "academicGroupScopeId": 1,
  "groupName": "Dissertation Group 1",
  "groupCode": "DIS-G1",
  "capacity": 10,
  "publishStatus": "draft"
}
```
Omit `groupCode` to auto-generate. Multiple groups may share the same `academicGroupScopeId`.

### 3. Add faculty
```json
{
  "academicGroupId": 1,
  "users": [
    { "userId": 56, "role": "primary_faculty" },
    { "userId": 57, "role": "co_faculty" }
  ]
}
```
Or single: `{ "academicGroupId": 1, "userId": 56, "role": "primary_faculty" }`  
At most **one** `primary_faculty` per group.

### 4. Add students
```json
{
  "academicGroupId": 1,
  "studentIds": [101, 102, 103]
}
```
Enforces `capacity` when set; rejects duplicates.

### Publish
```json
{ "academicGroupId": 1 }
```

### PATCH user role
```json
{
  "academicGroupUserId": 1,
  "role": "mentor"
}
```

### DELETE user
```json
{ "academicGroupUserId": 1 }
```
Or `{ "academicGroupId": 1, "userId": 56 }`

### DELETE students
```json
{
  "academicGroupId": 1,
  "studentIds": [101]
}
```
Or `{ "academicGroupStudentId": 1 }`

---

## Business rules (short)

1. Scope first, then group, then users, then students.
2. Multiple groups per scope (`academic_group_scope_id` is non-unique).
3. Soft deletes everywhere (`deleted_at`).
4. Delete group → soft-deletes its users and students.
5. Delete scope → cascades soft-delete of all linked groups + members.
6. Publish only from `draft`.
7. **No duplicate `studentId` in the same group** (unique DB index; re-add after delete restores the soft-deleted row).
8. **No duplicate `userId` in the same group** (unique DB index; same restore behavior).
9. At most one `primary_faculty` per group.
10. `capacity` enforced when set.
11. For `program_specific`, students must match scope `courseId` + `sessionId`.
12. Out of scope for this module: timetable / classroom routine for groups, cross-program multi-course UI.
