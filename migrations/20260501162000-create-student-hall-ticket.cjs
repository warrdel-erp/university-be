'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_hall_ticket', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      qr: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      exam_setup_type_term_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exam_setup_type_term',
          key: 'exam_setup_type_term_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'session',
          key: 'session_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'student_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'institute',
          key: 'institute_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      university_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'university',
          key: 'university_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('student_hall_ticket', ['exam_setup_type_term_id', 'session_id', 'student_id'], {
      unique: true,
      name: 'uq_student_hall_ticket_exam_session_student'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('student_hall_ticket', 'uq_student_hall_ticket_exam_session_student');
    await queryInterface.dropTable('student_hall_ticket');
  }
};
