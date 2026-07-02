'use strict';

const TABLE_FK = {
  class: 'fk_class_semester_id',
  class_sections: 'fk_class_sections_semester_id',
  students: 'fk_students_semester_id',
  class_student_mapper: 'fk_class_student_mapper_semester_id',
  exam_schedule: 'fk_exam_schedule_semester',
  internal_assessment: 'fk_internal_assessment_semester',
};

async function countNullSemester(queryInterface, table, transaction) {
  const [[row]] = await queryInterface.sequelize.query(
    `
    SELECT COUNT(*) AS nullCount
    FROM \`${table}\`
    WHERE semester_id IS NULL
    `,
    { transaction },
  );
  return Number(row.nullCount);
}

async function isSemesterIdNullable(queryInterface, table, transaction) {
  const [[row]] = await queryInterface.sequelize.query(
    `
    SELECT IS_NULLABLE AS isNullable
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :table
      AND COLUMN_NAME = 'semester_id'
    `,
    { replacements: { table }, transaction },
  );
  return row?.isNullable === 'YES';
}

async function enforceSemesterIdNotNull(queryInterface, table, transaction) {
  const nullable = await isSemesterIdNullable(queryInterface, table, transaction);
  if (!nullable) {
    return;
  }

  // Best-effort fallbacks for soft-deleted or orphaned rows
  const [[systemSemester]] = await queryInterface.sequelize.query(
    `SELECT MIN(semester_id) AS semesterId FROM semester WHERE deleted_at IS NULL`,
    { transaction },
  );
  const fallbackSystemSemesterId = systemSemester?.semesterId;

  if (table === 'class') {
    await queryInterface.sequelize.query(
      `
      UPDATE \`class\` c
      INNER JOIN semester sem ON sem.course_id = c.course_id AND sem.institute_id = c.institute_id
      SET c.semester_id = sem.semester_id
      WHERE c.semester_id IS NULL
      `,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `
      UPDATE \`class\` c
      INNER JOIN semester sem ON sem.course_id = c.course_id
      SET c.semester_id = sem.semester_id
      WHERE c.semester_id IS NULL
      `,
      { transaction },
    );
    if (fallbackSystemSemesterId) {
      await queryInterface.sequelize.query(
        `
        UPDATE \`class\` c
        SET c.semester_id = :fallbackId
        WHERE c.semester_id IS NULL
        `,
        { replacements: { fallbackId: fallbackSystemSemesterId }, transaction },
      );
    }
  }

  if (table === 'class_sections') {
    await queryInterface.sequelize.query(
      `
      UPDATE \`class_sections\` cs
      INNER JOIN \`class\` c ON c.class_id = cs.class_id
      SET cs.semester_id = c.semester_id
      WHERE cs.semester_id IS NULL AND c.semester_id IS NOT NULL
      `,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `
      UPDATE \`class_sections\` cs
      INNER JOIN semester sem ON sem.course_id = cs.course_id AND sem.institute_id = cs.institute_id
      SET cs.semester_id = sem.semester_id
      WHERE cs.semester_id IS NULL
      `,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `
      UPDATE \`class_sections\` cs
      INNER JOIN semester sem ON sem.course_id = cs.course_id
      SET cs.semester_id = sem.semester_id
      WHERE cs.semester_id IS NULL
      `,
      { transaction },
    );
    if (fallbackSystemSemesterId) {
      await queryInterface.sequelize.query(
        `
        UPDATE \`class_sections\` cs
        SET cs.semester_id = :fallbackId
        WHERE cs.semester_id IS NULL
        `,
        { replacements: { fallbackId: fallbackSystemSemesterId }, transaction },
      );
    }
  }

  if (table === 'students') {
    await queryInterface.sequelize.query(
      `
      UPDATE \`students\` s
      INNER JOIN \`class_sections\` cs ON cs.class_sections_id = s.class_sections_id
      SET s.semester_id = cs.semester_id
      WHERE s.semester_id IS NULL AND cs.semester_id IS NOT NULL
      `,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `
      UPDATE \`students\` s
      INNER JOIN semester sem ON sem.course_id = s.course_id AND sem.institute_id = s.institute_id
      SET s.semester_id = sem.semester_id
      WHERE s.semester_id IS NULL
      `,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `
      UPDATE \`students\` s
      INNER JOIN semester sem ON sem.course_id = s.course_id
      SET s.semester_id = sem.semester_id
      WHERE s.semester_id IS NULL
      `,
      { transaction },
    );
    if (fallbackSystemSemesterId) {
      await queryInterface.sequelize.query(
        `
        UPDATE \`students\` s
        SET s.semester_id = :fallbackId
        WHERE s.semester_id IS NULL
        `,
        { replacements: { fallbackId: fallbackSystemSemesterId }, transaction },
      );
    }
  }

  if (table === 'class_student_mapper') {
    await queryInterface.sequelize.query(
      `
      UPDATE \`class_student_mapper\` csm
      INNER JOIN \`students\` s ON s.student_id = csm.student_id
      SET csm.semester_id = s.semester_id
      WHERE csm.semester_id IS NULL AND s.semester_id IS NOT NULL
      `,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `
      UPDATE \`class_student_mapper\` csm
      INNER JOIN \`students\` s ON s.student_id = csm.student_id
      INNER JOIN \`class_sections\` cs ON cs.class_sections_id = s.class_sections_id
      SET csm.semester_id = cs.semester_id
      WHERE csm.semester_id IS NULL AND cs.semester_id IS NOT NULL
      `,
      { transaction },
    );
    if (fallbackSystemSemesterId) {
      await queryInterface.sequelize.query(
        `
        UPDATE \`class_student_mapper\` csm
        SET csm.semester_id = :fallbackId
        WHERE csm.semester_id IS NULL
        `,
        { replacements: { fallbackId: fallbackSystemSemesterId }, transaction },
      );
    }
  }

  if (table === 'exam_schedule') {
    await queryInterface.sequelize.query(
      `
      UPDATE \`exam_schedule\` es
      INNER JOIN \`class_subject_mapper\` csm ON csm.subject_id = es.subject_id
      SET es.semester_id = csm.semester_id
      WHERE es.semester_id IS NULL AND csm.semester_id IS NOT NULL
      `,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `
      UPDATE \`exam_schedule\` es
      INNER JOIN \`subject\` sub ON sub.subject_id = es.subject_id
      INNER JOIN semester sem ON sem.course_id = sub.course_id
      SET es.semester_id = sem.semester_id
      WHERE es.semester_id IS NULL
      `,
      { transaction },
    );
    if (fallbackSystemSemesterId) {
      await queryInterface.sequelize.query(
        `
        UPDATE \`exam_schedule\` es
        SET es.semester_id = :fallbackId
        WHERE es.semester_id IS NULL
        `,
        { replacements: { fallbackId: fallbackSystemSemesterId }, transaction },
      );
    }
  }

  if (table === 'internal_assessment') {
    await queryInterface.sequelize.query(
      `
      UPDATE \`internal_assessment\` ia
      INNER JOIN \`class_subject_mapper\` csm ON csm.subject_id = ia.subject_id
      SET ia.semester_id = csm.semester_id
      WHERE ia.semester_id IS NULL AND csm.semester_id IS NOT NULL
      `,
      { transaction },
    );
    await queryInterface.sequelize.query(
      `
      UPDATE \`internal_assessment\` ia
      INNER JOIN \`subject\` sub ON sub.subject_id = ia.subject_id
      INNER JOIN semester sem ON sem.course_id = sub.course_id
      SET ia.semester_id = sem.semester_id
      WHERE ia.semester_id IS NULL
      `,
      { transaction },
    );
    if (fallbackSystemSemesterId) {
      await queryInterface.sequelize.query(
        `
        UPDATE \`internal_assessment\` ia
        SET ia.semester_id = :fallbackId
        WHERE ia.semester_id IS NULL
        `,
        { replacements: { fallbackId: fallbackSystemSemesterId }, transaction },
      );
    }
  }

  const nullCount = await countNullSemester(queryInterface, table, transaction);
  if (nullCount > 0) {
    throw new Error(`${table}.semester_id backfill incomplete — ${nullCount} row(s) still null`);
  }

  // Find and drop any existing foreign key constraint(s) referencing semester_id on this table.
  // This handles situations where constraints are named differently, e.g. automatically generated ones like students_ibfk_10.
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :table
      AND COLUMN_NAME = 'semester_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { table }, transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }

  await queryInterface.sequelize.query(
    `ALTER TABLE \`${table}\` MODIFY semester_id INT NOT NULL`,
    { transaction },
  );

  const fkName = TABLE_FK[table];
  if (fkName) {
    await queryInterface.sequelize.query(
      `
      ALTER TABLE \`${table}\`
      ADD CONSTRAINT \`${fkName}\`
      FOREIGN KEY (semester_id) REFERENCES semester (semester_id)
      ON DELETE CASCADE ON UPDATE CASCADE
      `,
      { transaction },
    );
  }
}

async function relaxSemesterIdNullable(queryInterface, table, transaction) {
  const nullable = await isSemesterIdNullable(queryInterface, table, transaction);
  if (nullable) {
    return;
  }

  // Find and drop any existing foreign key constraint(s) referencing semester_id on this table.
  // This handles situations where constraints are named differently, e.g. automatically generated ones like students_ibfk_10.
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :table
      AND COLUMN_NAME = 'semester_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { table }, transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }

  await queryInterface.sequelize.query(
    `ALTER TABLE \`${table}\` MODIFY semester_id INT NULL`,
    { transaction },
  );

  const fkName = TABLE_FK[table];
  if (fkName) {
    await queryInterface.sequelize.query(
      `
      ALTER TABLE \`${table}\`
      ADD CONSTRAINT \`${fkName}\`
      FOREIGN KEY (semester_id) REFERENCES semester (semester_id)
      ON DELETE CASCADE ON UPDATE CASCADE
      `,
      { transaction },
    );
  }
}

async function runInTransaction(queryInterface, fn) {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await fn(transaction);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  TABLE_FK,
  countNullSemester,
  enforceSemesterIdNotNull,
  relaxSemesterIdNullable,
  runInTransaction,
};
