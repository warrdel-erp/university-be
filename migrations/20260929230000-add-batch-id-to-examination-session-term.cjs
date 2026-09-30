'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('examination_session_term');
    if (!tableDesc.batch_id && !tableDesc.batchId) {
      await queryInterface.addColumn('examination_session_term', 'batch_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'batch',
          key: 'batch_id',
        },
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('examination_session_term');
    if (tableDesc.batch_id || tableDesc.batchId) {
      await queryInterface.removeColumn('examination_session_term', 'batch_id');
    }
  },
};
