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

    if (!(await columnExists(queryInterface, TABLE, 'publish_status'))) {
      return;
    }

    await queryInterface.removeColumn(TABLE, 'publish_status');
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, TABLE))) {
      return;
    }

    if (await columnExists(queryInterface, TABLE, 'publish_status')) {
      return;
    }

    await queryInterface.addColumn(TABLE, 'publish_status', {
      type: Sequelize.ENUM('DRAFT', 'PUBLISHED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    });
  },
};
