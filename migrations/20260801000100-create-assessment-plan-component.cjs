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
        component_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        evaluation_type: {
          type: Sequelize.ENUM('Marks', 'Grade'),
          allowNull: false,
          defaultValue: 'Marks',
        },
        evaluation_by: {
          type: Sequelize.ENUM('Faculty', 'CoE', 'External'),
          allowNull: false,
          defaultValue: 'Faculty',
        },
        component_category: {
          type: Sequelize.ENUM(
            'Continuous Assessment',
            'Internal Assessment',
            'External Examination',
            'Practical',
            'Viva',
            'Project'
          ),
          allowNull: false,
        },
        max_marks: {
          type: Sequelize.DECIMAL(8, 2),
          allowNull: false,
        },
        weightage_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
        },
        passing_marks: {
          type: Sequelize.DECIMAL(8, 2),
          allowNull: true,
        },
        max_assessments: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        best_of_rule: {
          type: Sequelize.ENUM('NONE', 'BEST_1', 'BEST_2', 'AVERAGE', 'HIGHEST'),
          allowNull: false,
          defaultValue: 'NONE',
        },
        display_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        is_mandatory: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
