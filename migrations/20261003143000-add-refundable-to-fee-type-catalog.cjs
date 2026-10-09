'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('fee_type_catalog');
    if (!tableInfo.refundable) {
      await queryInterface.addColumn('fee_type_catalog', 'refundable', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null,
        after: 'ledger_type',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('fee_type_catalog');
    if (tableInfo.refundable) {
      await queryInterface.removeColumn('fee_type_catalog', 'refundable');
    }
  },
};
