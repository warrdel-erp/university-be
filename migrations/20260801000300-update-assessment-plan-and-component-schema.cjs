'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Updates for assessment_plan
    const planTable = await queryInterface.describeTable('assessment_plan');

    if (!planTable.session_id) {
      await queryInterface.addColumn('assessment_plan', 'session_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'session',
          key: 'session_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex('assessment_plan', ['session_id']);
    }

    if (planTable.exam_mode) {
      await queryInterface.removeColumn('assessment_plan', 'exam_mode');
    }
    if (planTable.programme_id) {
      await queryInterface.removeColumn('assessment_plan', 'programme_id');
    }
    if (planTable.internal_marks) {
      await queryInterface.removeColumn('assessment_plan', 'internal_marks');
    }
    if (planTable.external_marks) {
      await queryInterface.removeColumn('assessment_plan', 'external_marks');
    }
    if (planTable.total_marks) {
      await queryInterface.removeColumn('assessment_plan', 'total_marks');
    }

    // 2. Updates for assessment_plan_component
    const compTable = await queryInterface.describeTable('assessment_plan_component');

    if (!compTable.exam_setup_type_id) {
      await queryInterface.addColumn('assessment_plan_component', 'exam_setup_type_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'exam_setup_type',
          key: 'exam_setup_type_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex('assessment_plan_component', ['exam_setup_type_id']);
    }

    const compColumnsToRemove = [
      'component_name',
      'evaluation_type',
      'component_category',
      'max_marks',
      'passing_marks',
      'best_of_rule',
      'display_order',
      'is_mandatory',
      'is_active',
    ];

    for (const col of compColumnsToRemove) {
      if (compTable[col]) {
        await queryInterface.removeColumn('assessment_plan_component', col);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const planTable = await queryInterface.describeTable('assessment_plan');
    if (planTable.session_id) {
      await queryInterface.removeColumn('assessment_plan', 'session_id');
    }

    const compTable = await queryInterface.describeTable('assessment_plan_component');
    if (compTable.exam_setup_type_id) {
      await queryInterface.removeColumn('assessment_plan_component', 'exam_setup_type_id');
    }
  }
};
