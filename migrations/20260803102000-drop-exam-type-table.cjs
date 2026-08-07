'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop legacy exam_type table if it exists
    await queryInterface.dropTable('exam_type', { cascade: true }).catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    // Re-create legacy exam_type table structure if rolled back
    await queryInterface.createTable('exam_type', {
      exam_type_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      acedmic_year_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      university_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      exam_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },
};
