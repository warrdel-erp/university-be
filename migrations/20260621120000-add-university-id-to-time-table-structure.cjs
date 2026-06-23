'use strict';

// const TABLE = 'time_table_structure';
// const COLUMN = 'university_id';

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const table = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(table[columnName]);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const exists = await columnExists(queryInterface, 'time_table_structure', 'university_id');
    if (exists) {
      return;
    }

    await queryInterface.addColumn('time_table_structure', 'university_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'university',
        key: 'university_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  down: async (queryInterface) => {
    const exists = await columnExists(queryInterface, 'time_table_structure', 'university_id');
    if (exists) {
      await queryInterface.removeColumn('time_table_structure', 'university_id');
    }
  },
};
