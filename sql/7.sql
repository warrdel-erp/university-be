ALTER TABLE fee_plan ADD COLUMN plan_type VARCHAR(255);

CREATE TABLE fee_new_invoice (
    fee_new_invoice_id INT PRIMARY KEY AUTO_INCREMENT,
    fee_plan_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    End_date DATE,
    total INT,
    InvoiceNumber VARCHAR(255),
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_fee_plan FOREIGN KEY (fee_plan_id) REFERENCES fee_plan(fee_plan_id),
    CONSTRAINT fk_fee_new_invoice_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_fee_new_invoice_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE fee_invoice_details DROP FOREIGN KEY fk_fee_plan_semester_id;

DROP TABLE IF EXISTS fee_plan_semester;

CREATE TABLE fee_plan_semester (
    fee_plan_semester_id INT AUTO_INCREMENT PRIMARY KEY,
    fee_new_invoice_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    fee INT NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_fee_plan_semester_fee_new_invoice FOREIGN KEY (fee_new_invoice_id) REFERENCES fee_new_invoice(fee_new_invoice_id),
    CONSTRAINT fk_fee_plan_semester_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_fee_plan_semester_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE fee_invoice_details DROP FOREIGN KEY fk_fee_invoice_plan_id;

DROP TABLE IF EXISTS fee_plan_type;

CREATE TABLE fee_plan_type (
  fee_plan_type_id INT AUTO_INCREMENT PRIMARY KEY,
  fee_new_invoice_id INT NOT NULL,
  fee_type_id INT DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  fee INT NOT NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_fee_plan_type_invoice FOREIGN KEY (fee_new_invoice_id) REFERENCES fee_new_invoice(fee_new_invoice_id),
  CONSTRAINT fk_fee_plan_type_type FOREIGN KEY (fee_type_id) REFERENCES fee_type(fee_type_id),
  CONSTRAINT fk_fee_plan_type_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_fee_plan_type_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE students ADD COLUMN fee_status BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE student_invoice_mapper (
  student_invoice_mapper_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  university_id INT NOT NULL,
  fee_new_invoice_id INT NULL,
  fee_plan_id INT NULL,
  invoice_date DATETIME NULL,
  invoice_number VARCHAR(255) NULL,
  invoice_status BOOLEAN NULL,
  created_by INT NOT NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_simb_student FOREIGN KEY (student_id) REFERENCES students(student_id),
  CONSTRAINT fk_simb_university FOREIGN KEY (university_id) REFERENCES university(university_id),
  CONSTRAINT fk_simb_fee_invoice FOREIGN KEY (fee_new_invoice_id) REFERENCES fee_new_invoice(fee_new_invoice_id),
  CONSTRAINT fk_simb_fee_plan FOREIGN KEY (fee_plan_id) REFERENCES fee_plan(fee_plan_id),
  CONSTRAINT fk_simb_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT fk_simb_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

ALTER TABLE fee_plan
ADD COLUMN course_id INTEGER,
ADD COLUMN acedmic_year_id INTEGER,
ADD COLUMN session_id INTEGER,
ADD COLUMN university_id INTEGER;

UPDATE fee_plan SET course_id = 1, acedmic_year_id = 1,university_id= 1, session_id = 1 WHERE course_id IS NULL;

ALTER TABLE fee_plan
MODIFY COLUMN course_id INTEGER NOT NULL,
MODIFY COLUMN acedmic_year_id INTEGER NOT NULL,
MODIFY COLUMN session_id INTEGER NOT NULL,
MODIFY COLUMN university_id INTEGER NOT NULL;

ALTER TABLE fee_plan
ADD CONSTRAINT fk_fee_plan_course FOREIGN KEY (course_id) REFERENCES course(course_id),
ADD CONSTRAINT fk_fee_plan_acedmic_year FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id),
ADD CONSTRAINT fk_fee_plan_session FOREIGN KEY (session_id) REFERENCES session(session_id),
ADD CONSTRAINT fk_fee_plan_university FOREIGN KEY (university_id) REFERENCES university(university_id);

ALTER TABLE fee_invoice_detail_record
  DROP FOREIGN KEY fee_invoice_detail_record_ibfk_1,
  DROP FOREIGN KEY fee_invoice_detail_record_ibfk_2;

ALTER TABLE fee_invoice_detail_record
  DROP COLUMN fee_invoice_id,
  DROP COLUMN fee_invoice_details_id;

ALTER TABLE fee_invoice_detail_record ADD COLUMN student_invoice_mapper_id INTEGER;

UPDATE fee_invoice_detail_record SET student_invoice_mapper_id = 1 WHERE student_invoice_mapper_id IS NULL;

ALTER TABLE feefee_invoice_detail_record_plan MODIFY COLUMN student_invoice_mapper_id INTEGER NOT NULL;

ALTER TABLE fee_invoice_detail_record ADD CONSTRAINT fk_fee_plan_student_invoice_mapper FOREIGN KEY (student_invoice_mapper_id) REFERENCES student_invoice_mapper(student_invoice_mapper_id);