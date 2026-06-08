'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('amc_contract');

    if (!table.contract_name) {
      await queryInterface.addColumn('amc_contract', 'contract_name', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      });
      await queryInterface.changeColumn('amc_contract', 'contract_name', {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }

    if (!table.approval_status) {
      await queryInterface.addColumn('amc_contract', 'approval_status', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'DRAFT',
      });
      await queryInterface.changeColumn('amc_contract', 'approval_status', {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('amc_contract');

    if (table.approval_status) {
      await queryInterface.removeColumn('amc_contract', 'approval_status');
    }

    if (table.contract_name) {
      await queryInterface.removeColumn('amc_contract', 'contract_name');
    }
  },
};
