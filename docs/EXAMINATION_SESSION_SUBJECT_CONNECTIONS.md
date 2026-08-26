# Examination Session ↔ Subject Connections

This document describes how subjects, courses, assessment plans, and examination sessions are linked in the data model, and how list APIs should derive counts.

## Entity overview

| Model | Table | Role |
|-------|--------|------|
| `examinationSessionModel` | `examination_session` | Exam run for one assessment type + academic year |
| `examinationSessionTermModel` | `examination_session_term` | Links session → program **term numbers** (e.g. 1, 2, 4) |
| `examSetupTypeModel` | `exam_setup_type` | Assessment / exam type (`assessmentType` on session) |
| `assessmentPlanModel` | `assessment_plan` | Plan for course / session / term / regulation |
| `assessmentPlanComponentModel` | `assessment_plan_component` | Links plan ↔ `examSetupTypeId` |
| `assessmentPlanSubjectMappingModel` | `assessment_plan_subject_mapping` | **Source of truth for mapped subjects** |
| `examStructureScheduleMappingModel` | `exam_structure_schedule_mapper` | Structure/schedule metadata only (not subject mapping) |
| `examScheduleModel` | `exam_schedule` | Scheduled exam for a subject (subset of mapped subjects) |
| `classSectionTermModel` / `classSectionModel` | class section + term | Student cohort resolution (not stored on session term) |

Association aliases (existing):

- `examinationSession.assessmentType` → `examSetupType`
- `examinationSession.examinationSessionTerms` → `examinationSessionTerm`
- `assessmentPlanComponent.examSetupType` / `assessmentPlan`
- `assessmentPlanSubjectMapping.assessmentPlan`

There is **no** FK from `examination_session_term` to `class_section_term`. Cohort expansion uses `term` + session `academicYearId` at query time.

---

## Connection graph (subject → examination session)

```text
examination_session
  │
  ├─ assessmentTypeId ──────────────────────────────► exam_setup_type
  │                                                      │
  │                                                      │ examSetupTypeId
  │                                                      ▼
  │                                            assessment_plan_component
  │                                                      │
  │                                                      │ assessmentPlanId
  │                                                      ▼
  │                                               assessment_plan
  │                                                      │
  │                                                      │ assessmentPlanId
  │                                                      ▼
  │                                    assessment_plan_subject_mapping
  │                                      ├─ subjectId   ← mapped subject
  │                                      ├─ courseId
  │                                      ├─ sessionId
  │                                      └─ academicYearId
  │                                              │
  │                                              │ subject.term (via subject)
  │                                              ▼
  │                                         subject (term, courseId, …)
  │
  └─ examination_session_term
        │
        └─ term (INTEGER) ──► program term number
              │
              │ (resolve at query time via academic year)
              ▼
        class_section_term.term + class_section.acedmic_year_id
              │
              └─ classSectionsId ──► class_section
                                      ├─ courseId
                                      ├─ sessionId
                                      └─ academicYearId
```

### Intersection rule

A subject is **in scope for an examination session** when **both** are true:

1. **Plan path**  
   Session `assessmentTypeId` → `assessment_plan_component.examSetupTypeId` → `assessment_plan` → `assessment_plan_subject_mapping.subjectId`

2. **Term path**  
   Subject’s `term` is one of the session’s `examination_session_term.term` values  
   (Student/hall-ticket cohorts expand to all class section terms with those term numbers in the session’s academic year.)

This is the same rule already used by:

- `GET /examinationSession/subjects`
- `GET /examinationSession/questionPaper`
- helpers `getAssessmentPlanIds` + `findAssessmentPlanSubjectMappings`

---

## What each link is for

### 1. Assessment type → plan → subject (mapping source)

```text
exam_setup_type
  ← assessment_plan_component.examSetupTypeId
      → assessment_plan
          → assessment_plan_subject_mapping (subjectId, courseId, sessionId)
```

- **Purpose:** Which subjects are academically mapped for this exam type.
- **Used by:** Mapped-subjects APIs, eligibility/scheduling scope.

### 2. Examination session → terms (term scope)

```text
examination_session
  → examination_session_term.term
```

API create/update payload:

```json
{
  "terms": [
    { "term": 1, "includeElectives": true },
    { "term": 2 },
    { "term": 4, "remarks": "optional" }
  ]
}
```

- **Purpose:** Which program term numbers sit in this exam session.
- **Used by:** Student lists, hall tickets, student counts, filtering mapped subjects / structure.

### 3. Exam schedule (operational subset)

```text
examination_session
  → exam_schedule (subjectId, term, sessionId, slot, date, …)
```

- **Purpose:** Subjects that already have a date/slot (scheduled).
- **Not** the full mapped-subject set; unscheduled mapped subjects are excluded.

### 4. Exam structure schedule mapper (not subject mapping)

```text
exam_structure_schedule_mapper
  ├─ examSetupTypeId
  ├─ sessionId
  ├─ academicYearId
  └─ name / startingDate
```

- **Purpose:** High-level structure / schedule naming for an exam type + session.
- **Do not** use this table to count or list examination-session subjects.

---

## `GET /examinationSession` — `courseCount` today vs correct source

### Current behaviour (`buildSessionSummary`)

```text
examinationSessionTerms.term
  → class_section_term (same term + session academic year)
  → class_section
  → COUNT(DISTINCT courseId)
```

This counts **courses that have class sections for those terms**, not assessment-plan–mapped subjects.

### Recommended behaviour

Derive counts from the **intersection** above (plan mappings ∩ session terms):

| Field | Meaning | Aggregation |
|-------|---------|-------------|
| `courseCount` | Distinct courses with ≥1 mapped subject in session scope | `COUNT(DISTINCT mapping.courseId)` |
| `subjectCount` (optional) | Distinct mapped subjects in session scope | `COUNT(DISTINCT mapping.subjectId)` |

Keep `totalStudents` from whole-term counts via `countWholeTermStudentsByTerms(terms, academicYearId)`.

### Suggested query shape (DB-level, batched for list)

1. For each session row: `assessmentTypeId`, `term` numbers from `examinationSessionTerms`.
2. Resolve plan IDs:  
   `assessment_plan_component` where `examSetupTypeId IN (...)`.
3. Load `assessment_plan_subject_mapping` for those plans (join `subject` for `term` when needed).
4. Filter mappings by session term numbers.
5. Aggregate distinct `courseId` / `subjectId` per `examinationSessionId`.

Reuse existing repository helpers where possible:

- `findAssessmentPlanComponentsBySetupTypeId`
- `findAssessmentPlanSubjectMappings`
- `countWholeTermStudentsByTerms` / `expandClassSectionTermIdsByTerms` in `utility/studentCount.js`

---

## End-to-end flow (read APIs)

```text
GET /examinationSession
  → session summary
  → courseCount  [should use plan∩terms]
  → totalStudents [terms + academic year / whole-term]

GET /examinationSession/subjects
  → assessmentType → plans → subject mappings
  → filter by examinationSessionTerms.term
  → enrich with exam_schedule / rooms / teachers

GET /examinationSession/questionPaper
  → same subject set as above (scheduled / QP filters)

GET /examinationSessionSlot
  → slots + exam_schedule rows for session
  → needsScheduling uses unscheduled mapped subjects
```

---

## Foreign-key cheat sheet

| From | Field | To |
|------|--------|-----|
| `examination_session` | `assessment_type_id` | `exam_setup_type.exam_setup_type_id` |
| `examination_session_term` | `examination_session_id` | `examination_session` |
| `examination_session_term` | `term` | *(integer program term; no FK)* |
| `assessment_plan_component` | `exam_setup_type_id` | `exam_setup_type` |
| `assessment_plan_component` | `assessment_plan_id` | `assessment_plan` |
| `assessment_plan_subject_mapping` | `assessment_plan_id` | `assessment_plan` |
| `assessment_plan_subject_mapping` | `subject_id` | `subject` |
| `assessment_plan_subject_mapping` | `course_id` / `session_id` | `course` / `session` |
| `exam_structure_schedule_mapper` | `exam_setup_type_id` | `exam_setup_type` |
| `exam_schedule` | `examination_session_id` | `examination_session` |
| `exam_schedule` | `subject_id` | `subject` |

Unique: `(examination_session_id, term)` on `examination_session_term`.

---

## Implementation notes

- Prefer Sequelize `include` / `where` / `Op` / `fn` / `COUNT(DISTINCT …)` in the repository; no raw SQL unless approved.
- Tenant-scope plan and mapping models via `scoped(...)`.
- Always pass explicit `attributes`.
- Do not N+1 per session in the list API: batch by `assessmentTypeId` and term keys, then map counts back to each session.
- Preserve existing response field name `courseCount` unless the frontend explicitly wants `subjectCount` added.
- Migration: `migrations/20260826153000-examination-session-term-replace-cst-with-term.cjs`

---

## Related code

- Service: `services/examinationSessionServices.js` — `buildSessionSummary`, `getAssessmentPlanIds`, `getMappedSubjectsBySessionAndTerm`
- Repository: `repository/examinationSessionRepository.js` — plan components, subject mappings, session terms
- Models:  
  `examinationSessionModel.js`, `examinationSessionTermModel.js`,  
  `examSetupTypeModel.js`, `assessmentPlanModel.js`,  
  `assessmentPlanComponentModel.js`, `assessmentPlanSubjectMappingModel.js`,  
  `examStructureScheduleMappingModel.js`, `examScheduleModel.js`
