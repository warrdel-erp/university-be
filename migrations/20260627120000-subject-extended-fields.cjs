'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subject', 'short_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('subject', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('subject', 'subject_category', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('subject', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subject', 'is_active');
    await queryInterface.removeColumn('subject', 'subject_category');
    await queryInterface.removeColumn('subject', 'description');
    await queryInterface.removeColumn('subject', 'short_name');
  },
};
