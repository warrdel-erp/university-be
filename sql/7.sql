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
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id)
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