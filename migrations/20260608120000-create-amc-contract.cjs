'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'amc_contract',
      {
        amc_contract_id: {
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
        contract_number: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        contract_name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        approval_status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        amc_vendor_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'amc_vendor', key: 'amc_vendor_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        contract_type: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        start_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        end_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        contract_value: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
        },
        payment_terms: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        service_visit_frequency: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        sla_response_hours: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        sla_resolution_hours: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        description: {
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

    await queryInterface.addIndex('amc_contract', ['institute_id', 'contract_number'], {
      unique: true,
      name: 'amc_contract_institute_id_contract_number_unique',
    });

    await queryInterface.addIndex('amc_contract', ['institute_id', 'amc_vendor_id'], {
      unique: true,
      name: 'amc_contract_institute_id_amc_vendor_id_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'amc_contract',
      'amc_contract_institute_id_amc_vendor_id_unique'
    );
    await queryInterface.removeIndex(
      'amc_contract',
      'amc_contract_institute_id_contract_number_unique'
    );
    await queryInterface.dropTable('amc_contract');
  },
};
