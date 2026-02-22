"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Remove sample from users
     */
    await queryInterface.removeColumn("users", "sample");
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add sample to users
     */
    await queryInterface.addColumn("users", "sample", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
