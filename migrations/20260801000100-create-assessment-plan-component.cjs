'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables().then(tables =>
      tables.includes('assessment_plan_component')
    );

    if (!tableExists) {
      await queryInterface.createTable('assessment_plan_component', {
        assessment_plan_component_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        exam_setup_type_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'exam_setup_type',
            key: 'exam_setup_type_id',
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
        assessment_plan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'assessment_plan',
            key: 'assessment_plan_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        evaluation_by: {
          type: Sequelize.ENUM('Faculty', 'CoE', 'External'),
          allowNull: false,
          defaultValue: 'Faculty',
        },
        weightage_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
        },
        max_assessments: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
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
      await queryInterface.addIndex('assessment_plan_component', ['exam_setup_type_id']);
      await queryInterface.addIndex('assessment_plan_component', ['acedmic_year_id']);
      await queryInterface.addIndex('assessment_plan_component', ['assessment_plan_id']);
      await queryInterface.addIndex('assessment_plan_component', ['university_id']);
      await queryInterface.addIndex('assessment_plan_component', ['institute_id']);
      await queryInterface.addIndex('assessment_plan_component', ['created_by']);
      await queryInterface.addIndex('assessment_plan_component', ['updated_by']);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('assessment_plan_component');
  }
};
