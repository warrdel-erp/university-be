'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const transaction = await sequelize.transaction();
    try {
      await queryInterface.addColumn('student_result', 'published_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });
      await queryInterface.addColumn('student_result', 'publish_batch_id', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const transaction = await sequelize.transaction();
    try {
      await queryInterface.removeColumn('student_result', 'published_at', { transaction });
      await queryInterface.removeColumn('student_result', 'publish_batch_id', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
