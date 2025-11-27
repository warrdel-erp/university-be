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