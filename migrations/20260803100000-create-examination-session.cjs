'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('examination_session', {
      examination_session_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      university_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'university',
          key: 'university_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'institute',
          key: 'institute_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      acedmic_year_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      assessment_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exam_setup_type',
          key: 'exam_setup_type_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      session_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      exam_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      exam_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      hall_ticket_release_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      seat_allocation_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      evaluation_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      evaluation_deadline: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      moderation_deadline: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      result_publication_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      auto_generate_seating: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      auto_allocate_rooms: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      auto_assign_invigilators: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      qr_attendance: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      barcode_answer_sheet: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ai_evaluation: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      moderation_workflow: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      allow_revaluation: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM('Draft', 'Published', 'Completed', 'Cancelled'),
        allowNull: false,
        defaultValue: 'Draft',
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('examination_session');
  },
};
