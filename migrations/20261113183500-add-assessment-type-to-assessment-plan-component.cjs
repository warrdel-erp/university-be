'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('assessment_plan_component', { transaction });

      // 1. Add assessment_type column if it doesn't already exist
      if (!table.assessment_type) {
        await queryInterface.addColumn(
          'assessment_plan_component',
          'assessment_type',
          {
            type: Sequelize.ENUM('INTERNAL', 'EXTERNAL'),
            allowNull: true,
            defaultValue: null,
          },
          { transaction }
        );
      }

      // 2. Backfill existing records to 'INTERNAL'
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan_component SET assessment_type = 'INTERNAL' WHERE assessment_type IS NULL;`,
        { transaction }
      );

      await transaction.commit();
      console.log('Successfully added assessment_type to assessment_plan_component and backfilled existing rows with INTERNAL.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('assessment_plan_component', { transaction });

      if (table.assessment_type) {
        await queryInterface.removeColumn('assessment_plan_component', 'assessment_type', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

