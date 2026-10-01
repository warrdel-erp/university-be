'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // Add composite unique index for session_id + batch
      await queryInterface.addIndex(
        'session_batch_mapping',
        ['session_id', 'batch'],
        {
          unique: true,
          name: 'unique_session_batch',
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeIndex(
        'session_batch_mapping',
        'unique_session_batch',
        { transaction: t }
      );
    });
  }
};
