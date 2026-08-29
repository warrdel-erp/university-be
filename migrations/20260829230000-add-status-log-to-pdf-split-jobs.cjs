'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pdf_split_jobs', 'status_log', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      after: 'status',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pdf_split_jobs', 'status_log');
  },
};
