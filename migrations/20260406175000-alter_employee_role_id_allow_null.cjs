'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('employee', 'role_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'role',
        key: 'role_id',
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('employee', 'role_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'role',
        key: 'role_id',
      }
    });
  }
};
