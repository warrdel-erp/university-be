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
      AND deleted_at IS NULL
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
