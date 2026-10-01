'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const tableInfo = await queryInterface.describeTable('session');
      if (tableInfo.starting_date) {
        await queryInterface.removeColumn('session', 'starting_date', { transaction: t });
      }
      if (tableInfo.ending_date) {
        await queryInterface.removeColumn('session', 'ending_date', { transaction: t });
      }
      if (tableInfo.class_til_date) {
        await queryInterface.removeColumn('session', 'class_til_date', { transaction: t });
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn('session', 'starting_date', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction: t });
      await queryInterface.addColumn('session', 'ending_date', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction: t });
      await queryInterface.addColumn('session', 'class_til_date', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction: t });
    });
  }
};
