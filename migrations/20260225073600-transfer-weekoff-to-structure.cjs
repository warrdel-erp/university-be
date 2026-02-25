module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add week_off to time_table_structure
    await queryInterface.addColumn('time_table_structure', 'week_off', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    // 2. Transfer data from time_table_structure_periods to time_table_structure
    await queryInterface.sequelize.query(`
      UPDATE time_table_structure tts
      JOIN time_table_structure_periods ttsp ON tts.time_table_name_id = ttsp.time_table_name_id
      SET tts.week_off = ttsp.week_off;
    `);

    // 3. Remove week_off from time_table_structure_periods
    await queryInterface.removeColumn('time_table_structure_periods', 'week_off');
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Add week_off back to time_table_structure_periods
    await queryInterface.addColumn('time_table_structure_periods', 'week_off', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    // 2. Transfer data back
    await queryInterface.sequelize.query(`
      UPDATE time_table_structure_periods ttsp
      JOIN time_table_structure tts ON tts.time_table_name_id = ttsp.time_table_name_id
      SET ttsp.week_off = tts.week_off;
    `);

    // 3. Remove week_off from time_table_structure
    await queryInterface.removeColumn('time_table_structure', 'week_off');
  }
};
