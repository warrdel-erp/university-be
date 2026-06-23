'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Soft-deleted rows still hold the unique (course_id, session_id) index.
    await queryInterface.sequelize.query(`
      DELETE FROM session_course_mapping WHERE deleted_at IS NOT NULL
    `);

    const table = await queryInterface.describeTable('session_course_mapping');
    if (table.deleted_at) {
      await queryInterface.removeColumn('session_course_mapping', 'deleted_at');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('session_course_mapping');
    if (!table.deleted_at) {
      await queryInterface.addColumn('session_course_mapping', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },
};
