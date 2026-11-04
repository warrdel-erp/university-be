'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modify status enum in leave_requests table to include 'skipped'
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE \`leave_requests\` 
        MODIFY COLUMN \`status\` ENUM('pending', 'approved', 'rejected', 'cancelled', 'skipped') NOT NULL DEFAULT 'pending'
      `);
      console.log("Successfully added 'skipped' to leave_requests status enum");
    } catch (err) {
      console.error("Error modifying leave_requests status enum:", err.message);
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE \`leave_requests\` 
        MODIFY COLUMN \`status\` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending'
      `);
    } catch (err) {
      console.error("Error reverting leave_requests status enum:", err.message);
    }
  },
};

