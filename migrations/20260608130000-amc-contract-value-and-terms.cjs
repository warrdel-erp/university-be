'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('amc_contract');

    if (table.contract_amount && !table.contract_value) {
      await queryInterface.renameColumn('amc_contract', 'contract_amount', 'contract_value');
    }

    if (!table.payment_terms) {
      await queryInterface.addColumn('amc_contract', 'payment_terms', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ANNUAL_UPFRONT',
      });
      await queryInterface.changeColumn('amc_contract', 'payment_terms', {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }

    if (!table.service_visit_frequency) {
      await queryInterface.addColumn('amc_contract', 'service_visit_frequency', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'MONTHLY',
      });
      await queryInterface.changeColumn('amc_contract', 'service_visit_frequency', {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('amc_contract');

    if (table.service_visit_frequency) {
      await queryInterface.removeColumn('amc_contract', 'service_visit_frequency');
    }

    if (table.payment_terms) {
      await queryInterface.removeColumn('amc_contract', 'payment_terms');
    }

    if (table.contract_value && !table.contract_amount) {
      await queryInterface.renameColumn('amc_contract', 'contract_value', 'contract_amount');
    }
  },
};
