# Class section change — API test guide

Migration: `npm run migrate` (drops `class_sections.semester_id`)

**Rules**
- Term → `class.term` (via `class_sections.class_id`)
- `subject.term` = `class.term`
- `class_sections` has no `semester_id`
- `class.semester_id` + `students.semester_id` still exist

---

## 1. Create class + sections

**POST** `/main/class`

**Body**
```json
{
  "courseId": 42,
  "acedmicYearId": 76,
  "sessionId": 22,
  "term": 2,
  "className": "2",
  "sections": [
    { "sectionId": 16, "section": "2A" }
  ]
}
```

**Flow**
1. Find or create `semester` for course + term + year
2. Create `class` row (`term`, `semester_id`)
3. Create `class_sections` rows (`class_id` — no `semester_id`)
4. All in one transaction (rollback if any step fails)

**Check**
- Response has `semesterId`, `classId`, `sections[]`
- DB: `class_sections` has new row with `class_id` pointing to new `class`
- DB: `class_sections.semester_id` column does not exist

---

## 2. List class sections by filter

**GET** `/classSections/?sessionId=&courseId=&acedmicYearId=`

**Check**
- Rows have no `semesterId`
- Section linked to class via `class_id`

---

## 3. Class section options (dropdown)

**GET** `/options/classSections?courseId=42&term=2&sessionId=22`

**Check**
- Options filtered by `class.term` = query `term`
- No section-level `semesterId`

---

## 4. Course sections grouped

**GET** `/course/semesterWithClassSections?courseId=42&sessionId=22`

**Check**
- Sections show `term` from `classGroup`
- No `semesterId` on section object

---

## 5. Class details

**GET** `/main/class?classSectionId=&acedmicYearId=`

**Check**
- No `semesterDetail` on section
- No `semesterId` on section

---

## 6. Class specific (master view)

**GET** `/main/classSpecific?campusId=&instituteId=&acedmicYearId=&courseId=&sessionId=`

**Check**
- Sections under `courseSection`
- No sections nested under semester nodes

---

## 7. Class record (students + teachers)

**GET** `/main/classRecord?courseId=42&classSectionsId=`

**Check**
- `classSection.term` present (from `classGroup`)
- `classSection.semesterId` not on section object

---

## 8. Teacher section mapping list

**GET** `/teacher/teacherSection?sessionId=&acedmicYearId=`

**Check**
- Each row has `classGroup: { term, termType }`
- No `semesterDetail` / extra nested campus fields

---

## 9. Teacher subject list

**GET** `/teacher/teacherSubject?sessionId=&acedmicYearId=&search=`

**Check**
- All institute teachers returned
- Unmapped teachers have `employeeSubject: []`
- Search works on name, term, course name

---

## 10. Code master types

**GET** `/codeMaster/getCodesTypes`

**Check**
- Each category has non-empty `codes` when data exists
- Only current institute university (no cross-university leak)

---

## 11. Promotion — student list

**GET** `/student/promotion/list?programCourseId=42&promotionTerm=2`

**Check**
- `currentPromotionTerm` from `classGroup.term`
- `currentClassSectionId` on student

---

## 12. Promotion — next sections

**GET** `/student/promotion/available-class-section?courseId=42&term=2&classSectionId=`

**Flow**
1. Read current section → `classGroup.term`
2. Calculate next term from course
3. Return sections where `class.term` = next term

**Check**
- `classSections[]` has `term`, `semesterId` (from `class`, not section column)

---

## 13. Promote student

**POST** `/student/promoteStudent`

**Body**
```json
{
  "studentId": 1,
  "classSectionsId": 882
}
```

**Flow**
1. Validate target section vs student course / institute
2. Resolve target `semesterId` from `class.term` + course (or `class.semester_id`)
3. Update `students`, `class_student_mapper`, history

**Check**
- No `semesterId` required in body
- Student `class_sections_id` and `semester_id` updated

---

## 14. Student timetable

**GET** `/student/studentTimetable?studentId=`

**Flow**
1. Student → `classSectionsId`
2. Section → `classGroup.term`
3. Subjects where `subject.term` = `class.term` and `courseId` match
4. Timetable filtered by `classSectionsId` + subject ids

**Check**
- Does not use `students.semester_id` for subject list
- Returns formatted periods or empty array

---

## 15. Timetable create / routine

**GET** `/timeTableCreate/getRoutine?classSectionsId=`

**POST** `/timeTableCreate/`

**Check**
- Works without `class_sections.semester_id`
- Routine tied to `classSectionsId`

---

## 16. Attendance

**POST** `/attendance/`

**Body** includes `classSectionsId`

**Check**
- Mark attendance loads section without section `semesterId`

---

## 17. Exam schedule by student

**GET** `/examScheduleMapping/student?studentId=`

**Check**
- Still uses `students.semester_id` / `studentSemester` (unchanged)

---

## Quick smoke order (recommended)

1. POST `/main/class`
2. GET `/options/classSections`
3. GET `/teacher/teacherSection`
4. GET `/student/promotion/list`
5. GET `/student/promotion/available-class-section`
6. POST `/student/promoteStudent`
7. GET `/student/studentTimetable`
8. GET `/codeMaster/getCodesTypes`
