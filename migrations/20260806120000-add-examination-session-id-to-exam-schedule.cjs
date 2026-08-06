'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('exam_schedule').catch(() => ({}));
    if (tableDescription && !tableDescription.examination_session_id) {
      await queryInterface.addColumn('exam_schedule', 'examination_session_id', {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'examination_session',
          key: 'examination_session_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('exam_schedule').catch(() => ({}));
    if (tableDescription && tableDescription.examination_session_id) {
      await queryInterface.removeColumn('exam_schedule', 'examination_session_id');
    }
  },
};
