-- Add the institute_id column with the foreign key reference in users

ALTER TABLE users ADD COLUMN institute_id INT NULL;

UPDATE users SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE users SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE users ADD CONSTRAINT fk_users_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

ALTER TABLE users DROP FOREIGN KEY users_ibfk_4;

-- Add the institute_id column with the foreign key reference in course

ALTER TABLE course ADD COLUMN institute_id INT NOT NULL;

UPDATE course SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE course SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE course ADD CONSTRAINT fk_course_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in specialization

ALTER TABLE specialization ADD COLUMN institute_id INT NOT NULL;

UPDATE specialization SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE specialization SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE specialization ADD CONSTRAINT fk_specialization_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in subject

ALTER TABLE subject ADD COLUMN institute_id INT NOT NULL;

UPDATE subject SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE subject SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE subject ADD CONSTRAINT fk_subject_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in class

ALTER TABLE class ADD COLUMN institute_id INT NOT NULL;

UPDATE class SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE class SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE class ADD CONSTRAINT fk_class_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in class_sections

ALTER TABLE class_sections ADD COLUMN institute_id INT NOT NULL;

UPDATE class_sections SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE class_sections SET institute_id = 1 WHERE institute_id = 0; 

ALTER TABLE class_sections ADD CONSTRAINT fk_class_sections_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in class_subject_mapper

ALTER TABLE class_subject_mapper ADD COLUMN institute_id INT NOT NULL;

UPDATE class_subject_mapper SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE class_subject_mapper SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE class_subject_mapper ADD CONSTRAINT fk_class_subject_mapper_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in semester

ALTER TABLE semester ADD COLUMN institute_id INT NOT NULL;

UPDATE semester SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE semester SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE semester ADD CONSTRAINT fk_semester_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in section

ALTER TABLE section ADD COLUMN institute_id INT NOT NULL;

UPDATE section SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE section SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE section ADD CONSTRAINT fk_section_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in fee_group

ALTER TABLE fee_group ADD COLUMN institute_id INT NOT NULL;

UPDATE fee_group SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE fee_group SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE fee_group ADD CONSTRAINT fk_fee_group_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in exam_type

ALTER TABLE exam_type ADD COLUMN institute_id INT NOT NULL;

UPDATE exam_type SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE exam_type SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE exam_type ADD CONSTRAINT fk_exam_type_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the university_id column with the foreign key reference in exam_type

ALTER TABLE exam_type ADD COLUMN university_id INT NOT NULL;

UPDATE exam_type SET university_id = 1 WHERE university_id IS NULL;

UPDATE exam_type SET university_id = 1 WHERE university_id = 0;

ALTER TABLE exam_type ADD CONSTRAINT fk_exam_type_university_id FOREIGN KEY (university_id) REFERENCES university(university_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in exam_attendance

ALTER TABLE exam_attendance ADD COLUMN institute_id INT NOT NULL;

UPDATE exam_attendance SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE exam_attendance SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE exam_attendance ADD CONSTRAINT fk_exam_attendance_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in dormitory_list

ALTER TABLE dormitory_list ADD COLUMN institute_id INT NOT NULL;

UPDATE dormitory_list SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE dormitory_list SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE dormitory_list ADD CONSTRAINT fk_dormitory_list_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the university_id column with the foreign key reference in dormitory_list

ALTER TABLE dormitory_list ADD COLUMN university_id INT NOT NULL;

UPDATE dormitory_list SET university_id = 1 WHERE university_id IS NULL;

UPDATE dormitory_list SET university_id = 1 WHERE university_id = 0;

ALTER TABLE dormitory_list ADD CONSTRAINT fk_dormitory_list_university_id FOREIGN KEY (university_id) REFERENCES university(university_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in room_type

ALTER TABLE room_type ADD COLUMN institute_id INT NOT NULL;

UPDATE room_type SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE room_type SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE room_type ADD CONSTRAINT fk_room_type_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the university_id column with the foreign key reference in room_type

ALTER TABLE room_type ADD COLUMN university_id INT NOT NULL;

UPDATE room_type SET university_id = 1 WHERE university_id IS NULL;

UPDATE room_type SET university_id = 1 WHERE university_id = 0;

ALTER TABLE room_type ADD CONSTRAINT fk_room_type_university_id FOREIGN KEY (university_id) REFERENCES university(university_id) ON DELETE CASCADE;

-- Add the institute_id column with the foreign key reference in transport_route

ALTER TABLE transport_route ADD COLUMN institute_id INT NOT NULL;

UPDATE transport_route SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE transport_route SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE transport_route ADD CONSTRAINT fk_transport_route_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

-- Add the university_id column with the foreign key reference in transport_route

ALTER TABLE transport_route ADD COLUMN university_id INT NOT NULL;

UPDATE transport_route SET university_id = 1 WHERE university_id IS NULL;

UPDATE transport_route SET university_id = 1 WHERE university_id = 0;

ALTER TABLE transport_route ADD CONSTRAINT fk_transport_route_university_id FOREIGN KEY (university_id) REFERENCES university(university_id) ON DELETE CASCADE;

ALTER TABLE semester ADD COLUMN name VARCHAR(255) NOT NULL;

ALTER TABLE acedmic_year
MODIFY COLUMN starting_date VARCHAR(255) NULL,
MODIFY COLUMN ending_date VARCHAR(255) NULL;

ALTER TABLE acedmic_year MODIFY COLUMN updated_by INT NULL;

ALTER TABLE acedmic_year DROP COLUMN year;

ALTER TABLE acedmic_year DROP FOREIGN KEY acedmic_year_ibfk_1;
ALTER TABLE acedmic_year DROP FOREIGN KEY acedmic_year_ibfk_2;

ALTER TABLE acedmic_year DROP COLUMN university_id;
ALTER TABLE acedmic_year DROP COLUMN created_by;

DELETE FROM acedmic_year;

INSERT INTO acedmic_year (year_title, starting_date, ending_date, created_at, updated_at, updated_by)
VALUES
('2015-2016', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2016-2017', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2017-2018', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2018-2019', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2019-2020', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2020-2021', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2021-2022', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2022-2023', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2023-2024', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2024-2025', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2025-2026', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2026-2027', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2027-2028', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2028-2029', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2029-2030', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2030-2031', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2031-2032', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2032-2033', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2033-2034', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2034-2035', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
('2035-2036', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);