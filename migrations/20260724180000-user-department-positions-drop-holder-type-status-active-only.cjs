'use strict';

const TABLE = 'user_department_positions';

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

    if (await columnExists(queryInterface, TABLE, 'holder_type')) {
      await queryInterface.removeColumn(TABLE, 'holder_type');
    }

    if (await columnExists(queryInterface, TABLE, 'status')) {
      await queryInterface.sequelize.query(`
        DELETE FROM \`${TABLE}\`
        WHERE status = 'INACTIVE'
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE \`${TABLE}\`
        MODIFY COLUMN status ENUM('ACTIVE') NOT NULL DEFAULT 'ACTIVE'
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, TABLE))) {
      return;
    }

    if (await columnExists(queryInterface, TABLE, 'status')) {
      await queryInterface.sequelize.query(`
        ALTER TABLE \`${TABLE}\`
        MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE'
      `);
    }

    if (!(await columnExists(queryInterface, TABLE, 'holder_type'))) {
      await queryInterface.addColumn(TABLE, 'holder_type', {
        type: Sequelize.ENUM('PRIMARY', 'SECONDARY'),
        allowNull: false,
        defaultValue: 'PRIMARY',
      });
    }
  },
};
