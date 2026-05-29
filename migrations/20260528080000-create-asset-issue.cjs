'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'asset_issue',
      {
        asset_issue_id: {
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
        member_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        member_type: {
          type: Sequelize.ENUM('STUDENT', 'TEACHER'),
          allowNull: false,
        },
        issue_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        due_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
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

    await queryInterface.addIndex('asset_issue', ['institute_id'], {
      name: 'idx_asset_issue_institute',
    });
    await queryInterface.addIndex('asset_issue', ['member_type', 'member_id'], {
      name: 'idx_asset_issue_member',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('asset_issue', 'idx_asset_issue_member');
    await queryInterface.removeIndex('asset_issue', 'idx_asset_issue_institute');
    await queryInterface.dropTable('asset_issue');
  },
};
