"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("campus", "campus_type", {
      type: Sequelize.ENUM("Main", "Regional", "Satellite"),
      allowNull: true,
    });
    await queryInterface.addColumn("campus", "address_line", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("campus", "administrator_name", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("campus", "administrator_contact_number", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("campus", "administrator_email", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("campus", "administrator_email");
    await queryInterface.removeColumn("campus", "administrator_contact_number");
    await queryInterface.removeColumn("campus", "administrator_name");
    await queryInterface.removeColumn("campus", "address_line");
    await queryInterface.removeColumn("campus", "campus_type");
  },
};
