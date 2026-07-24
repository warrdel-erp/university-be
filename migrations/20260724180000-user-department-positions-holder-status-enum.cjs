'use strict';

const {
  departmentPositionHolderTypes,
  departmentPositionHeadStatuses,
} = require('../constant.js');

const TABLE = 'user_department_positions';

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!(await columnExists(queryInterface, TABLE, 'holder_type'))) {
      return;
    }

    // Align legacy ACTING values with FE SECONDARY
    await queryInterface.sequelize.query(`
      UPDATE \`${TABLE}\`
      SET holder_type = 'SECONDARY'
      WHERE holder_type = 'ACTING'
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE \`${TABLE}\`
      MODIFY COLUMN holder_type ENUM(${departmentPositionHolderTypes.map((v) => `'${v}'`).join(', ')}) NOT NULL
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE \`${TABLE}\`
      MODIFY COLUMN status ENUM(${departmentPositionHeadStatuses.map((v) => `'${v}'`).join(', ')}) NOT NULL DEFAULT 'ACTIVE'
    `);
  },

  async down(queryInterface) {
    if (!(await columnExists(queryInterface, TABLE, 'holder_type'))) {
      return;
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE \`${TABLE}\`
      MODIFY COLUMN holder_type VARCHAR(255) NOT NULL
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE \`${TABLE}\`
      MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'ACTIVE'
    `);
  },
};
