'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Make session_batch_mapping_id NOT NULL since backfill is complete
      await queryInterface.changeColumn(
        'curriculum_batch_mapping',
        'session_batch_mapping_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction: t }
      );

      // 2. Drop the legacy batch column
      await queryInterface.removeColumn(
        'curriculum_batch_mapping',
        'batch',
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        'curriculum_batch_mapping',
        'batch',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction: t }
      );
      
      await queryInterface.changeColumn(
        'curriculum_batch_mapping',
        'session_batch_mapping_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction: t }
      );
    });
  }
};
