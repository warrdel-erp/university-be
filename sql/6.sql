-- Add the institute_id column with the foreign key reference in users

ALTER TABLE users ADD COLUMN institute_id INT NULL;

UPDATE users SET institute_id = 1 WHERE institute_id IS NULL;

UPDATE users SET institute_id = 1 WHERE institute_id = 0;

ALTER TABLE users ADD CONSTRAINT fk_users_institute_id FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;
