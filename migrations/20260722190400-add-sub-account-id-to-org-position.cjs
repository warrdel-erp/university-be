'use strict';

async function indexExists(queryInterface, tableName, indexName) {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((idx) => idx.name === indexName);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('org_position');
    if (!table.sub_account_id) {
      await queryInterface.addColumn('org_position', 'sub_account_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'sub_account', key: 'sub_account_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!(await indexExists(queryInterface, 'org_position', 'idx_org_position_sub_account'))) {
      await queryInterface.addIndex('org_position', ['sub_account_id'], {
        name: 'idx_org_position_sub_account',
      });
    }
  },

  async down(queryInterface) {
    if (await indexExists(queryInterface, 'org_position', 'idx_org_position_sub_account')) {
      await queryInterface.removeIndex('org_position', 'idx_org_position_sub_account');
    }

    const table = await queryInterface.describeTable('org_position');
    if (table.sub_account_id) {
      await queryInterface.removeColumn('org_position', 'sub_account_id');
    }
  },
};
