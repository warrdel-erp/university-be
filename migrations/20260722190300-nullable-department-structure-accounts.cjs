'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('department_structure', 'sub_account_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'sub_account', key: 'sub_account_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.changeColumn('department_structure', 'parent_account_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'sub_account', key: 'sub_account_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('department_structure', 'sub_account_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'sub_account', key: 'sub_account_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.changeColumn('department_structure', 'parent_account_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'sub_account', key: 'sub_account_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },
};
