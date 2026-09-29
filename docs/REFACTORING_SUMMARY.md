# Architecture & Refactoring Summary: Assessment Plan & Examination Session

## Overview
This document outlines all recent structural, database, model, service, and API updates made to decouple legacy dependencies and modernize the data relationships between **Assessment Plans**, **Batches**, **Curriculum Subjects**, and **Examination Sessions**.

---

## 1. Key Objectives & Architectural Changes
1. **Decouple Assessment Plan Subject Mappings from Legacy Composite Keys:**
   - Previously, `assessment_plan_subject_mapping` stored `course_id`, `session_id`, and `curriculum_batch_term_mapping_id`.
   - Now, it directly connects via `batch_id` (referencing `batches`) and `curriculum_subject_term_mapping_id` (referencing `curriculum_subject_term_mapping`).
   - Course, Session, and Term are dynamically resolved via `batch.sessionId -> session.courseId` and `curriculumSubjectTermMapping.curriculumId -> curriculum.courseId` & `curriculumSubjectTermMapping.term`.
2. **Remove `academicYearId` (`acedmic_year_id`) Dependencies:**
   - Removed `academicYearId` from `examination_session`, `examination_session_slot`, `examination_session_term`, and `assessment_plan`.
   - Academic context is inherited directly from the associated Session/Batch structure.
3. **Preserve Exact API Contracts:**
   - All response payloads and shapes remain 100% backward compatible for the Frontend.

---

## 2. Database Migrations

### 2.1 Assessment Plan Subject Mapping Refactor
* **Migration 1 (`migrations/20260928193000-add-batch-and-cstm-to-assessment-plan-subject-mapping.cjs`):**
  - Added `batch_id` (`BIGINT`, references `batches(id)`, `ON UPDATE CASCADE`, `ON DELETE CASCADE`).
  - Added `curriculum_subject_term_mapping_id` (`BIGINT`, references `curriculum_subject_term_mapping(id)`, `ON UPDATE CASCADE`, `ON DELETE CASCADE`).
  - Added indexes: `idx_apsm_batch_id`, `idx_apsm_cstm_id`.

* **Migration 2 (`migrations/20260928194000-remove-course-session-and-cbtm-from-apsm.cjs`):**
  - Dropped foreign keys & indexes on legacy columns `course_id`, `session_id`, `curriculum_batch_term_mapping_id`.
  - Dropped columns `course_id`, `session_id`, `curriculum_batch_term_mapping_id`.
  - Dropped old unique constraint `unique_assessment_plan_subject_mapping`.
  - Added unique index `unique_batch_cstm_plan` on `(assessment_plan_id, batch_id, curriculum_subject_term_mapping_id, deleted_at)`.

### 2.3 Exam Schedule Refactor & Academic Year, CBTM, Session Removal
* **Migration 4 (`migrations/20260928210000-update-exam-schedule-batch-cstm-remove-academic-year.cjs`):**
  - Added `batch_id` (`INT`, references `batch(batch_id)`, `allowNull: true`).
  - Added `curriculum_subject_term_mapping_id` (`INT`, references `curriculum_subject_term_mapping(curriculum_subject_term_mapping_id)`, `allowNull: true`).
  - Added indexes: `idx_exam_schedule_batch_id`, `idx_exam_schedule_cstm_id`.
  - Dropped foreign keys (`exam_schedule_acedmic_year_id_foreign_idx`, `exam_schedule_ibfk_1`) and indexes on `acedmic_year_id`.
  - Dropped column `acedmic_year_id` from `exam_schedule`.

* **Migration 5 (`migrations/20260928211000-remove-cbtm-and-session-from-exam-schedule.cjs`):**
  - **Data Seeding & Backfill:**
    - Seeded `batch_id` by matching `curriculum_batch_term_mapping`, `batch` on `session_id`, and `examination_session_term` on `examination_session_id`.
    - Seeded `curriculum_subject_term_mapping_id` by matching `curriculum_subject_term_mapping` on `subject_id` and `term`.
  - Dropped foreign keys (`exam_schedule_ibfk_2`, `exam_schedule_session_id_foreign_idx`, `fk_exam_schedule_curriculum_batch_term_mapping`).
  - Dropped indexes on `session_id` and `curriculum_batch_term_mapping_id`.
  - Dropped columns `session_id` and `curriculum_batch_term_mapping_id` from `exam_schedule`.

---

## 3. Models & Associations

### 3.1 [`models/assessmentPlanSubjectMappingModel.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/models/assessmentPlanSubjectMappingModel.js)
- **Columns:** `id`, `assessmentPlanId`, `batchId`, `curriculumSubjectTermMappingId`, `universityId`, `instituteId`, `status`.
- **Scope config:** `{ university: true, institute: true }`.

### 3.2 [`models/examScheduleModel.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/models/examScheduleModel.js)
- **Columns:** Added `batchId` (`batch_id`), `curriculumSubjectTermMappingId` (`curriculum_subject_term_mapping_id`); removed `academicYearId` (`acedmic_year_id`), `sessionId` (`session_id`), and `curriculumBatchTermMappingId` (`curriculum_batch_term_mapping_id`).
- **Scope config:** `{ university: true, institute: true, academicYear: false }`.

### 3.3 [`models/index.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/models/index.js)
- Associated `assessmentPlanSubjectMappingModel` to `batchModel` and `curriculumSubjectTermMappingModel`.
- Associated `examScheduleModel` to `batchModel`:
  ```javascript
  examScheduleModel.belongsTo(batchModel, {
    foreignKey: "batchId",
    as: "batch",
  });
  batchModel.hasMany(examScheduleModel, {
    foreignKey: "batchId",
    as: "examSchedules",
  });
  ```
- Associated `examScheduleModel` to `curriculumSubjectTermMappingModel`:
  ```javascript
  examScheduleModel.belongsTo(curriculumSubjectTermMappingModel, {
    foreignKey: "curriculumSubjectTermMappingId",
    as: "curriculumSubjectTermMapping",
  });
  curriculumSubjectTermMappingModel.hasMany(examScheduleModel, {
    foreignKey: "curriculumSubjectTermMappingId",
    as: "examSchedules",
  });
  ```
- Removed obsolete `acedmicYearModel`, `sessionModel`, and `curriculumBatchTermMappingModel` associations from `examScheduleModel`.

### 3.4 Examination Session Models
- [`models/examinationSessionModel.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/models/examinationSessionModel.js), [`models/examinationSessionSlotModel.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/models/examinationSessionSlotModel.js), and [`models/examinationSessionTermModel.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/models/examinationSessionTermModel.js):
  - Removed `academicYearId` property and definition.
  - Set `scopeConfig = { university: true, institute: true }`.

---

## 4. Repositories & Services

### 4.1 Assessment Plan Overview & Courses
- **[`repository/assessmentPlanRepository.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/assessmentPlanRepository.js):**
  - `findAssignedSubjectMappings(assessmentPlanId)`: Queries `assessmentPlanSubjectMappingModel` including `batchModel` (with `sessionModel` and `courseModel`) and `curriculumSubjectTermMappingModel` (with `curriculumModel` and `subjectModel`).
  - `getBatchCoursesWithSessions()`: Direct traversal from `batchModel` to `sessionModel` and `courseModel` without redundant multiple nested joins.
- **[`services/assessmentPlanService.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/assessmentPlanService.js):**
  - `getCourseAssessmentPlanOverview`: Re-engineered data grouping logic to aggregate mapped subjects per Course, Session, and Term from `batch` and `curriculumSubjectTermMapping` while preserving the exact response output format.

### 4.2 Examination Sessions & Class Section Terms
- **[`repository/examinationSessionRepository.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/examinationSessionRepository.js):**
  - Removed `academicYear` include from `sessionInclude`.
  - `findExaminationSessionAssessmentTypeById`: Removed `academicYearId` from attributes list.
  - `findAssessmentPlanSubjectMappings`: Joins `batchModel` (with `session`) and `curriculumSubjectTermMappingModel` (with `curriculum` & `subject`) to identify active assessment plans.
  - `findMappedSubjectIdsForCourseSessionTerm`: Filter logic updated to match through `batch.session.courseId`, `batch.session.id`, and `curriculumSubjectTermMapping.term`.
- **[`services/examinationSessionServices.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/examinationSessionServices.js):**
  - `createExaminationSession`: Creates sessions and term mappings without `academicYearId`.
  - `updateExaminationSession`: Updates sessions without `academicYearId`.
  - `getExaminationSessions`: Returns session listings without `academicYearId`.
  - `getClassSectionTermsBySetupType`: Resolves subjects mapped to assessment plans via the updated `batchId` and `curriculumSubjectTermMappingId` hierarchy.

### 4.3 Exam Schedules & Structure Schedule Mappings
- **[`repository/examScheduleRepository.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/examScheduleRepository.js):**
  - Replaced `acedmicYearSchedule` includes with `batch` and `curriculumSubjectTermMapping` in `getExamSchedules` and `getExamScheduleById`.
- **[`repository/examStructureScheduleMappingRepository.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/examStructureScheduleMappingRepository.js):**
  - Replaced `acedmicYearSchedule` include with `batch` in `getExamScheduleById`.
  - Updated `findConflictingExamForStudentCohort` to check conflicts with `batchId` / `sessionId` join.
  - Updated `findScopedExamScheduleById` to query `batchId` and `curriculumSubjectTermMappingId`.
- **[`services/examStructureScheduleMappingServices.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/examStructureScheduleMappingServices.js):**
  - Added `resolveBatchAndCurriculumSubjectTerm` helper to resolve `term`, `courseId`, `sessionId`, `subjectId` from `batchId` and `curriculumSubjectTermMappingId`.
  - Updated `addExamSchedule`, `updateExamSchedule`, and `assertUniqueExamScheduleMapping` to work seamlessly with `batchId` and `curriculumSubjectTermMappingId`.

---

## 5. Routes & Schemas
- **[`router/assessmentPlanRoute.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/assessmentPlanRoute.js):**
  - Removed `academicYearId` from `overviewQuerySchema`.
- **[`router/examinationSessionRoute.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/examinationSessionRoute.js):**
  - Removed `academicYearId` from `createSessionSchema`, `updateSessionSchema`, and `getSessionsSchema`.
- **[`router/examScheduleRoute.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/examScheduleRoute.js):**
  - Added `batchId` and `curriculumSubjectTermMappingId` to `getExamScheduleStudentsSchema`.
- **[`router/examStructureScheduleMappingRoute.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/examStructureScheduleMappingRoute.js):**
  - Updated `addScheduleSchema` and `updateScheduleSchema` to use `batchId`, `curriculumSubjectTermMappingId`, and `examinationSessionId`.
- **[`router/examinationSessionSlotRoute.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/examinationSessionSlotRoute.js):**
  - Updated `getSlotsSchema` to validate `selections: [{ batchId, terms }]` via `selectionsSchema`.
- **[`router/studentHallTicketRoute.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/studentHallTicketRoute.js):**
  - Updated `reviewFilterStudentsSchema` and `sessionStudentsQuerySchema` to validate `selections: [{ batchId, terms }]` via `selectionsSchema`.
- **[`utility/examZodSchemas.js`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/utility/examZodSchemas.js):**
  - Cleaned up `selectionItemSchema` to strictly accept `{ batchId, terms }`.
  - Removed deprecated `courseSessionMappingId`, `courseId`, `sessionId`, and `term` keys.

---

## 6. API Endpoints & Verification

### 6.1 Assessment Plan Endpoints
| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/assessmentPlan/batchCoursesSessions` | Get batch courses with admission sessions | Verified |
| `POST` | `/assessmentPlan` | Create assessment plan with components | Verified |
| `GET` | `/assessmentPlan` | List assessment plans | Verified |
| `GET` | `/assessmentPlan/overview` | Course assessment plan overview (via batchId & term) | Verified |
| `GET` | `/assessmentPlan/stats` | Assessment plan statistics | Verified |
| `GET` | `/assessmentPlan/:assessmentPlanId` | Get assessment plan by ID | Verified |
| `PATCH` | `/assessmentPlan/:assessmentPlanId` | Update assessment plan by ID | Verified |
| `DELETE` | `/assessmentPlan/:assessmentPlanId` | Delete assessment plan by ID | Verified |
| `POST` | `/assessmentPlan/component` | Create assessment plan component | Verified |
| `PATCH` | `/assessmentPlan/component/:assessmentPlanComponentId` | Update assessment plan component | Verified |
| `DELETE` | `/assessmentPlan/component/:assessmentPlanComponentId` | Delete assessment plan component | Verified |
| `POST` | `/assessmentPlan/subjectMapping` | Create assessment plan subject mapping | Verified |
| `GET` | `/assessmentPlan/subjectMapping` | Get assessment plan subject mappings | Verified |
| `DELETE` | `/assessmentPlan/subjectMapping/:mappingId` | Delete assessment plan subject mapping | Verified |

### 6.2 Examination Session Endpoints
| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/examinationSession/classSectionTerms` | Get class section terms filtered by assessment setup type | Verified |
| `GET` | `/examinationSession/structure` | Hierarchical filter structure (Course -> Session -> Terms -> Subjects) via CSTM and Batch | Verified |
| `GET` | `/examinationSession/subjects` | Get mapped subjects by session & term with selections (`batchId`, `terms`, `courseId`, `sessionId`) | Verified |
| `GET` | `/examinationSession` | List examination sessions | Verified |
| `GET` | `/examinationSession/single` | Get examination session by ID | Verified |
| `POST` | `/examinationSession` | Create examination session (no academicYearId) | Verified |
| `PATCH` | `/examinationSession` | Update examination session (no academicYearId) | Verified |
| `POST` | `/examinationSession/term` | Add term to examination session (via batchId & term) | Verified |
| `DELETE` | `/examinationSession/term` | Remove term from examination session (via batchId & term) | Verified |
| `POST` | `/examinationSession/publish` | Publish examination session | Verified |

### 6.3 Exam Schedule & Structure Mapping Endpoints
| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/examSchedule` | Get exam schedules with room capacities and batch / CSTM info | Verified |
| `GET` | `/examSchedule/:id` | Get exam schedule by ID | Verified |
| `GET` | `/examSchedule/availableRooms` | Get available rooms for exam schedule | Verified |
| `GET` | `/examSchedule/roomAssignments` | Get assigned rooms for exam schedule | Verified |
| `POST` | `/examStructureScheduleMapping/schedule` | Create exam schedule using batchId & curriculumSubjectTermMappingId | Verified |
| `PATCH` | `/examStructureScheduleMapping/schedule` | Update exam schedule using batchId & curriculumSubjectTermMappingId | Verified |
### 6.4 Student Hall Ticket Endpoints
| Method | Endpoint | Description | Status |
|---|---|---|---|
| `POST` | `/studentHallTicket/publish` | Publish hall tickets (all or specific student IDs) | Verified |
| `GET` | `/studentHallTicket` | List hall tickets with student batch, session, and course details | Verified |
| `GET` | `/studentHallTicket/:id` | Get complete hall ticket with student, batch, schedules, room seating | Verified |
| `GET` | `/studentHallTicket/byQr` | Get hall ticket by QR code | Verified |
| `POST` | `/studentHallTicket/generate` | Generate / regenerate student hall tickets | Verified |
| `POST` | `/studentHallTicket/markAsEligible` | Approve / override student eligibility | Verified |
| `GET` | `/studentHallTicket/sessionStudents/:examinationSessionId` | Get students with eligibility & batch info for exam session | Verified |
| `GET` | `/studentHallTicket/reviewFilterStudents` | Filter review-required students with selections (`batchId`, `terms`) | Verified |
| `PATCH` | `/studentHallTicket/block/:id` | Block / cancel generated hall ticket | Verified |

---

## 7. Postman Collection
Updated [`docs/postman/examination.postman_collection.json`](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/docs/postman/examination.postman_collection.json) (`name: "examination"`) to include full, chronological request payloads organized into 6 flow folders:
1. **Assessment Plan** (Courses/Sessions, List, Overview by Batch & CSTM, Create/Get/Delete Subject Mappings)
2. **Examination Session** (Setup Terms, Examination Structure, Create/Update/List/Single Sessions, Mapped Subjects with Batch Selections, Publish Session)
3. **Examination Session Slots** (Create, Update, List with Selections, Single, Count, Delete)
4. **Exam Structure Schedule Mapping & Schedules** (Create/Update/Delete Schedule Mappings with Batch & CSTM, List/Single Schedules, Schedule Students)
5. **Room & Seating Allocation** (Available Rooms, Assign Room Capacity, Room Assignments, Update/Delete Room Capacity, Random/Ascending/Descending Seat Allocation)
6. **Student Hall Ticket** (Session Students, Review Reasons Filters, Student Eligibility/Review Details, Eligibility Overview, Summary, Mark as Eligible, Generate, Publish, List, Get by ID, Get by QR, Block)

