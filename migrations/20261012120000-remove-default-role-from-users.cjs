module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo.default_role) {
      await queryInterface.removeColumn('users', 'default_role');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.default_role) {
      await queryInterface.addColumn('users', 'default_role', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  }
};
