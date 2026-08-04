'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('examination_session_slot').catch(() => ({}));

    if (tableDescription.slot_name) {
      await queryInterface.removeColumn('examination_session_slot', 'slot_name');
    }

    if (tableDescription.slot_number) {
      await queryInterface.changeColumn('examination_session_slot', 'slot_number', {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('examination_session_slot').catch(() => ({}));

    if (!tableDescription.slot_name) {
      await queryInterface.addColumn('examination_session_slot', 'slot_name', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (tableDescription.slot_number) {
      await queryInterface.changeColumn('examination_session_slot', 'slot_number', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  }
};
