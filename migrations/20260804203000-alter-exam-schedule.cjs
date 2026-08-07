'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Delete all old exam schedules that do not have an examination_session_id
    await queryInterface.sequelize.query(
      `DELETE FROM exam_schedule WHERE examination_session_id IS NULL;`
    );

    const tableDescription = await queryInterface.describeTable('exam_schedule').catch(() => ({}));

    // 1. Remove exam_setup_type_term_id
    if (tableDescription.exam_setup_type_term_id) {
      await queryInterface.removeColumn('exam_schedule', 'exam_setup_type_term_id');
    }

    // 2. Add examination_session_id if missing, or alter if exists
    if (!tableDescription.examination_session_id) {
      await queryInterface.addColumn('exam_schedule', 'examination_session_id', {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'examination_session',
          key: 'examination_session_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // Or RESTRICT, depending on logic, but SET NULL conflicts with allowNull: false
      });
    } else {
      await queryInterface.changeColumn('exam_schedule', 'examination_session_id', {
        type: Sequelize.BIGINT,
        allowNull: false,
      });
    }

    // 3. Make subject_id NOT NULL
    if (tableDescription.subject_id) {
      await queryInterface.changeColumn('exam_schedule', 'subject_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    // 4. Make examination_session_slot_id NOT NULL
    if (tableDescription.examination_session_slot_id) {
      await queryInterface.changeColumn('exam_schedule', 'examination_session_slot_id', {
        type: Sequelize.BIGINT,
        allowNull: false,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('exam_schedule').catch(() => ({}));

    if (tableDescription.examination_session_slot_id) {
      await queryInterface.changeColumn('exam_schedule', 'examination_session_slot_id', {
        type: Sequelize.BIGINT,
        allowNull: true,
      });
    }

    if (tableDescription.subject_id) {
      await queryInterface.changeColumn('exam_schedule', 'subject_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (tableDescription.examination_session_id) {
      await queryInterface.removeColumn('exam_schedule', 'examination_session_id');
    }

    if (!tableDescription.exam_setup_type_term_id) {
      await queryInterface.addColumn('exam_schedule', 'exam_setup_type_term_id', {
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
  }
};
