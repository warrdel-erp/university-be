'use strict';

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

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

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (await columnExists(queryInterface, 'department', 'parent_department_id')) {
      await dropFksOnColumn(queryInterface, 'department', 'parent_department_id');
      await queryInterface.removeColumn('department', 'parent_department_id');
    }
    if (await columnExists(queryInterface, 'department', 'department_order')) {
      await queryInterface.removeColumn('department', 'department_order');
    }
    if (await columnExists(queryInterface, 'department', 'deleted_at')) {
      await queryInterface.removeColumn('department', 'deleted_at');
    }

    if (await columnExists(queryInterface, 'department_structure', 'deleted_at')) {
      await queryInterface.removeColumn('department_structure', 'deleted_at');
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'department', 'parent_department_id'))) {
      await queryInterface.addColumn('department', 'parent_department_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await queryInterface.sequelize.query(`
        ALTER TABLE department
        ADD CONSTRAINT fk_department_parent_department_id
        FOREIGN KEY (parent_department_id) REFERENCES department (department_id)
        ON UPDATE CASCADE ON DELETE SET NULL
      `);
    }
    if (!(await columnExists(queryInterface, 'department', 'department_order'))) {
      await queryInterface.addColumn('department', 'department_order', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
    if (!(await columnExists(queryInterface, 'department', 'deleted_at'))) {
      await queryInterface.addColumn('department', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!(await columnExists(queryInterface, 'department_structure', 'deleted_at'))) {
      await queryInterface.addColumn('department_structure', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },
};
