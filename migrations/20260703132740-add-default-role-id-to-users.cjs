'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'default_role_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'role',
        key: 'role_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'default_role_id');
  }
};
