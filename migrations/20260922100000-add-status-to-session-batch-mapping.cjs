'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Add status column
      await queryInterface.addColumn(
        'session_batch_mapping',
        'status',
        {
          type: Sequelize.ENUM('draft', 'published'),
          allowNull: false,
          defaultValue: 'draft',
        },
        { transaction: t },
      );

      // 2. Add intake_capacity column
      await queryInterface.addColumn(
        'session_batch_mapping',
        'intake_capacity',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction: t },
      );

      // 3. Backfill: all existing rows are already in active use → mark as published
      await queryInterface.sequelize.query(
        `UPDATE session_batch_mapping SET status = 'published'`,
        { transaction: t },
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn('session_batch_mapping', 'intake_capacity', { transaction: t });
      await queryInterface.removeColumn('session_batch_mapping', 'status', { transaction: t });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_session_batch_mapping_status";', { transaction: t });
    });
  },
};
