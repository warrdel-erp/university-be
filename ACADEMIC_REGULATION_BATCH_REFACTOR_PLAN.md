# Academic Regulation Refactoring Plan: Migrating to `batchId`

## 1. Overview & Objectives
Migrate the Academic Regulation system and its mapping from `(courseId, sessionId)` and `academicYearId` to `batchId`.

### Key Requirements
1. **Academic Regulation Model (`academicRegulationModel.js`)**:
   - `academicYearId` (`acedmic_year_id`) removed.
   - Direct `batchId` column omitted/removed per instruction (the mapping table maintains `batchId`).
2. **Academic Regulation Mapping Model (`academicRegulationCourseMappingModel.js`)**:
   - Maintains `batchId` (referencing `batch.batch_id`).
   - `courseId` and `sessionId` removed.
3. **Cardinality & Relationships**:
   - `one batchId + multiple regulation possible` AND `multiple batchId + one regulation both are allowed` (N:M Many-to-Many).
   - Mapping table `academic_regulation_course_mapping` stores `(academic_regulation_id, batch_id)` with composite unique index.
4. **Execution Sequence**:
   - Step 1: Add `batchId` column to mapping table in DB.
   - Step 2: Backfill `batchId` from existing `courseId` and `sessionId`.
   - Step 3: Remove `courseId` and `sessionId` from mapping table and `academicYearId` from regulation table.
   - Step 4: Drop `batch_id` from regulation table if previously added.
   - Step 5: Update models, associations, repositories, services, controllers, and routes one by one.

---

## 2. Potential Crashes Identified (12 Files / 6 Functional Areas)

| Area | File | Cause of Crash | Severity |
|------|------|----------------|----------|
| **Sequelize Associations** | `models/index.js` | BelongsTo / HasMany with `courseId`, `sessionId`, `academicYearId` | **CRITICAL** (boot/query failure) |
| **Regulation Repo** | `repository/academicRegulationRepository.js` | Queries / includes for `academicYearId`, `courseId`, `sessionId` | **HIGH** (all regulation CRUD breaks) |
| **Regulation Service** | `services/academicRegulationService.js` | Reading/writing `academicYearId`, outdated payload destructs | **HIGH** |
| **Regulation Router** | `router/academicRegulationRoute.js` | Zod validation rejects requests without `courseId`/`sessionId` | **HIGH** (400 validation error) |
| **Batch Flow** | `repository/batchRepository.js`, `services/batchService.js` | Traverses `session.regulationCourseMappings` by `courseId` | **MEDIUM** (regulation status broken) |
| **Course Flow** | `repository/courseRepository.js`, `services/courseService.js` | Selects `academicYearId`, `courseId`, `sessionId` | **MEDIUM** (SQL column missing error) |
| **Previous Academic** | `repository/previousAcademicRepository.js`, `services/previousAcademicService.js` | `findAcademicRegulationForCourse` queries `courseId`/`sessionId` | **HIGH** (term result evaluation fails) |

---

## 3. Detailed Task Checklist

### Phase 1: Database Migrations
- [x] **Task 1.1**: Create migration to add `batch_id` to `academic_regulation` and `academic_regulation_course_mapping`.
- [x] **Task 1.2**: Create migration to backfill `batch_id` using `session_id` -> `batch.session_id`.
- [x] **Task 1.3**: Create migration to drop `course_id` and `session_id` from mapping table, and drop `acedmic_year_id` from regulation table.
- [x] **Task 1.4**: Create migration to drop `batch_id` from `academic_regulation` table.

### Phase 2: Core Models & Associations
- [x] **Task 2.1**: Update `models/academicRegulationModel.js` (remove `academicYearId` and direct `batchId`, remove unused imports).
- [x] **Task 2.2**: Update `models/academicRegulationCourseMappingModel.js` (maintain `batchId`, remove `courseId` and `sessionId`).
- [x] **Task 2.3**: Update `models/index.js` (rewire associations to `batchModel` via mapping table `academicRegulationCourseMappingModel`, remove `courseModel`/`sessionModel` mapping associations).

### Phase 3: Academic Regulation CRUD & Routes
- [x] **Task 3.1**: Update `repository/academicRegulationRepository.js` (support `batchId` filtering via mapping table, manage mappings with `batchId`, remove `academicYear` include).
- [x] **Task 3.2**: Update `services/academicRegulationService.js` (remove `academicYearId` and direct `batchId` assignment on regulation, redirect `batchId` to `courseMappings`).
- [x] **Task 3.3**: Update `controllers/academicRegulationController.js` (adjust mapping endpoints for `batchId`).
- [x] **Task 3.4**: Update `router/academicRegulationRoute.js` (update Zod schemas to validate `batchId` instead of `courseId`/`sessionId`/`academicYearId`).

### Phase 4: Downstream Consumer Updates
- [x] **Task 4.1**: Update `repository/batchRepository.js` and `services/batchService.js` (fetch regulation directly by batch).
- [x] **Task 4.2**: Update `repository/courseRepository.js` and `services/courseService.js` (remove deprecated `academicYearId` and session mapping queries).
- [x] **Task 4.3**: Update `repository/previousAcademicRepository.js` and `services/previousAcademicService.js` (lookup regulation by `batchId`).

### Phase 5: Verification & Testing
- [x] **Task 5.1**: Validate syntax and imports across all touched files.
- [x] **Task 5.2**: Verify no remaining references to `academicRegulationCourseMapping.courseId` or `academicRegulation.academicYearId`.
