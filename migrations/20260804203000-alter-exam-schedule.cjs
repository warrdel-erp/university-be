'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('exam_schedule').catch(() => ({}));

    // Delete all old exam schedules that do not have an examination_session_id
    // (only safe to run if the column already exists from a previous partial run)
    if (tableDescription.examination_session_id) {
      await queryInterface.sequelize.query(
        `DELETE FROM exam_schedule WHERE examination_session_id IS NULL;`
      );
    }

    // 1. Remove exam_setup_type_term_id
    if (tableDescription.exam_setup_type_term_id) {
      await queryInterface.removeColumn('exam_schedule', 'exam_setup_type_term_id');
    }

    // 2. Add examination_session_id if missing, or alter if exists
    if (!tableDescription.examination_session_id) {
      // Add column without FK first to avoid MySQL errno 150
      await queryInterface.addColumn('exam_schedule', 'examination_session_id', {
        type: Sequelize.BIGINT,
        allowNull: true, // temporarily nullable to allow adding the column safely
      });

      await queryInterface.addConstraint('exam_schedule', {
        fields: ['examination_session_id'],
        type: 'foreign key',
        name: 'exam_schedule_examination_session_id_foreign_idx',
        references: {
          table: 'examination_session',
          field: 'examination_session_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Remove rows without a valid examination_session_id before enforcing NOT NULL
      await queryInterface.sequelize.query(
        `DELETE FROM exam_schedule WHERE examination_session_id IS NULL;`
      );

      // Now enforce NOT NULL after FK is in place and NULLs are cleaned up
      await queryInterface.changeColumn('exam_schedule', 'examination_session_id', {
        type: Sequelize.BIGINT,
        allowNull: false,
      });
    } else {
      // examination_session_id column already exists — clean up NULLs first before enforcing NOT NULL
      await queryInterface.sequelize.query(
        `DELETE FROM exam_schedule WHERE examination_session_id IS NULL;`
      );

      try {
        await queryInterface.removeConstraint('exam_schedule', 'exam_schedule_examination_session_id_foreign_idx');
      } catch (err) {
        console.log("Constraint might not exist or already removed.", err.message);
      }
      
      await queryInterface.changeColumn('exam_schedule', 'examination_session_id', {
        type: Sequelize.BIGINT,
        allowNull: false,
      });

      await queryInterface.addConstraint('exam_schedule', {
        fields: ['examination_session_id'],
        type: 'foreign key',
        name: 'exam_schedule_examination_session_id_foreign_idx',
        references: {
          table: 'examination_session',
          field: 'examination_session_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    // 3. Make subject_id NOT NULL — delete NULLs first to avoid truncation error
    if (tableDescription.subject_id) {
      await queryInterface.sequelize.query(
        `DELETE FROM exam_schedule WHERE subject_id IS NULL;`
      );
      await queryInterface.changeColumn('exam_schedule', 'subject_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    // 4. Make examination_session_slot_id NOT NULL
    if (tableDescription.examination_session_slot_id) {
      // Clean up NULLs first to avoid truncation error
      await queryInterface.sequelize.query(
        `DELETE FROM exam_schedule WHERE examination_session_slot_id IS NULL;`
      );

      try {
        await queryInterface.removeConstraint('exam_schedule', 'exam_schedule_examination_session_slot_id_foreign_idx');
      } catch (err) {
        console.log("Constraint might not exist or already removed.", err.message);
      }

      await queryInterface.changeColumn('exam_schedule', 'examination_session_slot_id', {
        type: Sequelize.BIGINT,
        allowNull: false,
      });

      try {
        await queryInterface.addConstraint('exam_schedule', {
          fields: ['examination_session_slot_id'],
          type: 'foreign key',
          name: 'exam_schedule_examination_session_slot_id_foreign_idx',
          references: {
            table: 'examination_session_slot',
            field: 'examination_session_slot_id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
      } catch (err) {
        console.log("FK constraint on examination_session_slot_id could not be added:", err.message);
      }
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
