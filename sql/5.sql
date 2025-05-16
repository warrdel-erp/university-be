CREATE TABLE head (
    head_id INT AUTO_INCREMENT PRIMARY KEY,
    campus_id INT NOT NULL,
    institute_id INT NOT NULL,
    university_id INT NOT NULL,
    head_name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(255),
    alternate_number VARCHAR(255),
    register_email VARCHAR(255),
    alternate_email VARCHAR(255),
    address VARCHAR(255),
    university VARCHAR(255),
    type_of_institute VARCHAR(255),
    location VARCHAR(255),
    financial_status VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (campus_id) REFERENCES campus(campus_id),
    FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE account (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP
);

INSERT INTO account (account_name, created_at, updated_at, deleted_at) 
VALUES 
    ('Admin', NOW(), NOW(), NULL),
    ('Academics', NOW(), NOW(), NULL);

CREATE TABLE sub_account (
    sub_account_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    university_id INT NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    alternate_name VARCHAR(255),
    department_code VARCHAR(255),
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES account(account_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE department (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    sub_account_id INT NOT NULL,
    university_id INT NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    department_order  INT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    FOREIGN KEY (sub_account_id) REFERENCES sub_account(sub_account_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    employee_id INT NOT NULL,
    university_id INT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (department_id) REFERENCES department(department_id),
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

INSERT INTO sub_account (
    account_id,
    university_id,
    department_name,
    alternate_name,
    department_code,
    description,
    created_by,
    updated_by
) 
VALUES
    (1, 1, 'Admin', 'Admin', '1', 'Admin for manage department', 1, 1),
    (2, 1, 'Academics', 'Academics', '2', 'Academics for manage department', 2, 2);

CREATE TABLE department_structure (
    department_structure_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    sub_account_id INT NOT NULL,
    parent_account_id INT NOT NULL,
    university_id INT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES account(account_id),
    FOREIGN KEY (sub_account_id) REFERENCES sub_account(sub_account_id),
    FOREIGN KEY (parent_account_id) REFERENCES sub_account(sub_account_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

INSERT INTO department_structure (
    account_id, sub_account_id, parent_account_id, university_id, 
    created_by, updated_by, created_at, updated_at, deleted_at
) 
VALUES 
    (1, 1, 1, 1, 1, 1, NOW(), NOW(), NULL),
    (2, 2, 2, 1, 1, 1, NOW(), NOW(), NULL);

ALTER TABLE employee
ADD COLUMN role_id INT NULL;

UPDATE employee
SET role_id = 1
WHERE role_id IS NULL;

ALTER TABLE employee
ADD CONSTRAINT fk_role_id
    FOREIGN KEY (role_id)
    REFERENCES role(role_id)
ON DELETE CASCADE;

ALTER TABLE subject
ADD COLUMN subject_type VARCHAR(255) NOT NULL;
 
ALTER TABLE elective_subject
ADD COLUMN elective_subject_type VARCHAR(255) NOT NULL;

CREATE TABLE syllabus (
    syllabus_id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    acedmic_year_id INT NOT NULL,
    class_sections_id INT NOT NULL,
    course_id INT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
    FOREIGN KEY (class_sections_id) REFERENCES class_sections(class_sections_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE syllabus_details (
    syllabus_details_id INT AUTO_INCREMENT PRIMARY KEY,
    syllabus_id INT NOT NULL,
    subject_id INT NOT NULL,
    subject_type VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    mid_term VARCHAR(255) NOT NULL,
    end_term VARCHAR(255) NOT NULL,
    total VARCHAR(255) NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (syllabus_id) REFERENCES syllabus(syllabus_id),
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE class (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    course_id INT NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

INSERT INTO class ( university_id, course_id, class_name, created_by, updated_by) 
VALUES (1,1,'Dummy insert',1,1);

ALTER TABLE class_sections
ADD COLUMN class_id INT NULL;

UPDATE class_sections
SET class_id = 1
WHERE class_id IS NULL;

ALTER TABLE class_sections
ADD CONSTRAINT fk_class_id
    FOREIGN KEY (class_id)
    REFERENCES class(class_id)
ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in semester

ALTER TABLE semester
ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE semester
SET acedmic_year_id = 1
WHERE acedmic_year_id IS NULL;

UPDATE semester
SET acedmic_year_id = 1
WHERE acedmic_year_id = 0;

ALTER TABLE semester
ADD CONSTRAINT fk_semester_acedmic_year_id
    FOREIGN KEY (acedmic_year_id)
    REFERENCES acedmic_year(acedmic_year_id)
ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in subject

ALTER TABLE subject ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE subject SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE subject SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE subject ADD CONSTRAINT fk_subject_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in specialization

ALTER TABLE specialization ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE specialization SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE specialization SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE specialization ADD CONSTRAINT fk_specialization_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in section

ALTER TABLE section ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE section SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE section SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE section ADD CONSTRAINT fk_section_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in elective_subject

ALTER TABLE elective_subject ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE elective_subject SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE elective_subject SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE elective_subject ADD CONSTRAINT fk_elective_subject_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in fee_group

ALTER TABLE fee_group ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE fee_group SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE fee_group SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE fee_group ADD CONSTRAINT fk_fee_group_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in transport_route

ALTER TABLE transport_route ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE transport_route SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE transport_route SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE transport_route ADD CONSTRAINT fk_transport_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in employee

ALTER TABLE employee ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE employee SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE employee SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE employee ADD CONSTRAINT fk_employee_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in exam_type

ALTER TABLE exam_type ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE exam_type SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE exam_type SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE exam_type ADD CONSTRAINT fk_exam_type_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in room_type

ALTER TABLE room_type ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE room_type SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE room_type SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE room_type ADD CONSTRAINT fk_room_type_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;

-- Add the acedmic_year_id column with the foreign key reference in dormitory_list

ALTER TABLE dormitory_list ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE dormitory_list SET acedmic_year_id = 1 WHERE acedmic_year_id IS NULL;

UPDATE dormitory_list SET acedmic_year_id = 1 WHERE acedmic_year_id = 0;

ALTER TABLE dormitory_list ADD CONSTRAINT fk_dormitory_list_acedmic_year_id FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id) ON DELETE CASCADE;