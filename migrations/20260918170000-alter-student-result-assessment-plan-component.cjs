'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('student_result');

      // Add assessment_plan_component_id if not present
      if (!tableInfo.assessment_plan_component_id) {
        await queryInterface.addColumn(
          'student_result',
          'assessment_plan_component_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'assessment_plan_component',
              key: 'assessment_plan_component_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          { transaction }
        );

        await queryInterface.addIndex(
          'student_result',
          ['assessment_plan_component_id', 'student_id'],
          {
            name: 'idx_student_result_component_student',
            transaction,
          }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableInfo = await queryInterface.describeTable('student_result');

      if (tableInfo.assessment_plan_component_id) {
        try {
          await queryInterface.removeIndex('student_result', 'idx_student_result_component_student', { transaction });
        } catch (e) {
          // Ignore if index doesn't exist
        }
        await queryInterface.removeColumn('student_result', 'assessment_plan_component_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
