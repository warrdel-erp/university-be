'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.changeColumn('class_sections', 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }, { transaction: t });
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.changeColumn('class_sections', 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
      }, { transaction: t });
    });
  }
};
