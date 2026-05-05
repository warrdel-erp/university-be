'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('answer_sheet_qr', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      qr: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'students',
          key: 'student_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      exam_schedule_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'exam_schedule',
          key: 'exam_schedule_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'institute',
          key: 'institute_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      university_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'university',
          key: 'university_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    await queryInterface.addIndex('answer_sheet_qr', ['qr'], {
      name: 'idx_answer_sheet_qr_qr',
      unique: true
    });

    // One exam schedule can map to only one answer sheet QR row.
    await queryInterface.addIndex('answer_sheet_qr', ['exam_schedule_id'], {
      name: 'uq_answer_sheet_qr_exam_schedule_id',
      unique: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('answer_sheet_qr', 'uq_answer_sheet_qr_exam_schedule_id');
    await queryInterface.removeIndex('answer_sheet_qr', 'idx_answer_sheet_qr_qr');
    await queryInterface.dropTable('answer_sheet_qr');
  }
};