'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('curriculum');
    if (!table.publish_status) {
      await queryInterface.addColumn('curriculum', 'publish_status', {
        type: Sequelize.ENUM('draft', 'published'),
        allowNull: false,
        defaultValue: 'draft',
      });
    }

    // Existing rows: treat as already live
    await queryInterface.sequelize.query(
      `UPDATE curriculum SET publish_status = 'published'`,
    );
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('curriculum');
    if (table.publish_status) {
      await queryInterface.removeColumn('curriculum', 'publish_status');
    }
  },
};
