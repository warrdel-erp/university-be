'use strict';

async function dropFksOnColumn(queryInterface, tableName, columnName) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME = :columnName
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { tableName, columnName } },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
    );
  }
}

async function indexExists(queryInterface, tableName, indexName) {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((idx) => idx.name === indexName);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop foreign key constraints on department_structure_id
    await dropFksOnColumn(queryInterface, 'org_position', 'department_structure_id');

    // Drop foreign key constraints on reports_to_org_position_id
    await dropFksOnColumn(queryInterface, 'org_position', 'reports_to_org_position_id');

    // Drop index idx_org_position_structure_code if exists
    if (await indexExists(queryInterface, 'org_position', 'idx_org_position_structure_code')) {
      await queryInterface.removeIndex('org_position', 'idx_org_position_structure_code');
    }

    // Remove the columns
    await queryInterface.removeColumn('org_position', 'department_structure_id');
    await queryInterface.removeColumn('org_position', 'reports_to_org_position_id');
  },

  async down(queryInterface, Sequelize) {
    // Add the columns back
    await queryInterface.addColumn('org_position', 'department_structure_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'department_structure', key: 'department_structure_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addColumn('org_position', 'reports_to_org_position_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'org_position', key: 'org_position_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add index back
    await queryInterface.addIndex('org_position', ['department_structure_id', 'position_code'], {
      name: 'idx_org_position_structure_code',
    });
  },
};
