'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM `time_table_cell_date_wise` WHERE Key_name = 'idx_ttcdw_date'"
    );
    if (!indexes || indexes.length === 0) {
      await queryInterface.addIndex('time_table_cell_date_wise', ['date'], {
        name: 'idx_ttcdw_date',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM `time_table_cell_date_wise` WHERE Key_name = 'idx_ttcdw_date'"
    );
    if (indexes && indexes.length > 0) {
      await queryInterface.removeIndex('time_table_cell_date_wise', 'idx_ttcdw_date');
    }
  },
};
