'use strict';

const TABLE = 'department_positions';

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
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, TABLE))) {
      return;
    }

    if (!(await columnExists(queryInterface, TABLE, 'is_vacant'))) {
      return;
    }

    await queryInterface.removeColumn(TABLE, 'is_vacant');
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, TABLE))) {
      return;
    }

    if (await columnExists(queryInterface, TABLE, 'is_vacant')) {
      return;
    }

    await queryInterface.addColumn(TABLE, 'is_vacant', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },
};
