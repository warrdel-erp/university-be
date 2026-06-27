'use strict';

/** Add optional department_id to course */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('course', 'department_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'department',
        key: 'department_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('course', 'department_id');
  },
};
