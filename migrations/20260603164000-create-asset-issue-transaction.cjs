'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_issue_transaction'`
    );
    if (tables.length) return;

    await queryInterface.createTable(
      'asset_issue_transaction',
      {
        asset_issue_transaction_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'institute', key: 'institute_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        member_id: { type: Sequelize.INTEGER, allowNull: false },
        member_type: { type: Sequelize.ENUM('STUDENT', 'TEACHER'), allowNull: false },
        issue_date: { type: Sequelize.DATEONLY, allowNull: false },
        due_date: { type: Sequelize.DATEONLY, allowNull: false },
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

    await queryInterface.addIndex('asset_issue_transaction', ['institute_id'], {
      name: 'idx_asset_issue_transaction_institute',
    });
    await queryInterface.addIndex('asset_issue_transaction', ['member_type', 'member_id'], {
      name: 'idx_asset_issue_transaction_member',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('asset_issue_transaction', 'idx_asset_issue_transaction_member');
    await queryInterface.removeIndex('asset_issue_transaction', 'idx_asset_issue_transaction_institute');
    await queryInterface.dropTable('asset_issue_transaction');
  },
};
