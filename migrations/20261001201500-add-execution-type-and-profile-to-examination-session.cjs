'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('examination_session');
    if (!tableInfo.execution_type) {
      await queryInterface.addColumn('examination_session', 'execution_type', {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: 'session_name',
      });
    }
    if (!tableInfo.execution_profile) {
      await queryInterface.addColumn('examination_session', 'execution_profile', {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: 'execution_type',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('examination_session');
    if (tableInfo.execution_profile) {
      await queryInterface.removeColumn('examination_session', 'execution_profile');
    }
    if (tableInfo.execution_type) {
      await queryInterface.removeColumn('examination_session', 'execution_type');
    }
  }
};
