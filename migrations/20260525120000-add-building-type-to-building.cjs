'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('building', 'building_type', {
      type: Sequelize.ENUM('Academics', 'Residential'),
      allowNull: false,
      defaultValue: 'Academics',
      after: 'name',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('building', 'building_type');
  },
};
