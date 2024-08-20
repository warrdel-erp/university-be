CREATE TABLE employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    campus_id INT NOT NULL,
    institute_id INT NOT NULL,
    resume_number VARCHAR(255),
    employee_photo JSON,
    employee_signature JSON,
    employee_Code VARCHAR(255) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(255),
    date_of_birth DATE,
    anniversary_date DATE,
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    body_sign VARCHAR(255),
    working_hours VARCHAR(255),
    aicte_code VARCHAR(255),
    `from` DATE,
    `to` DATE,
    vehicle_number VARCHAR(255),
    driving_license VARCHAR(255),
    driving_license_expire_date DATE,
    pick_color VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (campus_id) REFERENCES campus(campus_id),
    FOREIGN KEY (institute_id) REFERENCES institute(institute_id)
);

CREATE TABLE employee_address (
    employee_address_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    p_address VARCHAR(255),
    p_pincode INT,
    c_address VARCHAR(255),
    c_pincode INT,
    phone_number VARCHAR(255),
    mobile_number VARCHAR(255),
    offical_mobile_number VARCHAR(255),
    offical_email_id VARCHAR(255),
    personal_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_office (
    employee_office_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    joining_date DATE DEFAULT NULL,
    confirmation_date DATE DEFAULT NULL,
    relieving_date DATE DEFAULT NULL,
    retirement_date DATE DEFAULT NULL,
    transfer_date DATE DEFAULT NULL,
    resignation_date DATE DEFAULT NULL,
    notice_period INT DEFAULT NULL,
    employee_file_number VARCHAR(255) DEFAULT NULL,
    ist_active BOOLEAN DEFAULT NULL,
    bank_name VARCHAR(255) DEFAULT NULL,
    account_number VARCHAR(255) DEFAULT NULL,
    ifsc_code VARCHAR(255) DEFAULT NULL,
    iind_active BOOLEAN DEFAULT NULL,
    contract_based BOOLEAN DEFAULT NULL,
    gpf VARCHAR(255) DEFAULT NULL,
    esi_number VARCHAR(255) DEFAULT NULL,
    uan_number VARCHAR(255) DEFAULT NULL,
    lecture_based BOOLEAN DEFAULT NULL,
    pf_number VARCHAR(255) DEFAULT NULL,
    pan_number VARCHAR(255) DEFAULT NULL,
    voter_id VARCHAR(255) DEFAULT NULL,
    aadhar_number VARCHAR(255) DEFAULT NULL,
    spouse_name VARCHAR(255) DEFAULT NULL,
    nominee_name VARCHAR(255) DEFAULT NULL,
    office_extension_number VARCHAR(255) DEFAULT NULL,
    employee_rank VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_rolls (
    employee_rolls_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    roles VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_skill (
    employee_skill_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    name VARCHAR(255) DEFAULT NULL,
    experience_in_year INT DEFAULT NULL,
    experience_in_month VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_documents (
    employee_documents_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    from_year DATE DEFAULT NULL,
    to_year DATE DEFAULT NULL,
    university_board VARCHAR(255) DEFAULT NULL,
    medical_council_name VARCHAR(255) DEFAULT NULL,
    medical_registration_number VARCHAR(255) DEFAULT NULL,
    medical_council_registration_date VARCHAR(255) DEFAULT NULL,
    medical_registration_expiry_date VARCHAR(255) DEFAULT NULL,
    percentage VARCHAR(255) DEFAULT NULL,
    remarks VARCHAR(255) DEFAULT NULL,
    pursuing BOOLEAN DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_qualification (
    employee_qualification_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    document_copy VARCHAR(255) DEFAULT NULL,
    received_date DATE NOT NULL,
    returned_date DATE DEFAULT NULL,
    attachment JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_experiance (
    employee_experiance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    organization VARCHAR(255) DEFAULT NULL,
    desigation VARCHAR(255) DEFAULT NULL,
    from_date DATE DEFAULT NULL,
    to_date DATE DEFAULT NULL,
    total_experince_years INT DEFAULT NULL,
    total_experince_months INT DEFAULT NULL,
    total_experince_days INT DEFAULT NULL,
    last_salary FLOAT DEFAULT NULL,
    remarks VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_achievements (
    employee_achievements_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    no_of_times FLOAT DEFAULT NULL,
    discipline VARCHAR(255) DEFAULT NULL,
    name_of VARCHAR(255) DEFAULT NULL,
    date VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_ward (
    employee_ward_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    ward_name VARCHAR(255) NOT NULL,
    study_in VARCHAR(255) DEFAULT NULL,
    annual_fees FLOAT DEFAULT NULL,
    date_of_birth DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_activity (
    employee_activity_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    activity VARCHAR(255) DEFAULT NULL,
    month_year DATE DEFAULT NULL,
    remarks VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_reference (
    employee_reference_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) DEFAULT NULL,
    mobile_number VARCHAR(255) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_research (
    employee_research_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    thesis_name VARCHAR(255) NOT NULL,
    associate VARCHAR(255) DEFAULT NULL,
    period_from DATE NOT NULL,
    `to` DATE NOT NULL,
    institution VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE employee_long_leave (
    employee_long_leave_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date_of_leaving DATE NULL,
    date_of_rejoining DATE,
    remark VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);