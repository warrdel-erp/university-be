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