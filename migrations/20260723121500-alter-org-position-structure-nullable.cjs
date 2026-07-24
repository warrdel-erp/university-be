'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('org_position', 'department_structure_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'department_structure',
        key: 'department_structure_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('org_position', 'department_structure_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'department_structure',
        key: 'department_structure_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },
};
