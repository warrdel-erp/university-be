CREATE TABLE transport_route (
    transport_route_id INT AUTO_INCREMENT PRIMARY KEY,
    route_title VARCHAR(255) NOT NULL,
    fare DECIMAL(10, 2) NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE transport_vehicle (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_number VARCHAR(255) NOT NULL,
    vehicle_model VARCHAR(255) NOT NULL,
    made_year VARCHAR(4) NOT NULL,
    employee_id INT NOT NULL,
    note TEXT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
	FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
	FOREIGN KEY (created_by) REFERENCES users(user_id),
	FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE `assign_vehicle` (
    `assign_vehicle_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `transport_route_id` INT NOT NULL,
    `vehicle_id` INT NOT NULL,
    `created_by` INT NOT NULL,
    `updated_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME DEFAULT NULL,
    FOREIGN KEY (`transport_route_id`) REFERENCES `transport_route`(`transport_route_id`),
    FOREIGN KEY (`vehicle_id`) REFERENCES `transport_vehicle`(`vehicle_id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`)
);


ALTER TABLE course
ADD COLUMN capacity VARCHAR(255) NULL;

CREATE TABLE acedmic_year (
    acedmic_year_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    year INT NOT NULL,
    year_title VARCHAR(255) NOT NULL,
    starting_date VARCHAR(255) NOT NULL,
    ending_date VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- add relation student with acedmic_year

ALTER TABLE students
ADD COLUMN acedmic_year_id INT NULL;

UPDATE students
SET acedmic_year_id = 1
WHERE acedmic_year_id IS NULL;

ALTER TABLE students
ADD CONSTRAINT fk_acedmic_year
    FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id)
 ON DELETE CASCADE;

-- remove class_section with acedmic_period_id
ALTER TABLE class_sections
DROP FOREIGN KEY class_sections_ibfk_3;

ALTER TABLE class_sections
DROP COLUMN acedmic_period_id;

-- add reltion class_sections with acedmic_year
ALTER TABLE class_sections
ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE class_sections
SET acedmic_year_id = 1
WHERE acedmic_year_id IS NULL;

 UPDATE class_sections
SET acedmic_year_id = 1
WHERE acedmic_year_id NOT IN (SELECT acedmic_year_id FROM acedmic_year);

DELETE FROM class_sections
WHERE acedmic_year_id NOT IN (SELECT acedmic_year_id FROM acedmic_year);

ALTER TABLE class_sections
ADD CONSTRAINT fk_class_sections_acedmic_year
    FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id)
ON DELETE CASCADE;

-- Add the courseDuration column in course
ALTER TABLE course
ADD COLUMN course_duration INT;

-- Add the acedmicYearId column with the foreign key reference

ALTER TABLE course
ADD COLUMN acedmic_year_id INT NULL;

UPDATE course
SET acedmic_year_id = 1
WHERE acedmic_year_id IS NULL;

ALTER TABLE course
ADD CONSTRAINT fk_course_acedmic_year_id
    FOREIGN KEY (acedmic_year_id)
    REFERENCES acedmic_year(acedmic_year_id)
ON DELETE CASCADE;


CREATE TABLE section (
    section_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    section_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);


-- Add the class column in class_sections
ALTER TABLE class_sections
ADD COLUMN class VARCHAR(255);

-- Add the section_id column with the foreign key reference

ALTER TABLE class_sections
ADD COLUMN section_id INT NULL;

UPDATE class_sections
SET section_id = 1
WHERE section_id IS NULL;

ALTER TABLE class_sections
ADD CONSTRAINT fk_section_id
    FOREIGN KEY (section_id)
    REFERENCES section(section_id)
ON DELETE CASCADE;


-- Add the acedmic_year_id column with the foreign key reference in class_student_mapper

ALTER TABLE class_student_mapper
ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE class_student_mapper
SET acedmic_year_id = 1
WHERE acedmic_year_id IS NULL;

ALTER TABLE class_student_mapper
ADD CONSTRAINT fk_acedmic_year_id
    FOREIGN KEY (acedmic_year_id)
    REFERENCES acedmic_year(acedmic_year_id)
ON DELETE CASCADE;

INSERT INTO employee_code_master (code_master_type)
VALUES
    ('Salutation'),
    ('Gender'),
    ('Religion'),
    ('Blood Group'),
    ('Caste'),
    ('Shift'),
    ('Marital Status'),
    ('Course Level');

INSERT INTO employee_code_master_type (employee_code_master_id, code, description, created_by)
VALUES
    (1, 'Miss', 'Miss1', 1),
    (1, 'Master', 'Master', 1),
    (1, 'Mr.', 'Mr.', 1),
    (1, 'Mrs.', 'Mrs.', 1),
    (2, 'Male', 'Male', 1),
    (2, 'Female', 'Female', 1),
    (2,'Others','Others',1),
    (4, 'A+', 'A+', 1),
    (4, 'A-', 'A-', 1),
    (4, 'B+', 'B-', 1),
    (4, 'AB+', 'AB+', 1),
    (4, 'AB-', 'AB-', 1),
    (4, 'o+', 'o+', 1),
    (4, 'o-', '0-', 1),
    (3, 'Hindu', 'Hindu', 1),
    (3, 'Islam', 'Islam', 1),
    (3, 'Christian', 'Christian', 1),
    (3, 'Sikh', 'Sikh', 1),
    (3, 'Buddh', 'Buddh', 1),
    (3, 'Jain ', 'Jain ', 1),
    (3, 'others', 'others', 1);

ALTER TABLE students
DROP COLUMN multiple_number,
DROP COLUMN register_file_number,
DROP COLUMN whatsapp_number,
DROP COLUMN student_name_alias,
DROP COLUMN employee_references,
DROP COLUMN student_references,
DROP COLUMN eligibity_criteria,
DROP COLUMN total_seat,
DROP COLUMN remaining_seat;


ALTER TABLE students
ADD COLUMN pan_number VARCHAR(255) NULL,
ADD COLUMN additional_notes VARCHAR(255) NULL,
ADD COLUMN bank_name VARCHAR(255) NULL,
ADD COLUMN account_number VARCHAR(255) NULL,
ADD COLUMN ifsc_code VARCHAR(255) NULL;

ALTER TABLE fee_type
MODIFY COLUMN description VARCHAR(255) NULL;

ALTER TABLE fee_group
MODIFY COLUMN description VARCHAR(255) NULL;

CREATE TABLE holiday (
    holiday_id INT AUTO_INCREMENT PRIMARY KEY,
    date DATETIME NOT NULL,
    event VARCHAR(255) NULL,
    name VARCHAR(255) NULL,
    remark VARCHAR(255) NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE time_table_name (
    time_table_name_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at DATETIME NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

INSERT INTO time_table_name (name, created_by, updated_by)
VALUES ('Time Table', 1, 1);

ALTER TABLE time_table_creation
ADD COLUMN time_table_name_id INT NULL;

UPDATE time_table_creation
SET time_table_name_id = 1
WHERE time_table_name_id IS NULL;

ALTER TABLE time_table_creation
ADD CONSTRAINT fk_time_table_name_id
    FOREIGN KEY (time_table_name_id)
    REFERENCES time_table_name(time_table_name_id)
ON DELETE CASCADE;

ALTER TABLE time_table_creation
DROP FOREIGN KEY time_table_creation_ibfk_2;

ALTER TABLE time_table_creation
DROP COLUMN applicable_period;

ALTER TABLE time_table_creation
DROP FOREIGN KEY time_table_creation_ibfk_1;

ALTER TABLE time_table_creation
DROP COLUMN course_id;


ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_3;

DROP TABLE time_table_create;

CREATE TABLE time_table_create (
    time_table_create_id INT AUTO_INCREMENT PRIMARY KEY,
    time_table_name_id INT NOT NULL,
    course_id INT NOT NULL,
    acedmic_year_id INT NOT NULL,
    class_sections_id INT NOT NULL,
    campus_id INT NOT NULL,
    starting_date DATE NOT NULL,
    ending_date DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (time_table_name_id) REFERENCES time_table_name(time_table_name_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
    FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE,
    FOREIGN KEY (class_sections_id) REFERENCES class_sections(class_sections_id) ON DELETE CASCADE,
    FOREIGN KEY (campus_id) REFERENCES campus(campus_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE time_table_mapping (
  time_table_mapping_id INT AUTO_INCREMENT PRIMARY KEY,
  time_table_name_id INT NOT NULL,
  time_table_create_id INT NOT NULL,
  time_table_creation_id INT NOT NULL,
  employee_id INT DEFAULT NULL,
  teacher_subject_mapping_id INT NOT NULL,
  class_room_section_id INT NOT NULL,
  is_same_teacher BOOLEAN DEFAULT TRUE,
  day VARCHAR(255) NOT NULL,
  period INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  deleted_at DATETIME DEFAULT NULL,
  FOREIGN KEY (time_table_name_id) REFERENCES time_table_name(time_table_name_id),
  FOREIGN KEY (time_table_create_id) REFERENCES time_table_create(time_table_create_id),
  FOREIGN KEY (time_table_creation_id) REFERENCES time_table_creation(time_table_creation_id),
  FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
  FOREIGN KEY (teacher_subject_mapping_id) REFERENCES teacher_subject_mapping(teacher_subject_mapping_id),
  FOREIGN KEY (class_room_section_id) REFERENCES class_room_section(class_room_section_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id),
  FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE elective_subject (
    elective_subject_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    course_id INT DEFAULT NULL,
    specialization_id INT DEFAULT NULL,
    elective_subject_name VARCHAR(255) NOT NULL,
    elective_subject_code VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (specialization_id) REFERENCES specialization(specialization_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE student_elective_subject
DROP FOREIGN KEY student_elective_subject_ibfk_2;

ALTER TABLE student_elective_subject
DROP COLUMN subject_id;

-- Add the elective_subject_id column with the foreign key reference

ALTER TABLE student_elective_subject
ADD COLUMN elective_subject_id INT NULL;

UPDATE student_elective_subject
SET elective_subject_id = 1
WHERE elective_subject_id IS NULL;

ALTER TABLE student_elective_subject
ADD CONSTRAINT fk_elective_subject_id
    FOREIGN KEY (elective_subject_id)
    REFERENCES elective_subject(elective_subject_id)
ON DELETE CASCADE;

-- Add the course_id column with the foreign key reference

ALTER TABLE time_table_creation
ADD COLUMN course_id INT NULL;

UPDATE time_table_creation
SET course_id = 2
WHERE course_id IS NULL;

ALTER TABLE time_table_creation
ADD CONSTRAINT fk_course_id
    FOREIGN KEY (course_id)
    REFERENCES course(course_id)
ON DELETE CASCADE;

ALTER TABLE time_table_creation
ADD COLUMN period_name VARCHAR(255) NOT NULL,
ADD COLUMN is_course BOOLEAN DEFAULT FALSE,
ADD COLUMN is_break BOOLEAN DEFAULT FALSE;

CREATE TABLE building (
    building_id INT AUTO_INCREMENT PRIMARY KEY,
    campus_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (campus_id) REFERENCES campus(campus_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);