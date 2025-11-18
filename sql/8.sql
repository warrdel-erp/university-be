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