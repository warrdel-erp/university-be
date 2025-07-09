-- Add the institute_id column with the foreign key reference in users

ALTER TABLE users ADD COLUMN institute_id INT NULL;

-- UPDATE users SET institute_id = 1 WHERE institute_id IS NULL;

-- UPDATE users SET institute_id = 1 WHERE institute_id = 0;

-- ALTER TABLE users ADD CONSTRAINT fk_users_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- ALTER TABLE users DROP FOREIGN KEY users_ibfk_4;

-- Add the institute_id column with the foreign key reference in course

ALTER TABLE course ADD COLUMN institute_id INT NOT NULL;

UPDATE course SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE course SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE course ADD CONSTRAINT fk_course_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in specialization

ALTER TABLE specialization ADD COLUMN institute_id INT NOT NULL;

UPDATE specialization SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE specialization SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE specialization ADD CONSTRAINT fk_specialization_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in subject

ALTER TABLE subject ADD COLUMN institute_id INT NOT NULL;

UPDATE subject SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE subject SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE subject ADD CONSTRAINT fk_subject_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in class

ALTER TABLE class ADD COLUMN institute_id INT NOT NULL;

UPDATE class SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE class SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE class ADD CONSTRAINT fk_class_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in class_sections

ALTER TABLE class_sections ADD COLUMN institute_id INT NOT NULL;

UPDATE class_sections SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE class_sections SET institute_id = 1 WHERE institute_id = 0; 

ALTER TABLE class_sections ADD CONSTRAINT fk_class_sections_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in class_subject_mapper

ALTER TABLE class_subject_mapper ADD COLUMN institute_id INT NOT NULL;

UPDATE class_subject_mapper SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE class_subject_mapper SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE class_subject_mapper ADD CONSTRAINT fk_class_subject_mapper_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in semester

ALTER TABLE semester ADD COLUMN institute_id INT NOT NULL;

UPDATE semester SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE semester SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE semester ADD CONSTRAINT fk_semester_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in section

ALTER TABLE section ADD COLUMN institute_id INT NOT NULL;

UPDATE section SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE section SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE section ADD CONSTRAINT fk_section_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in fee_group

ALTER TABLE fee_group ADD COLUMN institute_id INT NOT NULL;

UPDATE fee_group SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE fee_group SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE fee_group ADD CONSTRAINT fk_fee_group_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in exam_type

ALTER TABLE exam_type ADD COLUMN institute_id INT NOT NULL;

UPDATE exam_type SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE exam_type SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE exam_type ADD CONSTRAINT fk_exam_type_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the university_id column with the foreign key reference in exam_type

ALTER TABLE exam_type ADD COLUMN university_id INT NOT NULL;

UPDATE exam_type SET university_id = 1 WHERE university_id IS NULL;

UPDATE exam_type SET university_id = 1 WHERE university_id = 0;

ALTER TABLE exam_type ADD CONSTRAINT fk_exam_type_university_id FOREIGN KEY (university_id) REFERENCES university(university_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in exam_attendance

ALTER TABLE exam_attendance ADD COLUMN institute_id INT NOT NULL;

UPDATE exam_attendance SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE exam_attendance SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE exam_attendance ADD CONSTRAINT fk_exam_attendance_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in dormitory_list

ALTER TABLE dormitory_list ADD COLUMN institute_id INT NOT NULL;

UPDATE dormitory_list SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE dormitory_list SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE dormitory_list ADD CONSTRAINT fk_dormitory_list_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the university_id column with the foreign key reference in dormitory_list

ALTER TABLE dormitory_list ADD COLUMN university_id INT NOT NULL;

UPDATE dormitory_list SET university_id = 1 WHERE university_id IS NULL;

UPDATE dormitory_list SET university_id = 1 WHERE university_id = 0;

ALTER TABLE dormitory_list ADD CONSTRAINT fk_dormitory_list_university_id FOREIGN KEY (university_id) REFERENCES university(university_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in room_type

ALTER TABLE room_type ADD COLUMN institute_id INT NOT NULL;

UPDATE room_type SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE room_type SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE room_type ADD CONSTRAINT fk_room_type_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the university_id column with the foreign key reference in room_type

ALTER TABLE room_type ADD COLUMN university_id INT NOT NULL;

UPDATE room_type SET university_id = 1 WHERE university_id IS NULL;

UPDATE room_type SET university_id = 1 WHERE university_id = 0;

ALTER TABLE room_type ADD CONSTRAINT fk_room_type_university_id FOREIGN KEY (university_id) REFERENCES university(university_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in transport_route

ALTER TABLE transport_route ADD COLUMN institute_id INT NOT NULL;

UPDATE transport_route SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE transport_route SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE transport_route ADD CONSTRAINT fk_transport_route_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the university_id column with the foreign key reference in transport_route

ALTER TABLE transport_route ADD COLUMN university_id INT NOT NULL;

UPDATE transport_route SET university_id = 1 WHERE university_id IS NULL;

UPDATE transport_route SET university_id = 1 WHERE university_id = 0;

ALTER TABLE transport_route ADD CONSTRAINT fk_transport_route_university_id FOREIGN KEY (university_id) REFERENCES university(university_id) ON DELETE CASCADE;

ALTER TABLE semester ADD COLUMN name VARCHAR(255) NOT NULL;

ALTER TABLE acedmic_year
MODIFY COLUMN starting_date VARCHAR(255) NULL,
MODIFY COLUMN ending_date VARCHAR(255) NULL;

ALTER TABLE acedmic_year MODIFY COLUMN updated_by INT NULL;

ALTER TABLE acedmic_year DROP COLUMN year;

ALTER TABLE acedmic_year DROP FOREIGN KEY acedmic_year_ibfk_1;
ALTER TABLE acedmic_year DROP FOREIGN KEY acedmic_year_ibfk_2;

ALTER TABLE acedmic_year DROP COLUMN university_id;
ALTER TABLE acedmic_year DROP COLUMN created_by;

-- DELETE FROM acedmic_year;

INSERT INTO acedmic_year (year_title, starting_date, ending_date, created_at, updated_at, updated_by)
VALUES
('2015-2016', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2016-2017', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2017-2018', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2018-2019', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2019-2020', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2020-2021', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2021-2022', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2022-2023', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2023-2024', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2024-2025', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2025-2026', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2026-2027', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2027-2028', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2028-2029', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2029-2030', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2030-2031', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2031-2032', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2032-2033', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2033-2034', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2034-2035', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2035-2036', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

ALTER TABLE class_subject_mapper DROP FOREIGN KEY class_subject_mapper_ibfk_2;

ALTER TABLE class_subject_mapper DROP COLUMN class_sections_id;

-- Add the semester_id column with the foreign key reference in class_subject_mapper

ALTER TABLE class_subject_mapper ADD COLUMN semester_id INT NOT NULL;

UPDATE class_subject_mapper SET semester_id = 1 WHERE semester_id IS NULL;

UPDATE class_subject_mapper SET semester_id = 1 WHERE semester_id = 0;

ALTER TABLE class_subject_mapper ADD CONSTRAINT fk_class_subject_mapper_semester_id FOREIGN KEY (semester_id) REFERENCES semester(semester_id) ON DELETE CASCADE;

CREATE TABLE session (
  session_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  university_id INT NOT NULL,
  acedmic_year_id INT NOT NULL,
  institute_id INT NOT NULL,
  session_name VARCHAR(255) NOT NULL,
  starting_date VARCHAR(255) NOT NULL,
  ending_date VARCHAR(255) NOT NULL,
  class_til_date VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT NOT NULL,
  created_by INT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (university_id) REFERENCES university(university_id),
  FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
  FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
  FOREIGN KEY (updated_by) REFERENCES users(user_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE session_course_mapping (
  session_course_mapping_id INT AUTO_INCREMENT PRIMARY KEY,
  university_id INT NOT NULL,
  institute_id INT NOT NULL,
  course_id INT NOT NULL,
  session_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT NOT NULL,
  created_by INT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (university_id) REFERENCES university(university_id),
  FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
  FOREIGN KEY (course_id) REFERENCES course(course_id),
  FOREIGN KEY (session_id) REFERENCES session(session_id),
  FOREIGN KEY (updated_by) REFERENCES users(user_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Add the semester_id column with the foreign key reference in students

ALTER TABLE students ADD COLUMN semester_id INT NOT NULL;

UPDATE students SET semester_id = 1 WHERE semester_id IS NULL;

UPDATE students SET semester_id = 1 WHERE semester_id = 0;

ALTER TABLE students ADD CONSTRAINT fk_students_semester_id FOREIGN KEY (semester_id) REFERENCES semester(semester_id) ON DELETE CASCADE;

-- Add the session_id column with the foreign key reference in students

ALTER TABLE students ADD COLUMN session_id INT NOT NULL;

UPDATE students SET session_id = 1 WHERE session_id IS NULL;

UPDATE students SET session_id = 1 WHERE session_id = 0;

ALTER TABLE students ADD CONSTRAINT fk_students_session_id FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE;

ALTER TABLE class_student_mapper DROP FOREIGN KEY class_student_mapper_ibfk_2;

ALTER TABLE class_student_mapper DROP COLUMN class_sections_id;

ALTER TABLE class_student_mapper ADD COLUMN is_passed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE semester ADD COLUMN term_type VARCHAR(255) NOT NULL;

ALTER TABLE acedmic_year ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE;

-- Add the semester_id column with the foreign key reference in class_student_mapper

ALTER TABLE class_student_mapper ADD COLUMN semester_id INT NOT NULL;

UPDATE class_student_mapper SET semester_id = 1 WHERE semester_id IS NULL;

UPDATE class_student_mapper SET semester_id = 1 WHERE semester_id = 0;

ALTER TABLE class_student_mapper ADD CONSTRAINT fk_class_student_mapper_semester_id FOREIGN KEY (semester_id) REFERENCES semester(semester_id) ON DELETE CASCADE;

-- Add the session_id column with the foreign key reference in class_student_mapper

ALTER TABLE class_student_mapper ADD COLUMN session_id INT NOT NULL;

UPDATE class_student_mapper SET session_id = 1 WHERE session_id IS NULL;

UPDATE class_student_mapper SET session_id = 1 WHERE session_id = 0;

ALTER TABLE class_student_mapper ADD CONSTRAINT fk_class_student_mapper_session_id FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE;

update semester set acedmic_year_id =1 where acedmic_year_id =0;

alter table syllabus_details rename column mid_term to internal;

alter table syllabus_details rename column end_term to external;

CREATE TABLE po (
    po_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    institute_id INT NOT NULL,
    acedmic_year_id INT NOT NULL,
    course_id INT NOT NULL,
    name VARCHAR(255),
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Add the semester_id column with the foreign key reference in class_sections

ALTER TABLE class_sections ADD COLUMN semester_id INT NOT NULL;

UPDATE class_sections SET semester_id = 1 WHERE semester_id IS NULL;

UPDATE class_sections SET semester_id = 1 WHERE semester_id = 0;

ALTER TABLE class_sections ADD CONSTRAINT fk_class_sections_semester_id FOREIGN KEY (semester_id) REFERENCES semester(semester_id) ON DELETE CASCADE;

-- Add the semester_id column with the foreign key reference in class

ALTER TABLE class ADD COLUMN semester_id INT NOT NULL;

UPDATE class SET semester_id = 1 WHERE semester_id IS NULL;

UPDATE class SET semester_id = 1 WHERE semester_id = 0;

ALTER TABLE class ADD CONSTRAINT fk_class_semester_id FOREIGN KEY (semester_id) REFERENCES semester(semester_id) ON DELETE CASCADE;

CREATE TABLE co (
    co_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    institute_id INT NOT NULL,
    acedmic_year_id INT NOT NULL,
    syllabus_details_id INT NOT NULL,
    subject_id INT NOT NULL,
    cos_number VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
    FOREIGN KEY (syllabus_details_id) REFERENCES syllabus_details(syllabus_details_id),
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE co_weightage (
    co_weightage_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    institute_id INT NOT NULL,
    acedmic_year_id INT NOT NULL,
    co_id INT NOT NULL,
    term VARCHAR(255),
    total INT,
    name VARCHAR(255),
    mark INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
    FOREIGN KEY (co_id) REFERENCES co(co_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Add the class_section column with the foreign key reference in students

ALTER TABLE students ADD COLUMN class_sections_id INT NOT NULL;

UPDATE students SET class_sections_id = 1 WHERE class_sections_id IS NULL;

UPDATE students SET class_sections_id = 1 WHERE class_sections_id = 0;

ALTER TABLE students ADD CONSTRAINT fk_students_class_sections_id FOREIGN KEY (class_sections_id) REFERENCES class_sections(class_sections_id) ON DELETE CASCADE;

ALTER TABLE fee_type MODIFY COLUMN fee_group_id INT NULL;

-- Add the class_section column with the foreign key reference in students

ALTER TABLE transport_vehicle ADD COLUMN institute_id INT NOT NULL;

UPDATE transport_vehicle SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE transport_vehicle SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE transport_vehicle ADD CONSTRAINT fk_students_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

ALTER TABLE fee_invoice ADD COLUMN invoice_number VARCHAR(255);

-- Add the semester_id column with the foreign key reference in fee_invoice

ALTER TABLE fee_invoice ADD COLUMN student_id INT NOT NULL;

UPDATE fee_invoice SET student_id = 1 WHERE student_id IS NULL;

UPDATE fee_invoice SET student_id = 1 WHERE student_id = 0;

ALTER TABLE fee_invoice ADD CONSTRAINT fk_class_student_id FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;

ALTER TABLE fee_type ADD COLUMN fee_value VARCHAR(255);

-- Add the semester_id column with the foreign key reference in session

ALTER TABLE session ADD COLUMN course_id INT NOT NULL;

UPDATE session SET course_id = 1 WHERE course_id IS NULL;

UPDATE session SET course_id = 1 WHERE course_id = 0;

ALTER TABLE session ADD CONSTRAINT fk_courses_id FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE;

-- Add the session_id column with the foreign key reference in class

ALTER TABLE class ADD COLUMN session_id INT NOT NULL;

UPDATE class SET session_id = 1 WHERE session_id IS NULL;

UPDATE class SET session_id = 1 WHERE session_id = 0;

ALTER TABLE class ADD CONSTRAINT fk_class_session_id FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE;

-- Add the session_id column with the foreign key reference in class_sections

ALTER TABLE class_sections ADD COLUMN session_id INT NOT NULL;

UPDATE class_sections SET session_id = 1 WHERE session_id IS NULL;

UPDATE class_sections SET session_id = 1 WHERE session_id = 0;

ALTER TABLE class_sections ADD CONSTRAINT fk_session_id FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE;

ALTER TABLE session DROP FOREIGN KEY fk_courses_id;

ALTER TABLE session DROP COLUMN course_id;

CREATE TABLE fee_plan (
    fee_plan_id INT PRIMARY KEY AUTO_INCREMENT,
    institute_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_feeplan_institute FOREIGN KEY (institute_id) REFERENCES institute (institute_id),
    CONSTRAINT fk_feeplan_createdby FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_feeplan_updatedby FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

CREATE TABLE fee_plan_type (
    fee_plan_type_id INT PRIMARY KEY AUTO_INCREMENT,
    fee_plan_id INT NOT NULL,
    fee_type_id INT,
    due_date DATETIME,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_feeplantype_feeplan FOREIGN KEY (fee_plan_id) REFERENCES fee_plan (fee_plan_id),
    CONSTRAINT fk_feeplantype_feetype FOREIGN KEY (fee_type_id) REFERENCES fee_type (fee_type_id),
    CONSTRAINT fk_feeplantype_createdby FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_feeplantype_updatedby FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

CREATE TABLE fee_plan_semester (
    fee_plan_semester_id INT PRIMARY KEY AUTO_INCREMENT,
    fee_plan_id INT NOT NULL,
    semester_id INT,
    due_date DATETIME,
    amount INT,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_feeplansemester_feeplan FOREIGN KEY (fee_plan_id) REFERENCES fee_plan (fee_plan_id),
    CONSTRAINT fk_feeplansemester_semester FOREIGN KEY (semester_id) REFERENCES semester (semester_id),
    CONSTRAINT fk_feeplansemester_createdby FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_feeplansemester_updatedby FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

-- Add the fee_plan_id column with the foreign key reference in students

ALTER TABLE students ADD COLUMN fee_plan_id INT NOT NULL;

UPDATE students SET fee_plan_id = 1 WHERE fee_plan_id IS NULL;

UPDATE students SET fee_plan_id = 1 WHERE fee_plan_id = 0;

ALTER TABLE students ADD CONSTRAINT fk_fee_plan_id FOREIGN KEY (fee_plan_id) REFERENCES fee_plan(fee_plan_id) ON DELETE CASCADE;

ALTER TABLE fee_invoice DROP FOREIGN KEY fee_invoice_ibfk_1;

ALTER TABLE fee_invoice DROP COLUMN fee_group_id;

ALTER TABLE fee_invoice ADD COLUMN reference_number VARCHAR(255) NULL;

ALTER TABLE fee_invoice_details DROP FOREIGN KEY fee_invoice_details_ibfk_2;

ALTER TABLE fee_invoice_details DROP COLUMN fee_type_id;

-- Add the fee_plan_id column with the foreign key reference in fee_invoice

ALTER TABLE fee_invoice ADD COLUMN fee_plan_id INT NOT NULL;

UPDATE fee_invoice SET fee_plan_id = 1 WHERE fee_plan_id IS NULL;

UPDATE fee_invoice SET fee_plan_id = 1 WHERE fee_plan_id = 0;

ALTER TABLE fee_invoice ADD CONSTRAINT fk_fees_plan_id FOREIGN KEY (fee_plan_id) REFERENCES fee_plan(fee_plan_id) ON DELETE CASCADE;

-- Add the fee_plan_type_id column with the foreign key reference in fee_invoice_details

ALTER TABLE fee_invoice_details ADD COLUMN fee_plan_type_id INT DEFAULT NULL;

UPDATE fee_invoice_details SET fee_plan_type_id = 1 WHERE fee_plan_type_id IS NULL;

UPDATE fee_invoice_details SET fee_plan_type_id = 1 WHERE fee_plan_type_id = 0;

ALTER TABLE fee_invoice_details ADD CONSTRAINT fk_fee_invoice_plan_id FOREIGN KEY (fee_plan_type_id) REFERENCES fee_plan_type (fee_plan_type_id) ON DELETE CASCADE;

-- Add the fee_plan_semester_id column with the foreign key reference in fee_invoice_details

ALTER TABLE fee_invoice_details ADD COLUMN fee_plan_semester_id INT DEFAULT NULL;

UPDATE fee_invoice_details SET fee_plan_semester_id = 1 WHERE fee_plan_semester_id IS NULL;

UPDATE fee_invoice_details SET fee_plan_semester_id = 1 WHERE fee_plan_semester_id = 0;

ALTER TABLE fee_invoice_details ADD CONSTRAINT fk_fee_plan_semester_id FOREIGN KEY (fee_plan_semester_id) REFERENCES fee_plan_semester(fee_plan_semester_id) ON DELETE CASCADE;