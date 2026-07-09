# Affected APIs — Section master table removal

The standalone `section` table (section master) is removed. Section names live only on `class_sections.section` (string). Placement keys remain `classSectionTermId` / `classSectionsId`.

Run migration: `20260701120000-remove-section-master-table.cjs`

---

## Removed APIs (no replacement)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/section` | Create section master |
| GET | `/section` | List section master |
| GET | `/section/single` | Get one section master |
| PATCH | `/section` | Update section master |
| DELETE | `/section` | Delete section master |

**Frontend:** Remove section-master CRUD screens and any flow that picks `sectionId` before creating class sections.

---

## Write API change

### `POST /main/classSections`

**Before**

```json
{
  "courseId": 1,
  "sessionId": 2,
  "sections": [
    { "sectionId": 16, "section": "A1", "year": 1 }
  ]
}
```

**After**

```json
{
  "courseId": 1,
  "sessionId": 2,
  "section": "A1",
  "year": 1
}
```

- One class section row per request (not an array).
- `section` is the display name stored on `class_sections`.
- Backend still creates all `class_section_term` rows for that program year.
- Response is a single object (not `{ sections: [...] }`):

```json
{
  "classSectionsId": 42,
  "courseId": 1,
  "sessionId": 2,
  "section": "A1",
  "year": 1,
  "terms": [
    { "classSectionTermId": 100, "term": 1 },
    { "classSectionTermId": 101, "term": 2 }
  ]
}
```

---

## Response shape changes (field removed)

These APIs no longer return master **`sectionId`** on nested `class_sections` / `classSection` objects. Use **`section`** (string) and **`classSectionsId`** instead.

| Method | Path | Change |
|--------|------|--------|
| POST | `/main/classSections` | See write change above |
| GET | `/main/classSections` | No `sectionId` on section rows |
| GET | `/main/classSectionSpecific` | No `sectionId` on `courseSection` |
| GET | `/main/classSectionRecord` | Unchanged (already uses `section` + `classSectionTermId`) |
| GET | `/timeTableCreate/` | No `sectionId` in class section attrs |
| GET | `/timeTableCreate/routine` | No `sectionId` in nested class section |
| GET | `/timeTableCreate/mapping` | No `sectionId` in nested class section |
| GET | `/timeTable/` | No `sectionId` where class section is included |
| GET | `/lesson/*` | No `section_id` in class section attributes |

---

## Minimal or no frontend change

| Method | Path | Notes |
|--------|------|--------|
| GET | `/options/classSections` | Already returns `name` / `section` + `classSectionTermId` |
| GET | `/options/courseProgram?courseId=` | Unrelated to section master |
| GET | `/course/termsWithClassSections` | Uses `name` + `classSectionsId` |
| POST | `/student/import` | Uses `classSectionTermId` |
| GET/POST | `/student/*` | Placement via `classSectionTermId` |
| GET | `/employee/sectionDates` | “Section” = timetable/class context, not master table |
| GET | `/attendance/sectionDates` | Same as above |

**Note:** `userServices` may still expose `sectionId` as an alias for `classSectionsId` in some profile payloads — that is **not** the removed master `section.section_id`.

---

## Database

| Item | Action |
|------|--------|
| `section` table | Dropped |
| `class_sections.section_id` FK | Dropped |
| `class_sections.section` | Required string; backfilled from `section.section_name` in migration |

Uniqueness for create: `(courseId, sessionId, section, year)` on `class_sections`.

---

## Deployment checklist

1. Run migration `20260701120000-remove-section-master-table.cjs`.
2. Deploy backend (section routes removed from `server.js`).
3. Update create-class-section UI to flat `POST /main/classSections` body.
4. Remove section-master admin UI and `sectionId` from API clients.
5. Re-test timetable, student import, and options dropdowns.
