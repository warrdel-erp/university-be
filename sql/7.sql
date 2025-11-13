ALTER TABLE fee_plan ADD COLUMN plan_type VARCHAR(255);

CREATE TABLE fee_new_invoice (
    fee_new_invoice_id INT PRIMARY KEY AUTO_INCREMENT,
    fee_plan_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    End_date DATE,
    total INT,
    InvoiceNumber VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_fee_plan FOREIGN KEY (fee_plan_id) REFERENCES fee_plan(fee_plan_id),
    CONSTRAINT fk_fee_new_invoice_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_fee_new_invoice_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE fee_invoice_details DROP FOREIGN KEY fk_fee_plan_semester_id;

DROP TABLE IF EXISTS fee_plan_semester;

CREATE TABLE fee_plan_semester (
    fee_plan_semester_id INT AUTO_INCREMENT PRIMARY KEY,
    fee_new_invoice_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    fee INT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_fee_plan_semester_fee_new_invoice FOREIGN KEY (fee_new_invoice_id) REFERENCES fee_new_invoice(fee_new_invoice_id),
    CONSTRAINT fk_fee_plan_semester_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_fee_plan_semester_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE fee_invoice_details DROP FOREIGN KEY fk_fee_invoice_plan_id;

DROP TABLE IF EXISTS fee_plan_type;

CREATE TABLE fee_plan_type (
  fee_plan_type_id INT AUTO_INCREMENT PRIMARY KEY,
  fee_new_invoice_id INT NOT NULL,
  fee_type_id INT DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  fee INT NOT NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_fee_plan_type_invoice FOREIGN KEY (fee_new_invoice_id) REFERENCES fee_new_invoice(fee_new_invoice_id),
  CONSTRAINT fk_fee_plan_type_type FOREIGN KEY (fee_type_id) REFERENCES fee_type(fee_type_id),
  CONSTRAINT fk_fee_plan_type_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_fee_plan_type_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE students ADD COLUMN fee_status BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE student_invoice_mapper (
  student_invoice_mapper_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  university_id INT NOT NULL,
  fee_new_invoice_id INT NULL,
  fee_plan_id INT NULL,
  invoice_date DATETIME NULL,
  invoice_number VARCHAR(255) NULL,
  invoice_status BOOLEAN NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_simb_student FOREIGN KEY (student_id) REFERENCES students(student_id),
  CONSTRAINT fk_simb_university FOREIGN KEY (university_id) REFERENCES university(university_id),
  CONSTRAINT fk_simb_fee_invoice FOREIGN KEY (fee_new_invoice_id) REFERENCES fee_new_invoice(fee_new_invoice_id),
  CONSTRAINT fk_simb_fee_plan FOREIGN KEY (fee_plan_id) REFERENCES fee_plan(fee_plan_id),
  CONSTRAINT fk_simb_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_simb_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE fee_plan
ADD COLUMN course_id INTEGER,
ADD COLUMN acedmic_year_id INTEGER,
ADD COLUMN session_id INTEGER,
ADD COLUMN university_id INTEGER;

UPDATE fee_plan SET course_id = 1, acedmic_year_id = 1,university_id= 1, session_id = 1 WHERE course_id IS NULL;

ALTER TABLE fee_plan
MODIFY COLUMN course_id INTEGER NOT NULL,
MODIFY COLUMN acedmic_year_id INTEGER NOT NULL,
MODIFY COLUMN session_id INTEGER NOT NULL,
MODIFY COLUMN university_id INTEGER NOT NULL;

ALTER TABLE fee_plan
ADD CONSTRAINT fk_fee_plan_course FOREIGN KEY (course_id) REFERENCES course(course_id),
ADD CONSTRAINT fk_fee_plan_acedmic_year FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
ADD CONSTRAINT fk_fee_plan_session FOREIGN KEY (session_id) REFERENCES session(session_id),
ADD CONSTRAINT fk_fee_plan_university FOREIGN KEY (university_id) REFERENCES university(university_id);

ALTER TABLE fee_invoice_detail_record
  DROP FOREIGN KEY fee_invoice_detail_record_ibfk_1,
  DROP FOREIGN KEY fee_invoice_detail_record_ibfk_2;

ALTER TABLE fee_invoice_detail_record
  DROP COLUMN fee_invoice_id,
  DROP COLUMN fee_invoice_details_id;

ALTER TABLE fee_invoice_detail_record ADD COLUMN student_invoice_mapper_id INTEGER;

UPDATE fee_invoice_detail_record SET student_invoice_mapper_id = 1 WHERE student_invoice_mapper_id IS NULL;

ALTER TABLE feefee_invoice_detail_record_plan MODIFY COLUMN student_invoice_mapper_id INTEGER NOT NULL;

ALTER TABLE fee_invoice_detail_record ADD CONSTRAINT fk_fee_plan_student_invoice_mapper FOREIGN KEY (student_invoice_mapper_id) REFERENCES student_invoice_mapper(student_invoice_mapper_id);

CREATE TABLE lesson (
    lesson_id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    university_id INT NOT NULL,
    subject_id INT NOT NULL,
    acedmic_year_id INT NOT NULL,
    session_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_lesson_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    CONSTRAINT fk_lesson_university FOREIGN KEY (university_id) REFERENCES university(university_id),
    CONSTRAINT fk_lesson_subject FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    CONSTRAINT fk_lesson_acedmic_year FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
    CONSTRAINT fk_lesson_session FOREIGN KEY (session_id) REFERENCES session(session_id),
    CONSTRAINT fk_lesson_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_lesson_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE topic (
    topic_id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    university_id INT NOT NULL,
    lesson_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_topic_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    CONSTRAINT fk_topic_university FOREIGN KEY (university_id) REFERENCES university(university_id),
    CONSTRAINT fk_topic_lesson FOREIGN KEY (lesson_id) REFERENCES lesson(lesson_id),
    CONSTRAINT fk_topic_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_topic_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE sub_topic (
    sub_topic_id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    university_id INT NOT NULL,
    topic_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_subtopic_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    CONSTRAINT fk_subtopic_university FOREIGN KEY (university_id) REFERENCES university(university_id),
    CONSTRAINT fk_subtopic_topic FOREIGN KEY (topic_id) REFERENCES topic(topic_id),
    CONSTRAINT fk_subtopic_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_subtopic_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE lesson_mapping (
    lesson_mapping_id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    topic_id INT NOT NULL,
    university_id INT NOT NULL,
    time_table_mapping_id INT NOT NULL,
    date DATETIME NOT NULL,
    complete_date DATETIME,
    note VARCHAR(255),
    lecture_url VARCHAR(255),
    file JSON,
    status VARCHAR(50) NOT NULL DEFAULT 'inComplete',
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_lesson_mapping_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    CONSTRAINT fk_lesson_mapping_topic FOREIGN KEY (topic_id) REFERENCES topic(topic_id),
    CONSTRAINT fk_lesson_mapping_university FOREIGN KEY (university_id) REFERENCES university(university_id),
    CONSTRAINT fk_lesson_mapping_timetable FOREIGN KEY (time_table_mapping_id) REFERENCES time_table_mapping(time_table_mapping_id),
    CONSTRAINT fk_lesson_mapping_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_lesson_mapping_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE notice (
    notice_id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    university_id INT NOT NULL,
    acedmic_year_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    notice VARCHAR(1000),
    notice_date VARCHAR(50),
    publish_date VARCHAR(50),
    message_to JSON NOT NULL,
    role VARCHAR(255) NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_notice_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    CONSTRAINT fk_notice_university FOREIGN KEY (university_id) REFERENCES university(university_id),
    CONSTRAINT fk_notice_acedmic_year FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
    CONSTRAINT fk_notice_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_notice_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- DROP TABLE IF EXISTS students_address;

-- DROP TABLE IF EXISTS student_cor_address;

ALTER TABLE students
    ADD COLUMN p_address VARCHAR(255) DEFAULT NULL,
    ADD COLUMN p_pincode INT DEFAULT NULL,
    ADD COLUMN p_country VARCHAR(255) DEFAULT NULL,
    ADD COLUMN p_state VARCHAR(255) DEFAULT NULL,
    ADD COLUMN p_city VARCHAR(255) DEFAULT NULL,
    ADD COLUMN c_address VARCHAR(255) DEFAULT NULL,
    ADD COLUMN c_pincode INT DEFAULT NULL,
    ADD COLUMN c_country VARCHAR(255) DEFAULT NULL,
    ADD COLUMN c_state VARCHAR(255) DEFAULT NULL,
    ADD COLUMN c_city VARCHAR(255) DEFAULT NULL,
    ADD COLUMN contact VARCHAR(255) DEFAULT NULL;

ALTER TABLE employee_cor_address DROP FOREIGN KEY employee_cor_address_ibfk_2;
ALTER TABLE employee_cor_address DROP FOREIGN KEY employee_cor_address_ibfk_3;
ALTER TABLE employee_cor_address DROP FOREIGN KEY employee_cor_address_ibfk_4;

ALTER TABLE employee_cor_address 
MODIFY c_country VARCHAR(255) NOT NULL,
MODIFY c_state VARCHAR(255) NOT NULL,
MODIFY c_city VARCHAR(255) NOT NULL;

ALTER TABLE employee_address
ADD COLUMN p_country VARCHAR(255) NULL,
ADD COLUMN p_state VARCHAR(255) NULL,
ADD COLUMN p_city VARCHAR(255) NULL;

CREATE TABLE exam_structure (
    exam_structure_id INT PRIMARY KEY AUTO_INCREMENT,
    acedmic_year_id INT NOT NULL,
    institute_id INT NOT NULL,
    university_id INT NOT NULL,
    course_id INT NOT NULL,
    exam_type VARCHAR(255),
    maximum_Iteration INT,
    jury VARCHAR(255),
    internal VARCHAR(255),
    external VARCHAR(255),
    jury_setup VARCHAR(255),
    permission VARCHAR(255),
    total_marks VARCHAR(255),
    prepared_by VARCHAR(255),
    evaluated_by VARCHAR(255),
    weightage VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_exam_structure_acedmicYear FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
    CONSTRAINT fk_exam_structure_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    CONSTRAINT fk_exam_structure_university FOREIGN KEY (university_id) REFERENCES university(university_id),
    CONSTRAINT fk_exam_structure_course FOREIGN KEY (course_id) REFERENCES course(course_id),
    CONSTRAINT fk_exam_structure_createdBy FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_exam_structure_updatedBy FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE syllabus_unit (
    syllabus_unit_id INT PRIMARY KEY AUTO_INCREMENT,
    university_id INT NOT NULL,
    institute_id INT NOT NULL,
    acedmic_year_id INT NOT NULL,
    session_id INT NOT NULL,
    semester_id INT NOT NULL,
    subject_id INT NOT NULL,
    unit_number INT,
    name VARCHAR(255),
    description VARCHAR(255),
    contact_hours VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_syllabus_unit_university FOREIGN KEY (university_id) REFERENCES university(university_id),
    CONSTRAINT fk_syllabus_unit_session FOREIGN KEY (session_id) REFERENCES session(session_id),
    CONSTRAINT fk_syllabus_unit_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    CONSTRAINT fk_syllabus_unit_acedmicYear FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
    CONSTRAINT fk_syllabus_unit_semester FOREIGN KEY (semester_id) REFERENCES semester(semester_id),
    CONSTRAINT fk_syllabus_unit_subject FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    CONSTRAINT fk_syllabus_unit_createdBy FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_syllabus_unit_updatedBy FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

update employee_code_master set code_master_type = 'Designation' where code_master_type = 'Salutation';

ALTER TABLE syllabus DROP FOREIGN KEY syllabus_ibfk_3;

ALTER TABLE syllabus DROP COLUMN class_sections_id;

-- Add the session_id column with the foreign key reference in exam_structure

ALTER TABLE exam_structure ADD COLUMN session_id INT DEFAULT NULL;

UPDATE exam_structure SET session_id = 1 WHERE session_id IS NULL;

UPDATE exam_structure SET session_id = 1 WHERE session_id = 0;

ALTER TABLE exam_structure ADD CONSTRAINT fk_session_session_id FOREIGN KEY (session_id) REFERENCES session (session_id) ON DELETE CASCADE;

ALTER TABLE exam_structure 
DROP COLUMN exam_type,
DROP COLUMN maximum_Iteration,
DROP COLUMN jury_setup,
DROP COLUMN prepared_by,
DROP COLUMN evaluated_by,
DROP COLUMN weightage;

CREATE TABLE exam_setup_type (
    exam_setup_type_id INT PRIMARY KEY AUTO_INCREMENT,
    exam_structure_id INT NOT NULL,
    exam_type VARCHAR(255),
    maximum_iteration INT,
    jury_setup VARCHAR(255),
    prepared_by VARCHAR(255),
    evaluated_by VARCHAR(255),
    weightage VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_exam_setup_type_examStructure FOREIGN KEY (exam_structure_id) REFERENCES exam_structure(exam_structure_id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_setup_type_createdBy FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_exam_setup_type_updatedBy FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Add the exam_setup_type_id column with the foreign key reference in syllabus_details

ALTER TABLE syllabus_details ADD COLUMN exam_setup_type_id INT DEFAULT NULL;

UPDATE syllabus_details SET exam_setup_type_id = 1 WHERE exam_setup_type_id IS NULL;

UPDATE syllabus_details SET exam_setup_type_id = 1 WHERE exam_setup_type_id = 0;

ALTER TABLE syllabus_details ADD CONSTRAINT fk_exam_setup_type_id_syllabus FOREIGN KEY (exam_setup_type_id) REFERENCES exam_setup_type (exam_setup_type_id) ON DELETE CASCADE;

ALTER TABLE syllabus_details 
drop column internal ,
drop column external ;

ALTER TABLE syllabus_details 
add column marks VARCHAR(255) NULL after total;

ALTER TABLE employee 
add column department VARCHAR(255) NULL;

ALTER TABLE employee
DROP COLUMN short_name,
DROP COLUMN anniversary_date,
DROP COLUMN working_hours,
DROP COLUMN aicte_code,
DROP COLUMN `from`,
DROP COLUMN `to`,
DROP COLUMN vehicle_number,
DROP COLUMN driving_license,
DROP COLUMN driving_license_expire_date;

ALTER TABLE employee 
add column department VARCHAR(255) NULL;

ALTER TABLE employee 
add column employment_type VARCHAR(255) NULL;

create table schedule (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    institute_id INT NOT NULL,
    acedmic_year_id INT NOT NULL,
    schedule_name VARCHAR(100) NOT NULL,
    shift_hours INT NOT NULL,
    min_start_time TIME NOT NULL,
    min_end_time TIME NOT NULL,
    max_start_time TIME NOT NULL,
    max_end_time TIME NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_time TIME NULL,
    accept_extra_hours BOOLEAN NOT NULL DEFAULT FALSE,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_schedule_university FOREIGN KEY (university_id) REFERENCES university(university_id),
    CONSTRAINT fk_schedule_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    CONSTRAINT fk_schedule_acedmic_year FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
    CONSTRAINT fk_schedule_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_schedule_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

create table schedule_assign (
    schedule_assign_id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL,
    employee_id INT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_scheduleassign_schedule FOREIGN KEY (schedule_id) REFERENCES schedule(schedule_id),
    CONSTRAINT fk_scheduleassign_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    CONSTRAINT fk_scheduleassign_createdby FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_scheduleassign_updatedby FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE teacher_attendence (
    teacher_attendence_id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_assign_id INT NOT NULL,
    check_in TIME NULL,
    check_out TIME NULL,
    date DATE NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_teacher_attendence_scheduleassign FOREIGN KEY (schedule_assign_id) REFERENCES schedule_assign(schedule_assign_id),
    CONSTRAINT fk_teacher_attendence_createdby FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_teacher_attendence_updatedby FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE leave_policies (
    policy_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    institute_id INT NOT NULL,
    policy_name VARCHAR(100) NOT NULL,
    total_leaves_per_year INT NOT NULL,
    maximum_number_of_days INT NULL,
    carry_forward BOOLEAN NOT NULL DEFAULT FALSE,
    earned_leave BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_policy_university FOREIGN KEY (university_id) REFERENCES university(university_id),
    CONSTRAINT fk_policy_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    CONSTRAINT fk_policy_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_policy_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);      

CREATE TABLE leave_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    policy_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    reason TEXT NULL,
    status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_request_employee FOREIGN KEY (employee_id) REFERENCES users(user_id),
    CONSTRAINT fk_request_policy FOREIGN KEY (policy_id) REFERENCES leave_policies(policy_id),
    CONSTRAINT fk_request_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
);

CREATE TABLE leave_balance (
    balance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    policy_id INT NOT NULL,
    year INT NOT NULL,
    total_allocated INT NOT NULL,
    used_leaves INT NOT NULL DEFAULT 0,
    remaining_leaves INT NOT NULL,
    CONSTRAINT fk_balance_employee FOREIGN KEY (employee_id) REFERENCES users(user_id),
    CONSTRAINT fk_balance_policy FOREIGN KEY (policy_id) REFERENCES leave_policies(policy_id)
);

ALTER TABLE leave_balance 
  DROP FOREIGN KEY fk_balance_employee,
  DROP INDEX fk_balance_employee,
  DROP COLUMN employee_id;

ALTER TABLE leave_requests
  DROP FOREIGN KEY fk_request_employee,
  DROP INDEX fk_request_employee,
  DROP COLUMN employee_id;

-- Add the employee_id column with the foreign key reference in leave_balance

ALTER TABLE leave_balance ADD COLUMN employee_id INT DEFAULT NULL;

UPDATE leave_balance SET employee_id = 1 WHERE employee_id IS NULL;

UPDATE leave_balance SET employee_id = 1 WHERE employee_id = 0;

ALTER TABLE leave_balance ADD CONSTRAINT fk_leave_employee_id FOREIGN KEY (employee_id) REFERENCES employee (employee_id) ON DELETE CASCADE;

-- Add the employee_id column with the foreign key reference in leave_requests

ALTER TABLE leave_requests ADD COLUMN employee_id INT DEFAULT NULL;

UPDATE leave_requests SET employee_id = 1 WHERE employee_id IS NULL;

UPDATE leave_requests SET employee_id = 1 WHERE employee_id = 0;

ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_employee_id FOREIGN KEY (employee_id) REFERENCES employee (employee_id) ON DELETE CASCADE;

-- Add the employee_id column with the foreign key reference in syllabus

ALTER TABLE syllabus ADD COLUMN session_id INT DEFAULT NULL;

UPDATE syllabus SET session_id = 1 WHERE session_id IS NULL;

UPDATE syllabus SET session_id = 1 WHERE session_id = 0;

ALTER TABLE syllabus ADD CONSTRAINT fk_syllabus_session_id FOREIGN KEY (session_id) REFERENCES session (session_id) ON DELETE CASCADE;

ALTER TABLE students 
MODIFY COLUMN student_status 
ENUM(
  'Cancel Student',
  'Left Student',
  'Long Absent',
  'Non Attendant',
  'active',
  'deactive',
  'transferred',
  'graduated'
) DEFAULT 'active';

ALTER TABLE course ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE course DROP FOREIGN KEY fk_course_acedmic_year_id;

ALTER TABLE course DROP COLUMN acedmic_year_id;

ALTER TABLE students DROP FOREIGN KEY fk_fee_plan_id;

ALTER TABLE students MODIFY COLUMN fee_plan_id INT NULL;

ALTER TABLE students ADD CONSTRAINT fk_fee_plan_id FOREIGN KEY (fee_plan_id) REFERENCES fee_plan(fee_plan_id) ON DELETE CASCADE;

ALTER TABLE exam_structure ADD COLUMN exam_scheduling VARCHAR(255) NOT NULL;

CREATE TABLE exam_structure_schedule_mapper (
  exam_structure_schedule_mapper_id INT AUTO_INCREMENT PRIMARY KEY,
  acedmic_year_id INT NOT NULL,
  institute_id INT NOT NULL,
  university_id INT NOT NULL,
  session_id INT NOT NULL,
  exam_setup_type_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  starting_date DATE DEFAULT NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_exam_schedule_acedmic_year FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
  CONSTRAINT fk_exam_schedule_institute FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
  CONSTRAINT fk_exam_schedule_university FOREIGN KEY (university_id) REFERENCES university(university_id),
  CONSTRAINT fk_exam_schedule_session  FOREIGN KEY (session_id) REFERENCES session(session_id),
  CONSTRAINT fk_exam_schedule_exam_setup_type  FOREIGN KEY (exam_setup_type_id) REFERENCES exam_setup_type(exam_setup_type_id),
  CONSTRAINT fk_exam_schedule_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_exam_schedule_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE exam_schedule (
    exam_schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NULL,
    semester_id INT NULL,
    exam_structure_schedule_mapper_id INT NULL,
    exam_date DATE NOT NULL,
    exam_time TIME NOT NULL,
    type VARCHAR(255) NOT NULL,
    duration VARCHAR(255) NOT NULL,
    is_publish BOOLEAN NOT NULL DEFAULT FALSE,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_exam_schedule_subject FOREIGN KEY (subject_id) REFERENCES subject (subject_id),
    CONSTRAINT fk_exam_schedule_semester FOREIGN KEY (semester_id) REFERENCES semester (semester_id),
    CONSTRAINT fk_exam_schedule_exam_structure_schedule_mapper FOREIGN KEY (exam_structure_schedule_mapper_id) REFERENCES exam_structure_schedule_mapper (exam_structure_schedule_mapper_id),
    CONSTRAINT fk_exam_schedul_created_by FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_exam_schedul_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

ALTER TABLE student_invoice_mapper 
DROP FOREIGN KEY fk_simb_fee_plan,
DROP INDEX fk_simb_fee_plan,
DROP COLUMN fee_plan_id;

ALTER TABLE student_invoice_mapper ADD COLUMN due_date DATETIME NULL;

-- Add the fee_type_id column with the foreign key reference in student_invoice_mapper

ALTER TABLE student_invoice_mapper ADD COLUMN fee_type_id INT DEFAULT NULL;

UPDATE student_invoice_mapper SET fee_type_id = 1 WHERE fee_type_id IS NULL;

UPDATE student_invoice_mapper SET fee_type_id = 1 WHERE fee_type_id = 0;

ALTER TABLE student_invoice_mapper ADD CONSTRAINT fk_invoice_fee_type_id FOREIGN KEY (fee_type_id) REFERENCES fee_type (fee_type_id) ON DELETE CASCADE;

-- Add the employee_id column with the foreign key reference in lesson

ALTER TABLE lesson ADD COLUMN employee_id INT DEFAULT NULL;

UPDATE lesson SET employee_id = 1 WHERE employee_id IS NULL;

UPDATE lesson SET employee_id = 1 WHERE employee_id = 0;

ALTER TABLE lesson ADD CONSTRAINT fk_lesson_employee_id FOREIGN KEY (employee_id) REFERENCES employee (employee_id) ON DELETE CASCADE;