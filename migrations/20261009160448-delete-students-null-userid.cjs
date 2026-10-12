'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('students', {
      user_id: null
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Reverting this migration is not possible as the data is permanently deleted.
     */
  }
};
