'use strict';

const TABLE = 'employee';

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, TABLE))) {
      return;
    }

    const hasDepartmentId = await columnExists(queryInterface, TABLE, 'department_id');
    const hasDepartment = await columnExists(queryInterface, TABLE, 'department');

    if (!hasDepartmentId) {
      await queryInterface.addColumn(TABLE, 'department_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (hasDepartment) {
      // Backfill by matching employee.department (name) to department.department_name within same institute
      await queryInterface.sequelize.query(`
        UPDATE \`${TABLE}\` e
        INNER JOIN \`department\` d
          ON d.department_name = e.department
          AND d.institute_id = e.institute_id
        SET e.department_id = d.department_id
        WHERE e.department IS NOT NULL
          AND e.department != ''
          AND e.department_id IS NULL
      `);

      await queryInterface.removeColumn(TABLE, 'department');
    }

    const [fkRows] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${TABLE}'
        AND COLUMN_NAME = 'department_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    if (fkRows.length === 0) {
      await queryInterface.addConstraint(TABLE, {
        fields: ['department_id'],
        type: 'foreign key',
        name: 'fk_employee_department_id',
        references: {
          table: 'department',
          field: 'department_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, TABLE))) {
      return;
    }

    const [fkRows] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${TABLE}'
        AND COLUMN_NAME = 'department_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const row of fkRows) {
      await queryInterface.removeConstraint(TABLE, row.CONSTRAINT_NAME);
    }

    if (!(await columnExists(queryInterface, TABLE, 'department'))) {
      await queryInterface.addColumn(TABLE, 'department', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (await columnExists(queryInterface, TABLE, 'department_id')) {
      await queryInterface.sequelize.query(`
        UPDATE \`${TABLE}\` e
        INNER JOIN \`department\` d
          ON d.department_id = e.department_id
        SET e.department = d.department_name
        WHERE e.department_id IS NOT NULL
      `);

      await queryInterface.removeColumn(TABLE, 'department_id');
    }
  },
};
