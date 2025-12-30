CREATE TABLE library_floor (
    library_floor_id INT AUTO_INCREMENT PRIMARY KEY,
    campus_id INT NOT NULL,
    institute_id INT NOT NULL,
    university_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_floor_campus FOREIGN KEY (university_id) REFERENCES university (university_id),
    CONSTRAINT fk_floor_university FOREIGN KEY (campus_id) REFERENCES campus (campus_id),
    CONSTRAINT fk_floor_institute FOREIGN KEY (institute_id) REFERENCES institute (institute_id),
    CONSTRAINT fk_floor_created_by FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_floor_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

CREATE TABLE library_aisle (
    library_aisle_id INT AUTO_INCREMENT PRIMARY KEY,
    library_floor_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_aisle_floor FOREIGN KEY (library_floor_id) REFERENCES library_floor (library_floor_id),
    CONSTRAINT fk_aisle_created_by FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_aisle_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

CREATE TABLE library_rack (
    library_rack_id INT AUTO_INCREMENT PRIMARY KEY,
    library_aisle_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_rack_aisle FOREIGN KEY (library_aisle_id) REFERENCES library_aisle (library_aisle_id),
    CONSTRAINT fk_rack_created_by FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_rack_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

CREATE TABLE library_row (
    library_row_id INT AUTO_INCREMENT PRIMARY KEY,
    library_rack_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_row_rack FOREIGN KEY (library_rack_id) REFERENCES library_rack (library_rack_id),
    CONSTRAINT fk_row_created_by FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_row_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

ALTER TABLE library_creation
    ADD COLUMN description VARCHAR(255) NULL AFTER name,
    DROP COLUMN books_to_issued,
    DROP COLUMN issued_from_book_bank,
    DROP COLUMN library_fine,
    DROP COLUMN library_transaction,
    DROP COLUMN active;

ALTER TABLE library_creation ADD COLUMN library_floor_id INT DEFAULT NULL;

UPDATE library_creation SET library_floor_id = 1 WHERE library_floor_id IS NULL;

UPDATE library_creation SET library_floor_id = 1 WHERE library_floor_id = 0;

ALTER TABLE library_creation ADD CONSTRAINT fk_library_floor_id FOREIGN KEY (library_floor_id) REFERENCES library_floor (library_floor_id) ON DELETE CASCADE;

CREATE TABLE library_book (
    library_book_id INT AUTO_INCREMENT PRIMARY KEY,
    library_creation_id INT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL,
    authors VARCHAR(255) NULL,
    publisher VARCHAR(255) NULL,
    place_of_publication VARCHAR(255) NULL,
    year_of_publication INT NULL,
    edition VARCHAR(255) NULL,
    series_title VARCHAR(255) NULL,
    volume_number VARCHAR(255) NULL,
    language VARCHAR(255) NULL,
    isbn VARCHAR(255) NULL,
    issn VARCHAR(255) NULL,
    physical_description VARCHAR(255) NULL,
    number_of_pages INT NULL,
    illustrations TINYINT(1) NULL,
    summary TEXT NULL,
    keywords TEXT NULL,
    additional_author TEXT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_book_creation FOREIGN KEY (library_creation_id) REFERENCES library_creation (library_creation_id),
    CONSTRAINT fk_book_created_by FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_book_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

CREATE TABLE library_book_inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    library_book_id INT NOT NULL,
    barcode VARCHAR(255) NULL,
    library_aisle_id INT NOT NULL,
    library_rack_id INT NOT NULL,
    library_row_id INT NOT NULL,
    student_id INT NULL,
    employee_id INT NULL,
    issue_date TIMESTAMP NULL,
    due_date TIMESTAMP NULL,
    status ENUM('available', 'issued') DEFAULT 'available',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_inventory_book FOREIGN KEY (library_book_id) REFERENCES library_book (library_book_id),
    CONSTRAINT fk_inventory_aisle FOREIGN KEY (library_aisle_id) REFERENCES library_aisle (library_aisle_id),
    CONSTRAINT fk_inventory_rack FOREIGN KEY (library_rack_id) REFERENCES library_rack (library_rack_id),
    CONSTRAINT fk_inventory_row FOREIGN KEY (library_row_id) REFERENCES library_row (library_row_id),
    CONSTRAINT fk_inventory_student FOREIGN KEY (student_id) REFERENCES students (student_id),
    CONSTRAINT fk_inventory_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id)
);

ALTER TABLE students MODIFY general_remark TEXT;
ALTER TABLE students MODIFY cancel_reason TEXT;
ALTER TABLE students MODIFY preference TEXT;
ALTER TABLE students MODIFY additional_notes TEXT;

ALTER TABLE students MODIFY p_address TEXT;
ALTER TABLE students MODIFY c_address TEXT;
ALTER TABLE students MODIFY place_of_birth TEXT;

ALTER TABLE students MODIFY bank_name TEXT;
ALTER TABLE students MODIFY account_number TEXT;
ALTER TABLE students MODIFY ifsc_code TEXT;

ALTER TABLE students MODIFY scholar_number VARCHAR(150);
ALTER TABLE students MODIFY father_name VARCHAR(150);
ALTER TABLE students MODIFY mother_name VARCHAR(150);

ALTER TABLE students MODIFY first_name VARCHAR(100);
ALTER TABLE students MODIFY middle_name VARCHAR(100);
ALTER TABLE students MODIFY last_name VARCHAR(100);
ALTER TABLE students MODIFY email VARCHAR(100);
ALTER TABLE students MODIFY parent_email VARCHAR(100);
ALTER TABLE students MODIFY pan_number VARCHAR(100);
ALTER TABLE students MODIFY aadhar_number VARCHAR(100);
ALTER TABLE students MODIFY p_country VARCHAR(100);
ALTER TABLE students MODIFY p_state VARCHAR(100);
ALTER TABLE students MODIFY p_city VARCHAR(100);
ALTER TABLE students MODIFY c_country VARCHAR(100);
ALTER TABLE students MODIFY c_state VARCHAR(100);
ALTER TABLE students MODIFY c_city VARCHAR(100);
ALTER TABLE students MODIFY contact VARCHAR(100);

ALTER TABLE students MODIFY enroll_number VARCHAR(50);
ALTER TABLE students MODIFY phone_number VARCHAR(50);
ALTER TABLE students MODIFY mobile_number VARCHAR(50);
ALTER TABLE students MODIFY parent_number VARCHAR(50);

ALTER TABLE time_table_create ADD COLUMN is_publish TINYINT(1) DEFAULT 0 NULL AFTER class_sections_id;

ALTER TABLE exam_structure
DROP COLUMN exam_scheduling,
DROP COLUMN jury,
DROP COLUMN internal,
DROP COLUMN external,
DROP COLUMN permission;

ALTER TABLE exam_setup_type
DROP COLUMN jury_setup,
DROP COLUMN prepared_by,
DROP COLUMN weightage,
CHANGE COLUMN maximum_Iteration maximum_assessment INT NULL,
ADD COLUMN exam_name VARCHAR(255) NULL,
ADD COLUMN scheduled_by VARCHAR(255) NULL,
ADD COLUMN is_publish TINYINT(1) NOT NULL DEFAULT 0 AFTER evaluated_by;

ALTER TABLE exam_schedule
DROP FOREIGN KEY fk_exam_schedule_exam_structure_schedule_mapper;

ALTER TABLE exam_schedule
DROP COLUMN exam_structure_schedule_mapper_id,
DROP COLUMN is_publish;

ALTER TABLE exam_schedule ADD COLUMN exam_setup_type_id INT DEFAULT NULL;

UPDATE exam_schedule SET exam_setup_type_id = 1 WHERE exam_setup_type_id IS NULL;

UPDATE exam_schedule SET exam_setup_type_id = 1 WHERE exam_setup_type_id = 0;

ALTER TABLE exam_schedule ADD CONSTRAINT fk_exam_setup_type_id FOREIGN KEY (exam_setup_type_id) REFERENCES exam_setup_type (exam_setup_type_id) ON DELETE CASCADE;

ALTER TABLE library_creation 
DROP FOREIGN KEY fk_library_floor_id,
DROP COLUMN library_floor_id;

ALTER TABLE library_floor ADD COLUMN library_creation_id INT DEFAULT NULL;

UPDATE library_floor SET library_creation_id = 1 WHERE library_creation_id IS NULL;

UPDATE library_floor SET library_creation_id = 1 WHERE library_creation_id = 0;

ALTER TABLE library_floor DROP FOREIGN KEY fk_floor_campus;

ALTER TABLE library_floor DROP FOREIGN KEY fk_floor_university;

ALTER TABLE library_floor ADD CONSTRAINT fk_library_floor_university FOREIGN KEY (university_id) REFERENCES university(university_id);

ALTER TABLE library_floor ADD CONSTRAINT fk_library_floor_campus FOREIGN KEY (campus_id) REFERENCES campus(campus_id);

ALTER TABLE library_floor ADD INDEX idx_library_creation_id (library_creation_id);

ALTER TABLE library_floor ADD CONSTRAINT fk_library_creation_id FOREIGN KEY (library_creation_id)REFERENCES library_creation(library_creation_id)ON DELETE CASCADE;

CREATE TABLE internal_assessment (
    exam_assessment_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NULL,
    semester_id INT NULL,
    employee_id INT Null,
    exam_setup_type_id INT NULL,
    type VARCHAR(255) NOT NULL,
    total_marks INT NOT NULL,
    publish_date DATETIME NOT NULL,
    due_date DATETIME NOT NULL,
    weightage INT NULL,
    description VARCHAR(255) NOT NULL,
    file JSON DEFAULT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_internal_assessment_subject FOREIGN KEY (subject_id) REFERENCES subject (subject_id),
    CONSTRAINT fk_internal_assessment_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id),
    CONSTRAINT fk_internal_assessment_semester FOREIGN KEY (semester_id) REFERENCES semester (semester_id),
    CONSTRAINT fk_internal_assessment_setup_type FOREIGN KEY (exam_setup_type_id) REFERENCES exam_setup_type (exam_setup_type_id),
    CONSTRAINT fk_internal_assessment_created_by FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_internal_assessment_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

CREATE TABLE assessment_evalution (
    assessment_evalution_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    employee_id INT NOT NULL,
    exam_assessment_id INT NOT NULL,
    student_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    marks INT NOT NULL,
    comments VARCHAR(255) NOT NULL,
    file JSON DEFAULT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_assessment_evalution_subject FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    CONSTRAINT fk_assessment_evalution_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    CONSTRAINT fk_assessment_evalution_assessment FOREIGN KEY (exam_assessment_id) REFERENCES internal_assessment(exam_assessment_id),
    CONSTRAINT fk_assessment_evalution_student FOREIGN KEY (student_id) REFERENCES students(student_id),
    CONSTRAINT fk_assessment_evalution_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_assessment_evalution_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE time_table_mapping 
ADD COLUMN is_teacher VARCHAR(50) NOT NULL DEFAULT 'Primary' AFTER class_room_section_id,
ADD COLUMN is_Attendence TINYINT(1) NOT NULL DEFAULT 1 AFTER is_teacher;

-- use migration ..