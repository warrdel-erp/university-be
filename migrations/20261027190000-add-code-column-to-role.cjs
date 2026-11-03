'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('role');

    // 1. Add 'code' column if not present
    if (!tableInfo.code) {
      await queryInterface.addColumn('role', 'code', {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null,
        comment: 'System-generated unique identifier for permanent roles'
      });
    }

    // 2. Add Composite Unique Index on (university_id, code) if not exists
    const indexes = await queryInterface.showIndex('role');
    const hasCodeIndex = indexes.some((idx) => idx.name === 'unique_university_role_code');
    if (!hasCodeIndex) {
      await queryInterface.addIndex('role', ['university_id', 'code'], {
        unique: true,
        name: 'unique_university_role_code'
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('role');
    const hasCodeIndex = indexes.some((idx) => idx.name === 'unique_university_role_code');
    if (hasCodeIndex) {
      await queryInterface.removeIndex('role', 'unique_university_role_code');
    }

    const tableInfo = await queryInterface.describeTable('role');
    if (tableInfo.code) {
      await queryInterface.removeColumn('role', 'code');
    }
  }
};
