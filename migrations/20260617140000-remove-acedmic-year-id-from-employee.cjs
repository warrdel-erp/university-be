'use strict';

async function listEmployeeForeignKeys(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT CONSTRAINT_NAME AS name
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employee'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  `);
  return rows.map((r) => r.name);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const fkNames = await listEmployeeForeignKeys(queryInterface);
    for (const name of fkNames) {
      const lower = name.toLowerCase();
      if (lower.includes('acedmic_year') || lower.includes('academic_year')) {
        await queryInterface.sequelize.query(
          `ALTER TABLE employee DROP FOREIGN KEY \`${name}\``
        );
      }
    }

    const table = await queryInterface.describeTable('employee');
    if (table.acedmic_year_id) {
      await queryInterface.removeColumn('employee', 'acedmic_year_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('employee');
    if (!table.acedmic_year_id) {
      await queryInterface.addColumn('employee', 'acedmic_year_id', {
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
