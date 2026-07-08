module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the column exists before removing it to prevent errors
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo.role) {
      await queryInterface.removeColumn('users', 'role');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.role) {
      await queryInterface.addColumn('users', 'role', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  }
};
