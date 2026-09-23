# Class Section Schema Refactor: Removal of `courseId` and `sessionId`

## 1. Executive Summary

This document details the impact, architectural shifts, affected API endpoints, and required code changes for removing the `course_id` (`courseId`) and `session_id` (`sessionId`) columns from `class_sections` ([models/classSectionModel.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/models/classSectionModel.js)).

### Core Rationale & Canonical Relationship
Previously, `class_sections` directly held redundant foreign keys for `course_id` and `session_id`. Under the normalized database architecture, the canonical relationship flows through `batch`:

```
┌─────────────────┐       ┌──────────┐       ┌───────────┐       ┌──────────┐
│  class_sections │ ───►  │  batch   │ ───►  │  session  │ ───►  │  course  │
│  (batch_id)     │       │(session_id)      │(course_id)│       │          │
└─────────────────┘       └──────────┘       └───────────┘       └──────────┘
```

- **Batch** links a cohort of students to a specific academic session (`session_id`).
- **Session** links the academic session to the academic program/course (`course_id`).
- **Total Affected Endpoints**: **37 API endpoints** across **9 functional modules**.

---

## 2. Model & Database Schema Changes

### 2.1. Model Update: `models/classSectionModel.js`
Remove `courseId` and `sessionId` field definitions and their model imports (`courseModel`, `sessionModel`):

```diff
- import course from "./courseModel.js";
  import specialization from "./specializationModel.js";
  import acedmicYearModel from "./acedmicYearModel.js";
  import users from "./userModel.js";
  import instituteModel from "./instituteModel.js";
- import sessionModel from "./sessionModel.js";
  import batchModel from "./batchModel.js";

  const classSectionModel = sequelize.define('class_sections', {
      classSectionsId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          field: 'class_sections_id'
      },
-     courseId: {
-         type: DataTypes.INTEGER,
-         allowNull: false,
-         field: 'course_id',
-         references: { model: course, key: 'course_id' }
-     },
      specializationId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'specialization_id',
          references: { model: specialization, key: 'specialization_id' }
      },
-     sessionId: {
-         type: DataTypes.INTEGER,
-         allowNull: false,
-         field: 'session_id',
-         references: { model: sessionModel, key: 'session_id' }
-     },
      batchId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'batch_id',
          references: { model: batchModel, key: 'batch_id' }
      },
      // ... remaining fields
  });
```

### 2.2. Association Update: `models/index.js`
Remove obsolete direct associations between `classSectionModel` and `courseModel`:

```diff
- classSectionModel.belongsTo(courseModel, {
-   foreignKey: "course_id",
-   as: "courseSection",
- });
- courseModel.hasMany(classSectionModel, {
-   foreignKey: "course_id",
-   as: "courseSection",
- });

- classSectionModel.belongsTo(courseModel, {
-   foreignKey: "course_id",
-   as: "courseSectionAdd",
- });
- courseModel.hasMany(classSectionModel, {
-   foreignKey: "course_id",
-   as: "courseSectionAdd",
- });
```

### 2.3. SQL Migration Script
```sql
-- Remove foreign key constraints
ALTER TABLE class_sections DROP FOREIGN KEY fk_class_sections_course_id;
ALTER TABLE class_sections DROP FOREIGN KEY fk_session_id;

-- Drop redundant columns
ALTER TABLE class_sections DROP COLUMN course_id;
ALTER TABLE class_sections DROP COLUMN session_id;
```

---

## 3. Resolution Utilities ([utility/classSectionIncludes.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/utility/classSectionIncludes.js))

The codebase already provides utility helpers for resolving course and session via `batch`:

1. **`classSectionBatchInclude({ courseId, sessionId, required })`**: Generates Sequelize include options traversing `batch` -> `session` -> `course`.
2. **`resolveClassSectionCourseId(sectionPlain)`**: Extracts `courseId` from `section.batch?.session?.courseId`.
3. **`resolveClassSectionSessionId(sectionPlain)`**: Extracts `sessionId` from `section.batch?.sessionId`.
4. **`enrichClassSectionWithCourseSession(sectionPlain)`**: Appends `courseId` and `sessionId` dynamically to the response object for backwards compatibility with frontend clients.

---

## 4. Complete List of Affected APIs (37 Endpoints)

### 4.1. Class Section & Main Core APIs (3 Endpoints)
| Method | Endpoint | Controller Handler | Repository / Service Source | Required Refactor |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/classSections` | `getClassSectionsByFilter` | [mainRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/mainRepository.js#L1060) | Replace `where: { courseId, sessionId }` with `classSectionBatchInclude` |
| `GET` | `/main/classSectionSpecific` | `getClassSectionSpecific` | [mainRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/mainRepository.js#L454) | Join via batch and enrich response with `enrichClassSectionWithCourseSession` |
| `GET` | `/main/classSectionRecord` | `getClassSectionRecord` | [studentRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/studentRepository.js#L2539) | Query `class_sections` by ID without direct `courseId` column match |

### 4.2. Course & Terms Module (4 Endpoints)
| Method | Endpoint | Controller Handler | Repository / Service Source | Required Refactor |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/course/termsWithClassSections` | `getTermsWithClassSections` | [courseRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/courseRepository.js#L360) | Query sections through `classSectionBatchInclude({ courseId, sessionId })` |
| `GET` | `/course/:courseId/sessions` | `getCourseSessions` | [courseRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/courseRepository.js) | Ensure count/association uses `batch` relation |
| `GET` | `/course/my/:courseId/sessions` | `getMyCourseSessions` | [courseRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/courseRepository.js) | Ensure count/association uses `batch` relation |
| `GET` | `/terms/withSubjectAndSection` | `getTermsData` | [termsRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/termsRepository.js#L78) | Use `classSectionBatchInclude` instead of `where: { courseId, sessionId }` |

### 4.3. Session Management (1 Endpoint)
| Method | Endpoint | Controller Handler | Repository / Service Source | Required Refactor |
| :--- | :--- | :--- | :--- | :--- |
| `DELETE` | `/session/courseSessionMapping` | `deleteCouseSessionMapping` | [sessionRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/sessionRepository.js#L202) | Check blocker count via batch: `model.classSectionModel.count({ include: [{ model: batchModel, where: { sessionId } }] })` |

### 4.4. Timetable & Timetable Creation APIs (11 Endpoints)
| Method | Endpoint | Controller Handler | Repository / Service Source | Required Refactor |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/timeTableCreate` | `gettimeTableCreateDetails` | [timeTablecreateRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/timeTablecreateRepository.js) | Replace `sectionWhere.courseId/sessionId` with batch include filter |
| `POST` | `/timeTableCreate` | `addtimeTableCreate` | [timeTableCreateServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/timeTableCreateServices.js) | Resolve section's `courseId`/`sessionId` via batch relation |
| `PATCH` | `/timeTableCreate/create` | `changeTimeTableCreate` | [timeTableCreateServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/timeTableCreateServices.js) | Resolve section's `courseId`/`sessionId` via batch relation |
| `GET` | `/timeTableCreate/cellData` | `getTimeTableCellData` | [timeTablecreateRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/timeTablecreateRepository.js#L1606) | Join `course` via routine or batch instead of `courseSection` |
| `POST` | `/timeTableCreate/clone` | `cloneTimeTableRoutine` | [timeTableCreateServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/timeTableCreateServices.js) | Validate placement course/session against batch |
| `GET` | `/timeTableCreate/elective` | `getTimeTableElective` | [timeTablecreateRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/timeTablecreateRepository.js) | Replace `sectionWhere.courseId/sessionId` |
| `POST` | `/timeTable/courseMapping` | `addStructureCourseMapping` | [timeTableRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/timeTableRepository.js) | Remove direct `class_sections.sessionId` column reference |
| `PATCH` | `/timeTable/structure` | `updateStructure` | [timeTableRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/timeTableRepository.js) | Remove direct `class_sections.sessionId` column reference |
| `GET` | `/timetableAcademicGroup/programsOverview` | `getProgramsOverview` | [timeTableRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/timeTableRepository.js) | Replace `as: 'courseSection'` with batch include |
| `POST` | `/timetableAcademicGroup/mapping` | `addStructureScopeMapping` | [timetableAcademicGroupController.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/controllers/timetableAcademicGroupController.js) | Update routine section scope checks |
| `POST` | `/timetableAcademicGroup/routine` | `addAcademicGroupRoutine` | [timetableAcademicGroupController.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/controllers/timetableAcademicGroupController.js) | Update routine section scope checks |

### 4.5. Lesson Planning APIs (11 Endpoints)
| Method | Endpoint | Controller Handler | Repository / Service Source | Required Refactor |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/lesson/employee` | `getEmployeeSubjectAndLesson` | [lessonRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/lessonRepository.js) | Replace `classSectionWhere.courseId/sessionId` with batch include |
| `GET` | `/lesson/my/employee` | `getMyEmployeeSubjectAndLesson` | [lessonRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/lessonRepository.js) | Replace `classSectionWhere.courseId/sessionId` with batch include |
| `GET` | `/lesson/my` | `getAllMyLessons` | [lessonRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/lessonRepository.js) | Replace `courseSection` association with batch traversal |
| `GET` | `/lesson/my/mapping` | `getMyMapping` | [lessonRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/lessonRepository.js) | Replace `courseSection` association with batch traversal |
| `POST` | `/lesson/mapping` | `addMapping` | [lessonServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/lessonServices.js) | Resolve course details via `section.batch?.session?.course` |
| `POST` | `/lesson/my/mapping` | `addMyMapping` | [lessonServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/lessonServices.js) | Resolve course details via `section.batch?.session?.course` |
| `POST` | `/lesson/my/topic` | `addMyTopic` | [lessonServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/lessonServices.js) | Update section validation |
| `PATCH` | `/lesson/my/topic/:topicId` | `updateMyTopic` | [lessonServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/lessonServices.js) | Update section validation |
| `DELETE` | `/lesson/my/topic/:topicId` | `deleteMyTopic` | [lessonServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/lessonServices.js) | Update section validation |
| `PATCH` | `/lesson/topic/:topicId` | `updateTopic` | [lessonServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/lessonServices.js) | Update section validation |
| `DELETE` | `/lesson/topic/:topicId` | `deleteTopic` | [lessonServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/lessonServices.js) | Update section validation |

### 4.6. Options & Dropdowns (2 Endpoints)
| Method | Endpoint | Controller Handler | Repository / Service Source | Required Refactor |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/options/classSections` | `getClassSectionOptions` | [optionsRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/optionsRepository.js#L99) | Filter sections using `classSectionBatchInclude({ courseId, sessionId, year, batchId })` |
| `GET` | `/options/studentFilters` | `getStudentFilterOptions` | [optionsRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/optionsRepository.js#L597) | Use batch relation in `getDistinctClassSectionYears` |

### 4.7. Student Management (2 Endpoints)
| Method | Endpoint | Controller Handler | Repository / Service Source | Required Refactor |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/student/promotion/available-section` | `getPromotionAvailableSection` | [studentRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/studentRepository.js) | Remove `class_sections.sessionId` and `class_sections.courseId` from attribute projections |
| `GET` | `/student/studentTimetable` | `getStudentTimeTable` | [studentRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/studentRepository.js) | Derive `sessionId` from `batch` |

### 4.8. Attendance & Dashboard (3 Endpoints)
| Method | Endpoint | Controller Handler | Repository / Service Source | Required Refactor |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/attendance/byDate` | `getAttendanceByDate` | [attendanceServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/attendanceServices.js#L628) | Read `courseName` from routine or `batch.session.course` rather than `classAtt.courseSection` |
| `POST` | `/attendance/getStudentAttendance/batch` | `getStudentsBatchAttendance` | [attendanceRepository.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/repository/attendanceRepository.js) | Remove `courseSection` association |
| `GET` | `/dashboard` | `getDashboard` | [dashboardServices.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/services/dashboardServices.js#L77) | Resolve `courseId` from `batch` |

### 4.9. Authorization (1 Endpoint)
| Method | Endpoint | Controller Handler | Repository / Service Source | Required Refactor |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/authorization/permissions/assign` | `assignPermissions` | [userPermissionController.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/controllers/userPermissionController.js) | Resolve class section metadata from batch |

---

## 5. Summary Checklist for Implementation

- [ ] **Step 1: DB Migration** - Drop foreign keys and columns `course_id` and `session_id` from table `class_sections`.
- [ ] **Step 2: Model Cleanup** - Remove `courseId` and `sessionId` from `models/classSectionModel.js`.
- [ ] **Step 3: Associations Cleanup** - Remove `courseSection` and `courseSectionAdd` from `models/index.js`.
- [ ] **Step 4: Repository Refactoring** - Replace direct `where: { courseId, sessionId }` and `attributes: ['courseId', 'sessionId']` with `classSectionBatchInclude(...)` across:
  - `repository/courseRepository.js`
  - `repository/termsRepository.js`
  - `repository/sessionRepository.js`
  - `repository/mainRepository.js`
  - `repository/optionsRepository.js`
  - `repository/studentRepository.js`
  - `repository/timeTablecreateRepository.js`
  - `repository/lessonRepository.js`
- [ ] **Step 5: Service Refactoring** - Use `resolveClassSectionCourseId(section)` / `enrichClassSectionWithCourseSession(section)` in services.
- [ ] **Step 6: Verification** - Run API tests across the 37 listed endpoints.
