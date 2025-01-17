INSERT INTO employee_code_master (code_master_type) VALUES 
('Genre'),
('Aisle'),
('Shelf');

CREATE TABLE library_creation (
    library_creation_id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    name VARCHAR(255),
    books_to_issued BOOLEAN DEFAULT FALSE,
    issued_from_book_bank BOOLEAN DEFAULT FALSE,
    library_fine BOOLEAN DEFAULT FALSE,
    library_transaction BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE library_authority (
    library_authority_id INT AUTO_INCREMENT PRIMARY KEY,
    library_creation_id INT NOT NULL,
    employee_id INT NOT NULL,
    user_name VARCHAR(255),
    can_waive_off_fine BOOLEAN DEFAULT FALSE,
    default_library BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (library_creation_id) REFERENCES library_creation(library_creation_id),
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE library_add_item (
    library_add_item_id INT AUTO_INCREMENT PRIMARY KEY,
    library_creation_id INT NOT NULL,
    name VARCHAR(255),
    author VARCHAR(255),
    publisher VARCHAR(255) NOT NULL,
    genre INT NOT NULL,
    aisle INT NOT NULL,
    shelf INT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (library_creation_id) REFERENCES library_creation (library_creation_id),
    FOREIGN KEY (genre) REFERENCES employee_code_master_type (employee_code_master_type_id),
    FOREIGN KEY (aisle) REFERENCES employee_code_master_type (employee_code_master_type_id),
    FOREIGN KEY (shelf) REFERENCES employee_code_master_type (employee_code_master_type_id),
    FOREIGN KEY (created_by) REFERENCES users (user_id),
    FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

CREATE TABLE time_table_creation (
    time_table_creation_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    applicable_period INT NOT NULL,
    maximum_period INT NOT NULL,
    starting_time VARCHAR(255) NOT NULL,
    start_time VARCHAR(255),
    end_time VARCHAR(255),
    period_length INT NOT NULL,
    period_gap INT NOT NULL,
    week_off JSON NOT NULL,
    type VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at DATETIME NULL,
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (applicable_period) REFERENCES employee_code_master_type(employee_code_master_type_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE faculity_load (
    faculity_load_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    defined_load INT,
    current_load VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE time_table_create (
    time_table_create_id INT AUTO_INCREMENT PRIMARY KEY,
    time_table_creation_id INT NOT NULL,
    teacher_subject_mapping_id INT NOT NULL,
    teacher_section_mapping_id INT NOT NULL,
    day VARCHAR(255),
    period INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at DATETIME NULL,
    FOREIGN KEY (time_table_creation_id) REFERENCES time_table_creation(time_table_creation_id),
    FOREIGN KEY (teacher_subject_mapping_id) REFERENCES teacher_subject_mapping(teacher_subject_mapping_id),
    FOREIGN KEY (teacher_section_mapping_id) REFERENCES teacher_section_mapping(teacher_section_mapping_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- CREATE TABLE library_author_details (
--     library_author_details_id INT AUTO_INCREMENT PRIMARY KEY,
--     library_add_item_id INT NOT NULL,
--     author_first INT NOT NULL,
--     author_second INT NOT NULL,
--     author_third INT NOT NULL,
--     author_fourth INT NOT NULL,
--     author_fifth INT NOT NULL,
--     author_six INT NOT NULL,
--     editor VARCHAR(255),
--     translator VARCHAR(255),
--     compailer VARCHAR(255),
--     remarks VARCHAR(255),
--     created_by INT NOT NULL,
--     updated_by INT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
--     deleted_at TIMESTAMP NULL,
--     FOREIGN KEY (library_add_item_id) REFERENCES library_add_item (library_add_item_id),
--     FOREIGN KEY (author_first) REFERENCES employee_code_master_type (employee_code_master_type_id),
--     FOREIGN KEY (author_second) REFERENCES employee_code_master_type (employee_code_master_type_id),
--     FOREIGN KEY (author_third) REFERENCES employee_code_master_type (employee_code_master_type_id),
--     FOREIGN KEY (author_fourth) REFERENCES employee_code_master_type (employee_code_master_type_id),
--     FOREIGN KEY (author_fifth) REFERENCES employee_code_master_type (employee_code_master_type_id),
--     FOREIGN KEY (author_six) REFERENCES employee_code_master_type (employee_code_master_type_id),
--     FOREIGN KEY (created_by) REFERENCES users (user_id),
--     FOREIGN KEY (updated_by) REFERENCES users (user_id)
-- );

-- CREATE TABLE library_multiple_book_details (
--     library_multiple_book_detail_id INT AUTO_INCREMENT PRIMARY KEY,
--     library_add_item_id INT NOT NULL,
--     starting_accession_number VARCHAR(255),
--     quantity_of_book VARCHAR(255),
--     prefix VARCHAR(255),
--     suffix VARCHAR(255),
--     starting_isbn_number VARCHAR(255),
--     isbn_prefix VARCHAR(255),
--     isbn_suffix VARCHAR(255),
--     created_by INT NOT NULL,
--     updated_by INT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
--     deleted_at TIMESTAMP NULL,
--     FOREIGN KEY (library_add_item_id) REFERENCES library_add_item (library_add_item_id),
--     FOREIGN KEY (created_by) REFERENCES users (user_id),
--     FOREIGN KEY (updated_by) REFERENCES users (user_id)
-- );

ALTER TABLE employee
DROP COLUMN resume_number, 
DROP COLUMN body_sign;

ALTER TABLE students
DROP COLUMN form_number,
DROP COLUMN enquiry_number,
DROP COLUMN telephone_number,
DROP COLUMN last_scholar_number,
DROP COLUMN online_admission_number,
DROP COLUMN previous_institute,
DROP COLUMN shifting_reason,
DROP COLUMN specialization_reason,
DROP COLUMN total_seat_category,
DROP COLUMN remaining_seat_category,
DROP COLUMN advance_received,
DROP COLUMN pay_out,
DROP COLUMN pan_number;

DELETE FROM students_meta_data
WHERE codes IN (
    SELECT employee_code_master_id
    FROM employee_code_master
    WHERE code_master_type IN ('formName', 'examCenterIst', 'examCenterIInd', 'consultant', 'specializationMinor', 'payOut')
);

DELETE FROM employee_code_master_type
WHERE employee_code_master_id IN (
    SELECT employee_code_master_id
    FROM employee_code_master
    WHERE code_master_type IN ('formName', 'examCenterIst', 'examCenterIInd', 'consultant', 'specializationMinor', 'payOut')
);

DELETE FROM employee_code_master
WHERE code_master_type IN ('formName', 'examCenterIst', 'examCenterIInd','consultant','specializationMinor','payOut');

CREATE TABLE library_member (
    library_member_id INT PRIMARY KEY AUTO_INCREMENT,
    library_creation_id INT NOT NULL,
    employee_id INT,
    student_id INT,
    member_type VARCHAR(255) NOT NULL,
    member_id VARCHAR(255) NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (library_creation_id) REFERENCES library_creation(library_creation_id),
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

INSERT INTO employee_code_master (code_master_type) VALUES
('memberType');

CREATE TABLE library_issue_book (
    library_issue_book_id INT AUTO_INCREMENT PRIMARY KEY,
    library_add_item_id INT NOT NULL,
    library_member_id INT NOT NULL,
    issue_date DATETIME DEFAULT NULL,
    return_date DATETIME DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Issue',
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (library_add_item_id) REFERENCES library_add_item(library_add_item_id),
    FOREIGN KEY (library_member_id) REFERENCES library_member(library_member_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_sections_id INT NOT NULL,
    time_table_create_id INT NOT NULL,
    date TIMESTAMP NULL,
    notes VARCHAR(255) NULL,
    description VARCHAR(255) NULL,
    attendance_status VARCHAR(255) NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (class_sections_id) REFERENCES class_sections(class_sections_id),
    FOREIGN KEY (time_table_create_id) REFERENCES time_table_create(time_table_create_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE class_room_section (
    class_room_section_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE fee_group (
    fee_group_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE fee_type (
    fee_type_id INT AUTO_INCREMENT PRIMARY KEY,
    fee_group_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (fee_group_id) REFERENCES fee_group(fee_group_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE fee_invoice (
    fee_invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    fee_group_id INT NOT NULL,
    class_student_mapper_id INT NOT NULL,
    created_date DATETIME NOT NULL,
    due_date DATETIME NOT NULL,
    payment_status VARCHAR(255),
    payment_method VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (fee_group_id) REFERENCES fee_group(fee_group_id),
    FOREIGN KEY (class_student_mapper_id) REFERENCES class_student_mapper(class_student_mapper_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE fee_invoice_details (
    fee_invoice_details_id INT AUTO_INCREMENT PRIMARY KEY,
    fee_invoice_id INT NOT NULL,
    fee_type_id INT NOT NULL,
    amount FLOAT,
    waiver FLOAT,
    sub_total FLOAT,
    paid_amount FLOAT,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (fee_invoice_id) REFERENCES fee_invoice(fee_invoice_id),
    FOREIGN KEY (fee_type_id) REFERENCES fee_type(fee_type_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE users
ADD COLUMN role VARCHAR(255) NULL;

CREATE TABLE user_student_employee (
    user_student_employee_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    user_id INT NOT NULL,
    student_id INT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

ALTER TABLE users
ADD COLUMN dummy_password VARCHAR(255) NULL,
ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'active';

ALTER TABLE users
DROP COLUMN deleted_at;

ALTER TABLE users
ADD COLUMN deleted_at DATETIME NULL;

CREATE TABLE role (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE permission (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    permission VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE role_permission_mapping (
    role_permission_mapping_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT ,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (role_id) REFERENCES role(role_id),
    FOREIGN KEY (permission_id) REFERENCES permission(permission_id)
);

CREATE TABLE user_role_permission (
    user_role_permission_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (role_id) REFERENCES role(role_id),
    FOREIGN KEY (permission_id) REFERENCES permission(permission_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

ALTER TABLE permission ADD COLUMN module_name VARCHAR(255) NOT NULL;

CREATE TABLE room_type (
    room_type_id INT AUTO_INCREMENT PRIMARY KEY,
    room_type_name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE dormitory_list (
    dormitory_list_id INT AUTO_INCREMENT PRIMARY KEY,
    dormitory_name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    intake INT NOT NULL,
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE add_dormitory (
    add_dormitory_id INT AUTO_INCREMENT PRIMARY KEY,
    dormitory INT NOT NULL,
    room_number INT NOT NULL,
    type INT NOT NULL,
    number_of_bed INT NOT NULL,
    cost_per_bed INT NOT NULL,
    description VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (dormitory) REFERENCES dormitory_list(dormitory_list_id),
    FOREIGN KEY (type) REFERENCES room_type(room_type_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE exam_type (
    exam_type_id INT AUTO_INCREMENT PRIMARY KEY,
    exam_name VARCHAR(255) NOT NULL,
    average_passing_mark INT DEFAULT NULL,
    is_average_passing_mark BOOLEAN NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE exam_setup (
    exam_setup_id INT AUTO_INCREMENT PRIMARY KEY,
    exam_system INT NOT NULL,
    exam_type_id INT NOT NULL,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    course_id INT,
    total_marks INT NOT NULL,
    mark_distribution JSON,
    teacher_id INT,
    exam_date DATE,
    start_time TIME,
    end_time TIME,
    room_id VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (exam_type_id) REFERENCES exam_type(exam_type_id),
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE `exam_setup` (
    `exam_setup_id` INT AUTO_INCREMENT PRIMARY KEY,
    `exam_system` INT NOT NULL,
    `exam_type_id` INT NOT NULL,
    `class_id` INT NOT NULL,
    `subject_id` INT NOT NULL,
    `course_id` INT,
    `total_marks` INT NOT NULL,
    `mark_distribution` JSON,
    `teacher_id` INT,
    `exam_date` DATE,
    `start_time` TIME,
    `end_time` TIME,
    `room_id` INT,
    `created_by` INT NOT NULL,
    `updated_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    FOREIGN KEY (`exam_type_id`) REFERENCES `exam_type`(`exam_type_id`),
    FOREIGN KEY (`subject_id`) REFERENCES `subject`(`subject_id`),
    FOREIGN KEY (`course_id`) REFERENCES `course`(`course_id`),
    FOREIGN KEY (`teacher_id`) REFERENCES `employee`(`employee_id`),
    FOREIGN KEY (`room_id`) REFERENCES `class_room_section`(`class_room_section_id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`)
);

CREATE TABLE exam_attendance (
    exam_attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    exam_setup_id INT NOT NULL,
    student_id INT NOT NULL,
    attendance_status ENUM('Present', 'Absent') NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (exam_setup_id) REFERENCES exam_setup(exam_setup_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);




