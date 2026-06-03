'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_locations'`
    );
    if (tables.length) return;

    await queryInterface.createTable(
      'asset_locations',
      {
        asset_location_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        class_room_section_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'class_room_section', key: 'class_room_section_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'institute', key: 'institute_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      { charset: 'latin1', collate: 'latin1_swedish_ci' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('asset_locations');
  },
};
