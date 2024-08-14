-- settings Table (Master)
CREATE TABLE IF NOT EXISTS settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value JSON NOT NULL,
    setting_type VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- setting Table (Master Data Insert)

    INSERT INTO settings (setting_key, setting_value, setting_type) VALUES 
    ('region', '["Othan than Rajasthan","Rajasthan"]', 'generic'),
    ('additionalCategory', '["OBC(Creamy layer)","OBC(Non-Creamy layer)"]', 'generic'),
    ('religion', '["Bodh","Christian","Hindu","Jain","Muslim","Sikh"]', 'generic'),
    ('caste', '["DEC ST EMPL WARD","General","GENERAL(MINORITY)","Jain Minority","Mart/Ex-Serviceman Ward","minor","Muslim","Muslim Minority","OBC","Other","Physical Handicap","SC","ST","Widow"]', 'generic'),
    ('feePlan', '["B.ARCH 2018-2023(2018-2019)","HOSTEL FEE 2018-2023(2018-2019)"]', 'student'),
    ('feeCategory', '["General","LEET","Reap"]', 'student'),
    ('feeSession', '["2000-2001","2001-2002","2002-2003","2003-2004","2004-2005","2005-2006","2006-2007","2007-2008","2008-2009","2009-2010","2010-2011","2011-2012","2012-2013","2013-2014","2014-2015","2015-2016","2016-2017","2017-2018","2018-2019","2019-2020"]', 'student'),
    ('specializationMinor', '["ID","UD"]', 'student'),
    ('courseMedium', '["ENG"]', 'student'),
    ('studentHouseId', '["ADR","APK","CC","LB"]', 'student'),
    ('consultant', '["GLOBAL COMPUTECH Jaipur","PN ASSOCIATES","R K. ENGINEERING WORKS","PAL ASSOCIATES","FALGUNI ENTERPRISES","ALLIED SALES AGENCIES","B.M. INFOTRADE PVT. LTD.","O.R. AGENCY","FRONTLINE SOLUTIONS","O.B.M. ELECTRONICS & TECHNOLOGY LTD.","AMAZON","LG ELECTRONICS INDIA PVT. LTD","SKYMECH ENGINEERS PVT. LTD.","AGAON ELECTRONICS","R.K. JOINERY (PVT) LTD"]', 'student'),
    ('gender', '["Male","Female","Transgender","Other"]', 'generic'),
    ('bloodGroup', '["A(-)","A(+)","AB(-)","AB(+)","B(-)","B(+)","O(-)","O(+)"]', 'generic'),
    ('formSession', '["2000-2001","2001-2002","2002-2003","2003-2004","2004-2005","2005-2006","2006-2007","2007-2008","2008-2009","2009-2010","2010-2011","2011-2012","2012-2013","2013-2014","2014-2015","2015-2016","2016-2017","2017-2018","2018-2019","2019-2020","2020-2021","2021-2022","2022-2023","2023-2024","2024-2025","2025-2026","2026-2027","2027-2028","2028-2029","2029-2030"]', 'student'),
    ('counselor', '["Brijesh","Shahi Prakash"]', 'student'),
    ('registerClass', '["B.ARCH SEM 1A","B.ARCH SEM 1B","B.ARCH SEM 1C","B.ARCH SEM 2A","B.ARCH SEM 2B","B.ARCH SEM 2C"]', 'student'),
    ('courseOpted', '["B.Arch.","B.Des.","CE","CSE","ECE","EEE","IT","M.Arch.","ME"]', 'student'),
    ('curricularActivity', '["ABC","DEF","GEF","HIJ"]', 'student'),
    ('istExam', '["Delhi","Gurugram"]', 'student'),
    ('iindExam', '["Noida","Jaipur"]', 'student'),
    ('admissionCategory', '["11A","11B","11C"]', 'student'),
    ('nationality', '["Indian"]', 'generic'),
    ('shift', '["Morning","Evening","AfterNoon"]', 'generic'),
    ('country', '["INDIA","USA"]', 'generic'),
    ('state', '["RAJASTHAN","HARYANA","Punjab"]', 'generic'),
    ('city', '["JAIPUR","KOTA","KOTPUTLI","REWARI","GURUGRAM"]', 'generic'),
    ('studentDocument', '["studentPhoto","signature"]', 'student');

CREATE TABLE university (
  university_id INT AUTO_INCREMENT PRIMARY KEY,
  university_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

INSERT INTO university (university_name) VALUES ('aayojan school of architecture');

CREATE TABLE campus (
  campus_id INT AUTO_INCREMENT PRIMARY KEY,
  university_id INT NOT NULL,
  campus_name VARCHAR(255) NOT NULL,
  campus_code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (university_id) REFERENCES university(university_id)
);

CREATE TABLE institute (
  institute_id INT AUTO_INCREMENT PRIMARY KEY,
  campus_id INT NOT NULL,
  university_id INT NOT NULL,
  institute_name VARCHAR(255) NOT NULL,
  institute_code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (campus_id) REFERENCES campus(campus_id),
  FOREIGN KEY (university_id) REFERENCES university(university_id)
);

CREATE TABLE affiliated_university (
  affiliated_university_id INT AUTO_INCREMENT PRIMARY KEY,
  institute_id INT NOT NULL,
  university_id INT NOT NULL,
  affiliated_university_name VARCHAR(255) NOT NULL,
  affiliated_university_code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
  FOREIGN KEY (university_id) REFERENCES university(university_id)
);

CREATE TABLE course (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_level_id INT NOT NULL,
    university_id INT NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    FOREIGN KEY (course_level_id) REFERENCES employee_code_master_type(employee_code_master_type_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id)
);

CREATE TABLE specialization (
    specialization_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    university_id INT NOT NULL,
    specialization_name VARCHAR(255) NOT NULL,
    specialization_code VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id)
);

ALTER TABLE campus
ADD COLUMN latitude FLOAT NULL,
ADD COLUMN longitude FLOAT NULL;

CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    campus_id INT NOT NULL,
    institute_id INT NOT NULL,
    affiliated_university_id INT NOT NULL,
    course_level_id INT NOT NULL,
    course_id INT NOT NULL,
    specialization_id INT NULL,
    form_session ENUM('2000-2001', '2001-2002', '2002-2003', '2003-2004', '2004-2005', '2005-2006', '2006-2007', '2007-2008', '2008-2009', '2009-2010', '2010-2011', '2011-2012', '2012-2013', '2013-2014', '2014-2015', '2015-2016', '2016-2017', '2017-2018', '2018-2019', '2019-2020', '2020-2021', '2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026', '2026-2027', '2027-2028', '2028-2029', '2029-2030') NULL,
    form_name VARCHAR(255) NULL,
    form_number VARCHAR(255) NULL,
    enquiry_number VARCHAR(255) NULL,
    telephone_number VARCHAR(255) NULL,
    scholar_number VARCHAR(255) NOT NULL,
    last_scholar_number VARCHAR(255) NULL,
    enroll_number VARCHAR(255) NULL,
    online_admission_number INT NULL,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255) NULL,
    last_name VARCHAR(255) NULL,
    blood_group ENUM('A(-)', 'A(+)', 'AB(-)', 'AB(+)', 'B(-)', 'B(+)', 'O(-)', 'O(+)') NULL,
    gender ENUM('Male', 'Female', 'Transgender', 'Other') NOT NULL,
    father_name VARCHAR(255) NOT NULL,
    annual_income FLOAT NULL,
    mother_name VARCHAR(255) NULL,
    consultant ENUM('GLOBAL COMPUTECH Jaipur', 'PN ASSOCIATES', 'R K. ENGINEERING WORKS', 'PAL ASSOCIATES', 'FALGUNI ENTERPRISES', 'ALLIED SALES AGENCIES', 'B.M. INFOTRADE PVT. LTD.', 'O.R. AGENCY', 'FRONTLINE SOLUTIONS', 'O.B.M. ELECTRONICS & TECHNOLOGY LTD.', 'AMAZON', 'LG ELECTRONICS INDIA PVT. LTD', 'SKYMECH ENGINEERS PVT. LTD.', 'AGAON ELECTRONICS', 'R.K. JOINERY (PVT) LTD') NULL,
    student_house_id ENUM('ADR', 'APK', 'CC', 'LB') NULL,
    previous_institute VARCHAR(255) NULL,
    shifting_reason VARCHAR(255) NULL,
    counselor ENUM('Brijesh', 'Shahi Prakash') NULL,
    course_medium ENUM('ENG') NULL,
    specialization_minor ENUM('ID', 'UD') NULL,
    register_class ENUM('B.ARCH SEM 1A', 'B.ARCH SEM 1B', 'B.ARCH SEM 1C', 'B.ARCH SEM 2A', 'B.ARCH SEM 2B', 'B.ARCH SEM 2C') NOT NULL,
    specialization_reason VARCHAR(255) NULL,
    course_opted ENUM('B.Arch.', 'B.Des.', 'CE', 'CSE', 'ECE', 'EEE', 'IT', 'M.Arch.', 'ME') NULL,
    eligibity_criteria VARCHAR(255) NULL,
    total_seat INT NULL,
    remaining_seat INT NULL,
    total_seat_category INT NULL,
    remaining_seat_category INT NULL,
    fee_session ENUM('2000-2001', '2001-2002', '2002-2003', '2003-2004', '2004-2005', '2005-2006', '2006-2007', '2007-2008', '2008-2009', '2009-2010', '2010-2011', '2011-2012', '2012-2013', '2013-2014', '2014-2015', '2015-2016', '2016-2017', '2017-2018', '2018-2019', '2019-2020') NOT NULL,
    fee_category ENUM('General', 'LEET', 'Reap') NULL,
    fee_plan ENUM('B.ARCH 2018-2023(2018-2019)', 'HOSTEL FEE 2018-2023(2018-2019)') NOT NULL,
    advance_received FLOAT NULL,
    caste ENUM('DEC ST EMPL WARD', 'General', 'GENERAL(MINORITY)', 'Jain Minority', 'Mart/Ex-Serviceman Ward', 'minor', 'Muslim', 'Muslim Minority', 'OBC', 'Other', 'Physical Handicap', 'SC', 'ST', 'Widow') NOT NULL,
    religion ENUM('Bodh', 'Christian', 'Hindu', 'Jain', 'Muslim', 'Sikh') NOT NULL,
    additional_category ENUM('OBC(Creamy layer)', 'OBC(Non-Creamy layer)') NULL,
    curricular_activity ENUM('ABC', 'DEF', 'GEF', 'HIJ') NULL,
    ist_exam_center ENUM('Delhi', 'Gurugram') NULL,
    iind_exam_center ENUM('Noida', 'Jaipur') NULL,
    region ENUM('Othan than Rajasthan', 'Rajasthan') NULL,
    birth_date DATE NOT NULL,
    admission_category ENUM('11A', '11B', '11C') NOT NULL,
    admission_date DATE NULL,
    enroll_date DATE NULL,
    student_admission_status ENUM('Migrate Student', 'Bridge Student', 'New Admission') NULL,
    current_class VARCHAR(255) NULL,
    employee_references VARCHAR(255) NULL,
    student_references VARCHAR(255) NULL,
    pay_out VARCHAR(255) NULL,
    student_photo JSON NULL,
    signature JSON NULL,
    phone_number VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(255) NULL,
    email VARCHAR(255) NOT NULL,
    pan_number VARCHAR(255) NULL,
    parent_email VARCHAR(255) NULL,
    parent_number VARCHAR(255) NULL,
    aadhar_number VARCHAR(255) NULL,
    place_of_birth VARCHAR(255) NULL,
    nationality ENUM('Indian') NULL,
    multiple_number VARCHAR(255) NULL,
    register_file_number VARCHAR(255) NOT NULL,
    shift ENUM('Morning', 'Evening', 'AfterNoon') NULL,
    whatsapp_number VARCHAR(255) NULL,
    student_name_alias VARCHAR(255) NULL,
    student_status ENUM('Cancel Student', 'Left Student', 'Long Absent', 'Non Attendant') NULL,
    cancel_date DATE NULL,
    cancel_reason VARCHAR(255) NULL,
    general_remark VARCHAR(255) NULL,
    preference VARCHAR(255) NULL,
    document_status ENUM('Pending Documents', 'Complete Documents') DEFAULT 'Pending Documents',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (campus_id) REFERENCES campus(campus_id),
    FOREIGN KEY (institute_id) REFERENCES institute(institute_id),
    FOREIGN KEY (affiliated_university_id) REFERENCES affiliated_university(affiliated_university_id),
    FOREIGN KEY (course_level_id) REFERENCES employee_code_master_type(employee_code_master_type_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (specialization_id) REFERENCES specialization(specialization_id)
);


CREATE TABLE students_entrance_detail (
    students_entrance_detail_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    entrance_exam VARCHAR(255),
    allotment_list VARCHAR(255),
    allotment_category VARCHAR(255),
    category_rank INT,
    roll_number VARCHAR(255),
    marks FLOAT,
    percentile FLOAT,
    application_id VARCHAR(255),
    counseling_place VARCHAR(255),
    counseling_date DATE,
    remarks VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students (student_id)
);

CREATE TABLE students_address (
    students_address_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    p_address VARCHAR(255),
    p_country ENUM('INDIA', 'USA'),
    p_state ENUM('RAJASTHAN', 'HARYANA', 'Punjab'),
    p_city ENUM('JAIPUR', 'KOTA', 'KOTPUTLI', 'REWARI', 'GURUGRAM'),
    p_pincode INT,
    c_address VARCHAR(255),
    c_country ENUM('INDIA', 'USA'),
    c_state ENUM('RAJASTHAN', 'HARYANA', 'Punjab'),
    c_city ENUM('JAIPUR', 'KOTA', 'KOTPUTLI', 'REWARI', 'GURUGRAM'),
    c_pincode INT,
    contact VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students (student_id)
);

CREATE TABLE subject (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    university_id INT NOT NULL,
    specialization_id INT,
    subject_name VARCHAR(255) NOT NULL,
    subject_code VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (specialization_id) REFERENCES specialization(specialization_id)
);

CREATE TABLE class_sections (
    class_sections_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    specialization_id INT NULL,
    acedmic_period_id INT NOT NULL,
    section VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (specialization_id) REFERENCES specialization(specialization_id),
    FOREIGN KEY (acedmic_period_id) REFERENCES employee_code_master_type(employee_code_master_type_id)
);

CREATE TABLE class_subject_mapper (
    class_subject_mapper_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    class_sections_id INT NOT NULL,
    semester_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    FOREIGN KEY (class_sections_id) REFERENCES class_sections(class_sections_id),
    FOREIGN KEY (semester_id) REFERENCES employee_code_master_type(employee_code_master_type_id)
);

CREATE TABLE class_student_mapper (
    class_student_mapper_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_sections_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (class_sections_id) REFERENCES class_sections(class_sections_id)
);

CREATE TABLE subject_mapper (
    subject_mapper_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    specialization_id INT,
    semester_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (specialization_id) REFERENCES specialization(specialization_id),
    FOREIGN KEY (semester_id) REFERENCES employee_code_master_type(employee_code_master_type_id)
);

CREATE TABLE student_elective_subject (
    student_elective_subject_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
);

CREATE TABLE employee_code_master (
    employee_code_master_id INT AUTO_INCREMENT PRIMARY KEY,
    code_master_type VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

INSERT INTO employee_code_master (code_master_type) VALUES 
  ('employeeGroup'),
  ('salutation'),
  ('gender'),
  ('religion'),
  ('bloodGroup'),
  ('Nationality'),
  ('caste'),
  ('appointmentType'),
  ('experienceType'),
  ('achievementCategory'),
  ('document'),
  ('nomineeRelation'),
  ('iTCategory'),
  ('degreeLevel'),
  ('stream'),
  ('qualification'),
  ('longLeaveDetails');

  INSERT INTO employee_code_master (code_master_type) VALUES ('CourseLevel');
  INSERT INTO employee_code_master (code_master_type) VALUES ('semester');
  INSERT INTO employee_code_master (code_master_type) VALUES ('acedmicPeriod');

  CREATE TABLE employee_code_master_type (
    employee_code_master_type_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code_master_id INT NOT NULL,
    code VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (employee_code_master_id) REFERENCES employee_code_master(employee_code_master_id)
);