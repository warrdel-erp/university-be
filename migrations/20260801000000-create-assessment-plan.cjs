'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables().then(tables =>
      tables.includes('assessment_plan')
    );

    if (!tableExists) {
      await queryInterface.createTable('assessment_plan', {
        assessment_plan_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        session_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'session',
            key: 'session_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        acedmic_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'acedmic_year',
            key: 'acedmic_year_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        plan_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        plan_code: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        course_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'course',
            key: 'course_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        regulation_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'academic_regulation',
            key: 'academic_regulation_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        term: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        grading_scheme: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('Draft', 'Active', 'Archived'),
          allowNull: false,
          defaultValue: 'Draft',
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'user_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'user_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });

      // Indexes on FK columns
      await queryInterface.addIndex('assessment_plan', ['session_id']);
      await queryInterface.addIndex('assessment_plan', ['acedmic_year_id']);
      await queryInterface.addIndex('assessment_plan', ['course_id']);
      await queryInterface.addIndex('assessment_plan', ['regulation_id']);
      await queryInterface.addIndex('assessment_plan', ['term']);
      await queryInterface.addIndex('assessment_plan', ['university_id']);
      await queryInterface.addIndex('assessment_plan', ['institute_id']);
      await queryInterface.addIndex('assessment_plan', ['created_by']);
      await queryInterface.addIndex('assessment_plan', ['updated_by']);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('assessment_plan');
  }
};
