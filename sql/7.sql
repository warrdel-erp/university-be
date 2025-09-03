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