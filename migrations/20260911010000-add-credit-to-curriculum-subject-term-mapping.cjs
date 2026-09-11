'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const description = await queryInterface.describeTable(
        'curriculum_subject_term_mapping',
        { transaction },
      );

      if (!description.credit) {
        await queryInterface.addColumn(
          'curriculum_subject_term_mapping',
          'credit',
          {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          { transaction },
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
      const description = await queryInterface.describeTable(
        'curriculum_subject_term_mapping',
        { transaction },
      );

      if (description.credit) {
        await queryInterface.removeColumn(
          'curriculum_subject_term_mapping',
          'credit',
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
