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
