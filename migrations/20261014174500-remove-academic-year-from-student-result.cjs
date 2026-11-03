'use strict';

async function listStudentResultAcademicYearForeignKeys(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT CONSTRAINT_NAME AS name
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'student_result'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  `);
  return rows
    .map((r) => r.name)
    .filter((name) => {
      const lower = name.toLowerCase();
      return lower.includes('acedmic_year') || lower.includes('academic_year');
    });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const fkNames = await listStudentResultAcademicYearForeignKeys(queryInterface);
    for (const name of fkNames) {
      try {
        await queryInterface.sequelize.query(
          `ALTER TABLE \`student_result\` DROP FOREIGN KEY \`${name}\``
        );
      } catch (err) {
        console.warn(`Could not drop FK ${name}:`, err.message);
      }
    }

    const table = await queryInterface.describeTable('student_result');
    if (table.acedmic_year_id) {
      await queryInterface.removeColumn('student_result', 'acedmic_year_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('student_result');
    if (!table.acedmic_year_id) {
      await queryInterface.addColumn('student_result', 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  },
};
