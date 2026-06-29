'use strict';

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

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const fkNames = await listStudentForeignKeys(queryInterface);
    for (const name of fkNames) {
      const lower = name.toLowerCase();
      if (lower.includes('acedmic_year') || lower.includes('academic_year')) {
        await queryInterface.sequelize.query(
          `ALTER TABLE students DROP FOREIGN KEY \`${name}\``
        );
      }
    }

    const table = await queryInterface.describeTable('students');
    if (table.acedmic_year_id) {
      await queryInterface.removeColumn('students', 'acedmic_year_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('students');
    if (!table.acedmic_year_id) {
      await queryInterface.addColumn('students', 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }
  },
};
