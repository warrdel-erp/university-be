-- =============================================================================
-- DEPRECATED: use Sequelize migration instead:
--   migrations/20260615130000-add-institute-id-to-elective-subject.cjs
--   npm run migrate
-- =============================================================================

SET SQL_SAFE_UPDATES = 0;

-- -----------------------------------------------------------------------------
-- 1. Add column (skip manually if institute_id already exists)
-- -----------------------------------------------------------------------------
ALTER TABLE elective_subject
ADD COLUMN institute_id INT NULL;

-- -----------------------------------------------------------------------------
-- 2. Backfill via direct belongsTo: specialization (Branch)
--    elective_subject.specialization_id → specialization.institute_id
-- -----------------------------------------------------------------------------
UPDATE elective_subject es
INNER JOIN specialization s ON s.specialization_id = es.specialization_id
SET es.institute_id = s.institute_id
WHERE es.institute_id IS NULL
  AND es.specialization_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Backfill via direct belongsTo: course (Program)
--    elective_subject.course_id → course.institute_id
-- -----------------------------------------------------------------------------
UPDATE elective_subject es
INNER JOIN course c ON c.course_id = es.course_id
SET es.institute_id = c.institute_id
WHERE es.institute_id IS NULL
  AND es.course_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Backfill via nested chain: specialization → course
--    elective_subject.specialization_id → specialization.course_id → course.institute_id
--    (when specialization row exists but step 2 missed due to null institute on specialization)
-- -----------------------------------------------------------------------------
UPDATE elective_subject es
INNER JOIN specialization s ON s.specialization_id = es.specialization_id
INNER JOIN course c ON c.course_id = s.course_id
SET es.institute_id = c.institute_id
WHERE es.institute_id IS NULL
  AND es.specialization_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5. Backfill via creator: users.default_institute_id
--    elective_subject.created_by → users.default_institute_id
-- -----------------------------------------------------------------------------
UPDATE elective_subject es
INNER JOIN users u ON u.user_id = es.created_by
SET es.institute_id = u.default_institute_id
WHERE es.institute_id IS NULL
  AND u.default_institute_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. Backfill via reverse hasMany: student_elective_subject → students
--    elective_subject ← student_elective_subject.elective_subject_id
--                     → students.institute_id (most common among enrolled students)
-- -----------------------------------------------------------------------------
UPDATE elective_subject es
INNER JOIN (
    SELECT
        ses.elective_subject_id,
        s.institute_id,
        COUNT(*) AS student_count
    FROM student_elective_subject ses
    INNER JOIN students s ON s.student_id = ses.student_id
    WHERE ses.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND s.institute_id IS NOT NULL
    GROUP BY ses.elective_subject_id, s.institute_id
) ranked ON ranked.elective_subject_id = es.elective_subject_id
INNER JOIN (
    SELECT elective_subject_id, MAX(student_count) AS max_count
    FROM (
        SELECT
            ses.elective_subject_id,
            s.institute_id,
            COUNT(*) AS student_count
        FROM student_elective_subject ses
        INNER JOIN students s ON s.student_id = ses.student_id
        WHERE ses.deleted_at IS NULL
          AND s.deleted_at IS NULL
          AND s.institute_id IS NOT NULL
        GROUP BY ses.elective_subject_id, s.institute_id
    ) counts
    GROUP BY elective_subject_id
) top ON top.elective_subject_id = ranked.elective_subject_id
     AND top.max_count = ranked.student_count
SET es.institute_id = ranked.institute_id
WHERE es.institute_id IS NULL;

-- -----------------------------------------------------------------------------
-- 7. Fallback: university → institute (first institute per university)
--    elective_subject.university_id → institute.institute_id
-- -----------------------------------------------------------------------------
UPDATE elective_subject es
INNER JOIN (
    SELECT university_id, MIN(institute_id) AS institute_id
    FROM institute
    WHERE deleted_at IS NULL
    GROUP BY university_id
) i ON i.university_id = es.university_id
SET es.institute_id = i.institute_id
WHERE es.institute_id IS NULL;

-- -----------------------------------------------------------------------------
-- 8. Verify — should return 0 rows before continuing
-- -----------------------------------------------------------------------------
SELECT
    elective_subject_id,
    university_id,
    course_id,
    specialization_id,
    acedmic_year_id,
    created_by
FROM elective_subject
WHERE institute_id IS NULL;

-- -----------------------------------------------------------------------------
-- 9. Enforce NOT NULL + FK to institute
-- -----------------------------------------------------------------------------
ALTER TABLE elective_subject
MODIFY COLUMN institute_id INT NOT NULL;

ALTER TABLE elective_subject
ADD CONSTRAINT fk_elective_subject_institute_id
FOREIGN KEY (institute_id) REFERENCES institute(institute_id) ON DELETE CASCADE;

SET SQL_SAFE_UPDATES = 1;

-- -----------------------------------------------------------------------------
-- Post-migration audit (optional)
-- -----------------------------------------------------------------------------
SELECT
    es.elective_subject_id,
    es.elective_subject_name,
    es.university_id,
    es.institute_id,
    i.institute_name
FROM elective_subject es
LEFT JOIN institute i ON i.institute_id = es.institute_id
ORDER BY es.elective_subject_id;
