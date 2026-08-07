'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('exam_schedule').catch(() => ({}));

    if (tableDescription.exam_setup_type_term_id) {
      await queryInterface.changeColumn('exam_schedule', 'exam_setup_type_term_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'exam_setup_type_term',
          key: 'exam_setup_type_term_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!tableDescription.examination_session_id) {
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

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('exam_schedule').catch(() => ({}));

    if (tableDescription.exam_setup_type_term_id) {
      await queryInterface.changeColumn('exam_schedule', 'exam_setup_type_term_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exam_setup_type_term',
          key: 'exam_setup_type_term_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    if (tableDescription.examination_session_id) {
      await queryInterface.removeColumn('exam_schedule', 'examination_session_id');
    }
  }
};
