'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableExists = tables.includes('asset_issue_item');

    if (!tableExists) {
      await queryInterface.createTable(
        'asset_issue_item',
        {
          asset_issue_item_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          asset_issue_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'asset_issue', key: 'asset_issue_id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          asset_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'asset', key: 'asset_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          return_date: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          remarks: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { charset: 'latin1', collate: 'latin1_swedish_ci' }
      );
    }

    const [indexes] = await queryInterface.sequelize.query(`
      SHOW INDEX FROM asset_issue_item WHERE Key_name = 'idx_asset_issue_item_issue'
    `);
    if (!indexes.length) {
      await queryInterface.addIndex('asset_issue_item', ['asset_issue_id'], {
        name: 'idx_asset_issue_item_issue',
      });
    }

    const [assetIndexes] = await queryInterface.sequelize.query(`
      SHOW INDEX FROM asset_issue_item WHERE Key_name = 'idx_asset_issue_item_asset'
    `);
    if (!assetIndexes.length) {
      await queryInterface.addIndex('asset_issue_item', ['asset_id'], {
        name: 'idx_asset_issue_item_asset',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('asset_issue_item', 'idx_asset_issue_item_asset');
    await queryInterface.removeIndex('asset_issue_item', 'idx_asset_issue_item_issue');
    await queryInterface.dropTable('asset_issue_item');
  },
};
