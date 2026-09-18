'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Remove from assessment_plan_subject_mapping
      const subjectMappingTable = await queryInterface.describeTable('assessment_plan_subject_mapping');
      if (subjectMappingTable.acedmic_year_id) {
        await queryInterface.removeColumn('assessment_plan_subject_mapping', 'acedmic_year_id', { transaction });
      }

      // 2. Remove from assessment_plan_component
      const componentTable = await queryInterface.describeTable('assessment_plan_component');
      if (componentTable.acedmic_year_id) {
        await queryInterface.removeColumn('assessment_plan_component', 'acedmic_year_id', { transaction });
      }

      // 3. Remove from assessment_plan
      const planTable = await queryInterface.describeTable('assessment_plan');
      if (planTable.acedmic_year_id) {
        await queryInterface.removeColumn('assessment_plan', 'acedmic_year_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const planTable = await queryInterface.describeTable('assessment_plan');
      if (!planTable.acedmic_year_id) {
        await queryInterface.addColumn(
          'assessment_plan',
          'acedmic_year_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'acedmic_year',
              key: 'acedmic_year_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction }
        );
      }

      const componentTable = await queryInterface.describeTable('assessment_plan_component');
      if (!componentTable.acedmic_year_id) {
        await queryInterface.addColumn(
          'assessment_plan_component',
          'acedmic_year_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'acedmic_year',
              key: 'acedmic_year_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction }
        );
      }

      const subjectMappingTable = await queryInterface.describeTable('assessment_plan_subject_mapping');
      if (!subjectMappingTable.acedmic_year_id) {
        await queryInterface.addColumn(
          'assessment_plan_subject_mapping',
          'acedmic_year_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'acedmic_year',
              key: 'acedmic_year_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
