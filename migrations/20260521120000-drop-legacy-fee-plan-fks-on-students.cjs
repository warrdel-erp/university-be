'use strict';

/**
 * Fee v2 uses students.fee_plan_profile_id only.
 * Drops legacy fee_plan_id FK (old fee_plan / fee_plan__deprecated flow).
 */

async function listStudentForeignKeys(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT CONSTRAINT_NAME AS name
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'students'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  `);
  return rows.map((r) => r.name);
}

async function dropStudentForeignKey(queryInterface, name) {
  await queryInterface.sequelize.query(
    `ALTER TABLE students DROP FOREIGN KEY \`${name}\``
  );
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const legacyFeePlanFkNames = new Set([
      'fk_fee_plan_id',
      'fk_students_fee_plan_id',
      'students_fee_plan_id_foreign_idx',
    ]);

    const existing = await listStudentForeignKeys(queryInterface);
    for (const name of existing) {
      const lower = name.toLowerCase();
      if (
        legacyFeePlanFkNames.has(name) ||
        lower.includes('fee_plan_id') ||
        (lower.includes('fee_plan') && !lower.includes('fee_plan_profile'))
      ) {
        await dropStudentForeignKey(queryInterface, name);
      }
    }

    const definition = await queryInterface.describeTable('students');
    if (definition.fee_plan_id) {
      await queryInterface.sequelize.query(
        'ALTER TABLE students MODIFY fee_plan_id INT NULL'
      );
    }

    // Clear orphan semester_id (invalid FK) so PATCH can update feePlanProfileId without failing
    if (definition.semester_id) {
      await queryInterface.sequelize.query(`
        UPDATE students s
        LEFT JOIN semester sem ON s.semester_id = sem.semester_id
        SET s.semester_id = NULL
        WHERE s.semester_id IS NOT NULL AND sem.semester_id IS NULL
      `);
    }
  },

  async down() {
    // Legacy fee_plan table may be renamed to fee_plan__deprecated; do not re-add FK automatically.
  },
};
