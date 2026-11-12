'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.createTable(
        'curriculum_category',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          category_name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          code: {
            type: Sequelize.STRING(20),
            allowNull: false,
            unique: true,
          },
          is_elective_coursework: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          description: {
            type: Sequelize.STRING(250),
            allowNull: true,
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
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('curriculum_category', { transaction: t });
    });
  },
};

