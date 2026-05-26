'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('fee_type_catalog');

    if (!tableDefinition.ledger_type) {
      await queryInterface.addColumn('fee_type_catalog', 'ledger_type', {
        type: Sequelize.ENUM('Account Receivable', 'Account Payable'),
        allowNull: false,
        defaultValue: 'Account Receivable',
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('fee_type_catalog');

    if (tableDefinition.ledger_type) {
      await queryInterface.removeColumn('fee_type_catalog', 'ledger_type');
    }
  },
};
