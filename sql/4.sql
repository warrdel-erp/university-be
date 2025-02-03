CREATE TABLE transport_route (
    transport_route_id INT AUTO_INCREMENT PRIMARY KEY,
    route_title VARCHAR(255) NOT NULL,
    fare DECIMAL(10, 2) NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE transport_vehicle (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_number VARCHAR(255) NOT NULL,
    vehicle_model VARCHAR(255) NOT NULL,
    made_year VARCHAR(4) NOT NULL,
    employee_id INT NOT NULL,
    note TEXT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
	FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
	FOREIGN KEY (created_by) REFERENCES users(user_id),
	FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE `assign_vehicle` (
    `assign_vehicle_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `transport_route_id` INT NOT NULL,
    `vehicle_id` INT NOT NULL,
    `created_by` INT NOT NULL,
    `updated_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME DEFAULT NULL,
    FOREIGN KEY (`transport_route_id`) REFERENCES `transport_route`(`transport_route_id`),
    FOREIGN KEY (`vehicle_id`) REFERENCES `transport_vehicle`(`vehicle_id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`)
);


ALTER TABLE course
ADD COLUMN capacity VARCHAR(255) NULL;

CREATE TABLE acedmic_year (
    acedmic_year_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    year INT NOT NULL,
    year_title VARCHAR(255) NOT NULL,
    starting_date VARCHAR(255) NOT NULL,
    ending_date VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- add relation student with acedmic_year

ALTER TABLE students
ADD COLUMN acedmic_year_id INT NULL;

UPDATE students
SET acedmic_year_id = 1
WHERE acedmic_year_id IS NULL;

ALTER TABLE students
ADD CONSTRAINT fk_acedmic_year
    FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id)
 ON DELETE CASCADE;

-- remove class_section with acedmic_period_id
ALTER TABLE class_sections
DROP FOREIGN KEY class_sections_ibfk_3;

ALTER TABLE class_sections
DROP COLUMN acedmic_period_id;

-- add reltion class_sections with acedmic_year
ALTER TABLE class_sections
ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE class_sections
SET acedmic_year_id = 1
WHERE acedmic_year_id IS NULL;

 UPDATE class_sections
SET acedmic_year_id = 1
WHERE acedmic_year_id NOT IN (SELECT acedmic_year_id FROM acedmic_year);

DELETE FROM class_sections
WHERE acedmic_year_id NOT IN (SELECT acedmic_year_id FROM acedmic_year);

ALTER TABLE class_sections
ADD CONSTRAINT fk_class_sections_acedmic_year
    FOREIGN KEY (acedmic_year_id) REFERENCES acedmic_year(acedmic_year_id)
ON DELETE CASCADE;

-- Add the courseDuration column in course
ALTER TABLE course
ADD COLUMN course_duration INT;

-- Add the acedmicYearId column with the foreign key reference

ALTER TABLE course
ADD COLUMN acedmic_year_id INT NULL;

UPDATE course
SET acedmic_year_id = 1
WHERE acedmic_year_id IS NULL;

ALTER TABLE course
ADD CONSTRAINT fk_course_acedmic_year_id
    FOREIGN KEY (acedmic_year_id)
    REFERENCES acedmic_year(acedmic_year_id)
ON DELETE CASCADE;


CREATE TABLE section (
    section_id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    section_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    FOREIGN KEY (university_id) REFERENCES university(university_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);


-- Add the class column in class_sections
ALTER TABLE class_sections
ADD COLUMN class VARCHAR(255);

-- Add the section_id column with the foreign key reference

ALTER TABLE class_sections
ADD COLUMN section_id INT NULL;

UPDATE class_sections
SET section_id = 1
WHERE section_id IS NULL;

ALTER TABLE class_sections
ADD CONSTRAINT fk_section_id
    FOREIGN KEY (section_id)
    REFERENCES section(section_id)
ON DELETE CASCADE;


-- Add the acedmic_year_id column with the foreign key reference in class_student_mapper

ALTER TABLE class_student_mapper
ADD COLUMN acedmic_year_id INT NOT NULL;

UPDATE class_student_mapper
SET acedmic_year_id = 1
WHERE acedmic_year_id IS NULL;

ALTER TABLE class_student_mapper
ADD CONSTRAINT fk_acedmic_year_id
    FOREIGN KEY (acedmic_year_id)
    REFERENCES acedmic_year(acedmic_year_id)
ON DELETE CASCADE;