'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'amc_service_ticket',
      {
        amc_service_ticket_id: {
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
        ticket_number: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        asset_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'asset', key: 'asset_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        amc_vendor_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'amc_vendor', key: 'amc_vendor_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        asset_category_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'asset_categories', key: 'asset_category_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        issue: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        issue_type: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        problem_description: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        downtime_started_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        priority: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'MEDIUM',
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'OPEN',
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

    await queryInterface.addIndex('amc_service_ticket', ['institute_id', 'ticket_number'], {
      unique: true,
      name: 'amc_service_ticket_institute_id_ticket_number_unique',
    });

    await queryInterface.addIndex('amc_service_ticket', ['institute_id', 'status'], {
      name: 'amc_service_ticket_institute_id_status',
    });

    await queryInterface.addIndex('amc_service_ticket', ['institute_id', 'asset_id'], {
      name: 'amc_service_ticket_institute_id_asset_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'amc_service_ticket',
      'amc_service_ticket_institute_id_asset_id'
    );
    await queryInterface.removeIndex('amc_service_ticket', 'amc_service_ticket_institute_id_status');
    await queryInterface.removeIndex(
      'amc_service_ticket',
      'amc_service_ticket_institute_id_ticket_number_unique'
    );
    await queryInterface.dropTable('amc_service_ticket');
  },
};
