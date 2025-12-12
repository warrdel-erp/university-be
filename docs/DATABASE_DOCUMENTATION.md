# Database Documentation - Complete Schema & Relationships

## 📋 Table of Contents
1. [Database Overview](#database-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Table Categories](#table-categories)
4. [Complete Table List](#complete-table-list)
5. [Table Relationships](#table-relationships)
6. [Core Entity Relationships](#core-entity-relationships)

---

## 🗄️ Database Overview

- **Database Type:** MySQL
- **ORM:** Sequelize 6.37.3
- **Total Tables:** 123
- **Total Relationships:** ~477
- **Soft Delete:** Enabled (paranoid: true) on all tables
- **Timestamps:** Created/Updated timestamps on all tables

---

## 📊 Entity Relationship Diagram (Overview)

```
University
  └── Campus
      └── Institute
          ├── Course
          │   ├── Specialization
          │   ├── Semester
          │   └── Subject
          ├── Student
          ├── Employee
          ├── Library
          └── Building → Floor → Classroom
```

---

## 📁 Table Categories

### 1. **Core/System Tables** (5 tables)
- `setting` - System settings
- `university` - University information
- `campus` - Campus information
- `institute` - Institute/College information
- `affiliated_university` - Affiliated universities

### 2. **Academic Management** (15 tables)
- `acedmic_year` - Academic years
- `session` - Academic sessions
- `course` - Courses/Programs
- `specialization` - Specializations
- `semester` - Semesters
- `subject` - Subjects
- `class` - Classes
- `class_sections` - Class sections
- `section` - Sections
- `class_subject_mapper` - Subject to class mapping
- `class_student_mapper` - Student to class mapping
- `subject_mapper` - Subject mappings
- `syllabus` - Syllabus
- `syllabus_details` - Syllabus details
- `syllabus_unit` - Syllabus units

### 3. **Student Management** (10 tables)
- `students` - Main student table
- `students_address` - Student permanent address
- `student_cors_address` - Student correspondence address
- `students_entrance_detail` - Entrance exam details
- `student_meta_data` - Student metadata
- `student_elective_subject` - Elective subjects
- `student_invoice_mapper` - Student invoice mapping
- `user_student_employee` - User-Student-Employee linking

### 4. **Employee Management** (20 tables)
- `employee` - Main employee table
- `employee_address` - Employee permanent address
- `employee_cor_address` - Employee correspondence address
- `employee_office` - Office details
- `employee_role` - Employee roles
- `employee_skill` - Employee skills
- `employee_documents` - Employee documents
- `employee_qualification` - Qualifications
- `employee_experiance` - Work experience
- `employee_achievement` - Achievements
- `employee_ward` - Ward information
- `employee_activity` - Activities
- `employee_reference` - References
- `employee_research` - Research work
- `employee_long_leave` - Long leave records
- `employee_meta_data` - Employee metadata
- `employee_files` - Employee files
- `teacher_subject_mapping` - Teacher-subject assignment
- `teacher_section_mapping` - Teacher-section assignment
- `staff` - Staff information

### 5. **User & Authentication** (6 tables)
- `users` - User accounts
- `role` - User roles
- `permission` - Permissions
- `role_permission_mapping` - Role-permission linking
- `user_role_permission` - User role assignment

### 6. **Fee Management** (12 tables)
- `fee_group` - Fee groups
- `fee_type` - Fee types
- `fee_plan` - Fee plans
- `fee_plan_type` - Fee plan types
- `fee_plan_semester` - Fee plan semesters
- `fee_invoice` - Fee invoices
- `fee_invoice_detail` - Invoice details
- `fee_invoice_detail_record` - Payment records
- `fee_new_invoice` - New invoice system
- `fee_type_group` - Fee type grouping

### 7. **Library Management** (15 tables)
- `library_creation` - Library setup
- `library_authority` - Library authorities
- `library_add_item` - Library items/books
- `library_member` - Library members
- `library_issue_book` - Book issue records
- `library_author_details` - Author information
- `library_multiple_book_details` - Multiple book details
- `library_floor` - Library floors
- `library_aisle` - Library aisles
- `library_rack` - Library racks
- `library_row` - Library rows
- `library_book` - Book catalog
- `library_book_inventory` - Book inventory

### 8. **Timetable & Attendance** (6 tables)
- `time_table_name` - Timetable names
- `time_table_creation` - Timetable creation
- `time_table_create` - Timetable creation (new)
- `time_table_mapping` - Timetable mappings
- `attendance` - Student attendance
- `teacher_attendence` - Teacher attendance

### 9. **Exam Management** (7 tables)
- `exam_type` - Exam types
- `exam_setup` - Exam setup
- `exam_attendance` - Exam attendance
- `exam_structure` - Exam structure
- `exam_setup_type` - Exam setup types
- `exam_structure_schedule_mapping` - Exam schedule mapping
- `exam_schedule` - Exam schedules

### 10. **Infrastructure** (4 tables)
- `building` - Buildings
- `floor` - Floors
- `class_room` - Classrooms
- `head` - Department heads

### 11. **Transport** (3 tables)
- `transport_route` - Transport routes
- `vehicle` - Vehicles
- `assign_vehicle` - Vehicle assignments

### 12. **Dormitory** (3 tables)
- `room_type` - Room types
- `dormitory_list` - Dormitory list
- `add_dormitory` - Dormitory assignments

### 13. **Leave Management** (3 tables)
- `leave_policy` - Leave policies
- `leave_request` - Leave requests
- `leave_balance` - Leave balance

### 14. **Schedule Management** (2 tables)
- `schedule` - Schedules
- `schedule_assign` - Schedule assignments

### 15. **Lesson Management** (4 tables)
- `lesson` - Lessons
- `topic` - Topics
- `sub_topic` - Sub-topics
- `lesson_mapping` - Lesson mappings

### 16. **Outcomes & Assessment** (3 tables)
- `po` - Program Outcomes
- `co` - Course Outcomes
- `co_weightage` - CO weightage

### 17. **Code Master** (2 tables)
- `employee_code_master` - Code master categories
- `employee_code_master_type` - Code master values

### 18. **Department & Accounts** (4 tables)
- `account` - Main accounts
- `sub_account` - Sub-accounts
- `department` - Departments
- `department_structure` - Department hierarchy

### 19. **Other** (3 tables)
- `holiday` - Holidays
- `notice` - Notices
- `elective_subject` - Elective subjects

---

## 📋 Complete Table List (123 Tables)

### Core System
1. `setting`
2. `university`
3. `campus`
4. `institute`
5. `affiliated_university`

### Academic
6. `acedmic_year`
7. `session`
8. `course`
9. `specialization`
10. `semester`
11. `subject`
12. `class`
13. `class_sections`
14. `section`
15. `class_subject_mapper`
16. `class_student_mapper`
17. `subject_mapper`
18. `syllabus`
19. `syllabus_details`
20. `syllabus_unit`
21. `session_couse_mapping`

### Student
22. `students`
23. `students_address`
24. `student_cors_address`
25. `students_entrance_detail`
26. `student_meta_data`
27. `student_elective_subject`
28. `student_invoice_mapper`

### Employee
29. `employee`
30. `employee_address`
31. `employee_cor_address`
32. `employee_office`
33. `employee_role`
34. `employee_skill`
35. `employee_documents`
36. `employee_qualification`
37. `employee_experiance`
38. `employee_achievement`
39. `employee_ward`
40. `employee_activity`
41. `employee_reference`
42. `employee_research`
43. `employee_long_leave`
44. `employee_meta_data`
45. `employee_files`
46. `teacher_subject_mapping`
47. `teacher_section_mapping`
48. `staff`

### User & Auth
49. `users`
50. `role`
51. `permission`
52. `role_permission_mapping`
53. `user_role_permission`
54. `user_student_employee`

### Fee
55. `fee_group`
56. `fee_type`
57. `fee_plan`
58. `fee_plan_type`
59. `fee_plan_semester`
60. `fee_invoice`
61. `fee_invoice_detail`
62. `fee_invoice_detail_record`
63. `fee_new_invoice`
64. `fee_type_group`

### Library
65. `library_creation`
66. `library_authority`
67. `library_add_item`
68. `library_member`
69. `library_issue_book`
70. `library_author_details`
71. `library_multiple_book_details`
72. `library_floor`
73. `library_aisle`
74. `library_rack`
75. `library_row`
76. `library_book`
77. `library_book_inventory`

### Timetable & Attendance
78. `time_table_name`
79. `time_table_creation`
80. `time_table_create`
81. `time_table_mapping`
82. `attendance`
83. `teacher_attendence`
84. `faculity_load`

### Exam
85. `exam_type`
86. `exam_setup`
87. `exam_attendance`
88. `exam_structure`
89. `exam_setup_type`
90. `exam_structure_schedule_mapping`
91. `exam_schedule`

### Infrastructure
92. `building`
93. `floor`
94. `class_room`
95. `head`

### Transport
96. `transport_route`
97. `vehicle`
98. `assign_vehicle`

### Dormitory
99. `room_type`
100. `dormitory_list`
101. `add_dormitory`

### Leave
102. `leave_policy`
103. `leave_request`
104. `leave_balance`

### Schedule
105. `schedule`
106. `schedule_assign`

### Lesson
107. `lesson`
108. `topic`
109. `sub_topic`
110. `lesson_mapping`

### Outcomes
111. `po`
112. `co`
113. `co_weightage`

### Code Master
114. `employee_code_master`
115. `employee_code_master_type`

### Department
116. `account`
117. `sub_account`
118. `department`
119. `department_structure`

### Other
120. `holiday`
121. `notice`
122. `elective_subject`
123. `SequelizeMeta` (Migration tracking)

---

## 🔗 Table Relationships

### Core Hierarchy

```
university (1) ──→ (M) campus
campus (1) ──→ (M) institute
institute (1) ──→ (M) course
institute (1) ──→ (M) employee
institute (1) ──→ (M) student
```

### Academic Relationships

```
course (1) ──→ (M) specialization
specialization (1) ──→ (M) semester
course (1) ──→ (M) semester
course (1) ──→ (M) subject
semester (1) ──→ (M) class_sections
class_sections (1) ──→ (M) class_subject_mapper
class_sections (1) ──→ (M) class_student_mapper
```

### Student Relationships

```
student (1) ──→ (M) students_address
student (1) ──→ (M) student_cors_address
student (1) ──→ (M) students_entrance_detail
student (1) ──→ (M) student_meta_data
student (1) ──→ (M) attendance
student (1) ──→ (M) exam_attendance
student (1) ──→ (M) fee_invoice
student (1) ──→ (M) library_member
student (1) ──→ (M) library_book_inventory
```

### Employee Relationships

```
employee (1) ──→ (M) employee_address
employee (1) ──→ (M) employee_cor_address
employee (1) ──→ (M) employee_office
employee (1) ──→ (M) employee_role
employee (1) ──→ (M) employee_skill
employee (1) ──→ (M) employee_documents
employee (1) ──→ (M) employee_qualification
employee (1) ──→ (M) employee_experiance
employee (1) ──→ (M) employee_achievement
employee (1) ──→ (M) employee_ward
employee (1) ──→ (M) employee_activity
employee (1) ──→ (M) employee_reference
employee (1) ──→ (M) employee_research
employee (1) ──→ (M) employee_long_leave
employee (1) ──→ (M) employee_meta_data
employee (1) ──→ (M) employee_files
employee (1) ──→ (M) teacher_subject_mapping
employee (1) ──→ (M) teacher_section_mapping
employee (1) ──→ (M) leave_request
employee (1) ──→ (M) schedule_assign
employee (1) ──→ (M) teacher_attendence
employee (1) ──→ (M) library_member
employee (1) ──→ (M) library_book_inventory
```

### Fee Relationships

```
fee_group (1) ──→ (M) fee_type
fee_plan (1) ──→ (M) fee_invoice
fee_plan (1) ──→ (M) fee_new_invoice
fee_new_invoice (1) ──→ (M) fee_plan_type
fee_new_invoice (1) ──→ (M) fee_plan_semester
fee_invoice (1) ──→ (M) fee_invoice_detail
student_invoice_mapper (1) ──→ (M) fee_invoice_detail_record
student_invoice_mapper (1) ──→ (M) fee_type_group
fee_type (1) ──→ (M) fee_type_group
```

### Library Relationships

```
library_creation (1) ──→ (M) library_authority
library_creation (1) ──→ (M) library_member
library_creation (1) ──→ (M) library_floor
library_creation (1) ──→ (M) library_book
library_floor (1) ──→ (M) library_aisle
library_aisle (1) ──→ (M) library_rack
library_rack (1) ──→ (M) library_row
library_book (1) ──→ (M) library_book_inventory
library_member (1) ──→ (M) library_issue_book
library_add_item (1) ──→ (M) library_issue_book
```

### Timetable Relationships

```
time_table_name (1) ──→ (M) time_table_creation
time_table_name (1) ──→ (M) time_table_create
time_table_create (1) ──→ (M) time_table_mapping
time_table_mapping (1) ──→ (M) attendance
time_table_mapping (1) ──→ (M) lesson_mapping
```

### Exam Relationships

```
exam_structure (1) ──→ (M) exam_setup_type
exam_setup_type (1) ──→ (M) exam_structure_schedule_mapping
exam_setup_type (1) ──→ (M) exam_schedule
exam_setup_type (1) ──→ (M) syllabus_details
exam_setup (1) ──→ (M) exam_attendance
```

### Infrastructure Relationships

```
campus (1) ──→ (M) building
building (1) ──→ (M) floor
floor (1) ──→ (M) class_room
campus (1) ──→ (M) head
institute (1) ──→ (M) head
```

### Transport Relationships

```
transport_route (1) ──→ (M) assign_vehicle
vehicle (1) ──→ (M) assign_vehicle
employee (1) ──→ (M) vehicle
```

### Dormitory Relationships

```
dormitory_list (1) ──→ (M) add_dormitory
room_type (1) ──→ (M) add_dormitory
```

### Leave Relationships

```
leave_policy (1) ──→ (M) leave_request
leave_policy (1) ──→ (M) leave_balance
employee (1) ──→ (M) leave_request
```

### Schedule Relationships

```
schedule (1) ──→ (M) schedule_assign
employee (1) ──→ (M) schedule_assign
schedule_assign (1) ──→ (M) teacher_attendence
```

### Lesson Relationships

```
lesson (1) ──→ (M) topic
topic (1) ──→ (M) sub_topic
topic (1) ──→ (M) lesson_mapping
subject (1) ──→ (M) lesson
employee (1) ──→ (M) lesson
```

### Outcomes Relationships

```
course (1) ──→ (M) po
syllabus_details (1) ──→ (M) co
co (1) ──→ (M) co_weightage
```

### User Relationships

```
users (1) ──→ (M) user_role_permission
role (1) ──→ (M) user_role_permission
permission (1) ──→ (M) user_role_permission
role (1) ──→ (M) role_permission_mapping
permission (1) ──→ (M) role_permission_mapping
users (1) ──→ (M) user_student_employee
student (1) ──→ (1) user_student_employee
employee (1) ──→ (1) user_student_employee
```

### Department Relationships

```
account (1) ──→ (M) sub_account
sub_account (1) ──→ (M) department
sub_account (1) ──→ (M) department_structure
department (1) ──→ (M) staff
employee (1) ──→ (M) staff
```

### Code Master Relationships

```
employee_code_master (1) ──→ (M) employee_code_master_type
employee_code_master_type (1) ──→ (M) [Used as lookup in many tables]
```

---

## 🔄 Core Entity Relationships

### University → Campus → Institute Flow

```
university
  └── campus (campus_id → university_id)
      └── institute (institute_id → campus_id)
          ├── course (course_id → institute_id)
          ├── employee (employee_id → institute_id)
          ├── student (student_id → institute_id)
          └── library_creation (library_creation_id → institute_id)
```

### Academic Flow

```
course
  └── specialization (specialization_id → course_id)
      └── semester (semester_id → specialization_id)
          └── class_sections (class_sections_id → semester_id)
              ├── class_subject_mapper (class_subject_mapper_id → class_sections_id)
              └── class_student_mapper (class_student_mapper_id → class_sections_id)
```

### Student Academic Flow

```
student
  ├── course (course_id)
  ├── specialization (specialization_id)
  ├── semester (semester_id)
  ├── session (session_id)
  ├── class_sections (class_sections_id)
  ├── acedmic_year (acedmic_year_id)
  └── fee_plan (fee_plan_id)
```

### Employee Academic Flow

```
employee
  ├── campus (campus_id)
  ├── institute (institute_id)
  ├── role (role_id)
  ├── acedmic_year (acedmic_year_id)
  ├── teacher_subject_mapping (employee_id)
  └── teacher_section_mapping (employee_id)
```

### Fee Payment Flow

```
fee_plan
  └── fee_new_invoice
      └── student_invoice_mapper
          └── fee_invoice_detail_record (payment records)
```

### Library Flow

```
library_creation
  ├── library_floor
  │   └── library_aisle
  │       └── library_rack
  │           └── library_row
  └── library_book
      └── library_book_inventory (location: floor/aisle/rack/row)
```

---

## 📊 Key Foreign Key Relationships

### Users Table (Central)
- `users.user_id` is referenced by:
  - Most tables via `created_by` field
  - `user_role_permission.user_id`
  - `user_student_employee.user_id`

### Student Table
- Foreign Keys:
  - `university_id` → `university.university_id`
  - `campus_id` → `campus.campus_id`
  - `institute_id` → `institute.institute_id`
  - `affiliated_university_id` → `affiliated_university.affiliated_university_id`
  - `course_id` → `course.course_id`
  - `specialization_id` → `specialization.specialization_id`
  - `semester_id` → `semester.semester_id`
  - `session_id` → `session.session_id`
  - `class_sections_id` → `class_sections.class_sections_id`
  - `acedmic_year_id` → `acedmic_year.acedmic_year_id`
  - `course_level_id` → `employee_code_master_type.employee_code_master_type_id`
  - `fee_plan_id` → `fee_plan.fee_plan_id`
  - `created_by` → `users.user_id`

### Employee Table
- Foreign Keys:
  - `campus_id` → `campus.campus_id`
  - `institute_id` → `institute.institute_id`
  - `role_id` → `role.role_id`
  - `acedmic_year_id` → `acedmic_year.acedmic_year_id`
  - `created_by` → `users.user_id`

### Course Table
- Foreign Keys:
  - `university_id` → `university.university_id`
  - `institute_id` → `institute.institute_id`
  - `affiliated_university_id` → `affiliated_university.affiliated_university_id`
  - `course_level_id` → `employee_code_master_type.employee_code_master_type_id`
  - `created_by` → `users.user_id`

---

## 🔑 Primary Keys

All tables follow consistent primary key naming:
- Format: `{table_name}_id`
- Type: `INTEGER AUTO_INCREMENT`
- Examples:
  - `student_id` in `students` table
  - `employee_id` in `employee` table
  - `course_id` in `course` table

---

## 📅 Common Fields

### Timestamps (All Tables)
- `created_at` - TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP
- `updated_at` - TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP
- `deleted_at` - TIMESTAMP, NULL (for soft deletes)

### Audit Fields (All Tables)
- `created_by` - INTEGER, references `users.user_id`
- `updated_by` - INTEGER, references `users.user_id` (some tables)

---

## 🔍 Lookup Tables

### employee_code_master & employee_code_master_type
Used as lookup/reference tables for:
- Countries, States, Cities
- Document types
- Qualification types
- Experience types
- Achievement categories
- Leave types
- Course levels
- And many more enum-like values

**Relationship Pattern:**
```
employee_code_master (category)
  └── employee_code_master_type (values)
      └── [Referenced by many tables via foreign keys]
```

---

## 📈 Relationship Statistics

- **One-to-Many:** ~400 relationships
- **Many-to-Many:** ~50 relationships (via junction tables)
- **One-to-One:** ~27 relationships

### Junction Tables (Many-to-Many)
- `class_subject_mapper` - Links classes to subjects
- `class_student_mapper` - Links classes to students
- `teacher_subject_mapping` - Links teachers to subjects
- `teacher_section_mapping` - Links teachers to sections
- `role_permission_mapping` - Links roles to permissions
- `user_role_permission` - Links users to roles and permissions
- `session_couse_mapping` - Links sessions to courses
- `student_elective_subject` - Links students to elective subjects

---

## 🎯 Key Design Patterns

### 1. Soft Delete Pattern
- All tables use `paranoid: true`
- Records are marked as deleted, not physically removed
- `deleted_at` field tracks deletion

### 2. Audit Trail Pattern
- `created_by` tracks who created the record
- `created_at` tracks when record was created
- `updated_at` tracks last modification

### 3. Hierarchical Structure
- University → Campus → Institute
- Building → Floor → Classroom
- Library → Floor → Aisle → Rack → Row

### 4. Code Master Pattern
- Centralized lookup tables
- Reusable across multiple entities
- Easy to maintain and update

---

## 📝 Notes

1. **Naming Convention:**
   - Database fields: `snake_case` (e.g., `student_id`)
   - Model properties: `camelCase` (e.g., `studentId`)
   - Table names: `snake_case` (e.g., `class_sections`)

2. **Relationships:**
   - All relationships defined in `models/index.js`
   - Uses Sequelize associations (belongsTo, hasMany, hasOne)
   - Aliases used for multiple relationships between same tables

3. **Data Integrity:**
   - Foreign key constraints enforced
   - Cascade options configured where appropriate
   - Soft deletes maintain referential integrity

4. **Indexes:**
   - Primary keys automatically indexed
   - Foreign keys should be indexed (check database)

---

## 🔄 Migration Support

- Migration system integrated
- Schema changes tracked via migrations
- See `README_MIGRATIONS.md` for migration guide

---

**Last Updated:** 30-11-2025  
**Total Tables:** 123  
**Total Relationships:** ~477