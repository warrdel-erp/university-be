'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('assessment_plan_subject_mapping', { transaction });

      if (!table.is_frozen && !table.isFrozen) {
        await queryInterface.addColumn(
          'assessment_plan_subject_mapping',
          'is_frozen',
          {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false,
          },
          { transaction }
        );
      }

      await transaction.commit();
      console.log('Successfully added is_frozen to assessment_plan_subject_mapping.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('assessment_plan_subject_mapping', { transaction });

      if (table.is_frozen || table.isFrozen) {
        await queryInterface.removeColumn('assessment_plan_subject_mapping', 'is_frozen', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
