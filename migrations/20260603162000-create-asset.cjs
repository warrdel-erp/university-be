'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset'`
    );
    if (tables.length) return;

    await queryInterface.createTable(
      'asset',
      {
        asset_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        name: { type: Sequelize.STRING, allowNull: false },
        code: { type: Sequelize.STRING, allowNull: false },
        status: {
          type: Sequelize.ENUM('ISSUED', 'IN_STOCK', 'MAINTANANCE'),
          allowNull: false,
        },
        condition: {
          type: Sequelize.ENUM('GOOD', 'FAIR', 'EXCELLENT', 'BAD'),
          allowNull: false,
        },
        description: { type: Sequelize.STRING, allowNull: true },
        asset_category_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'asset_categories', key: 'asset_category_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
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

    await queryInterface.addIndex('asset', ['institute_id', 'code'], {
      unique: true,
      name: 'asset_institute_id_code_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('asset', 'asset_institute_id_code_unique');
    await queryInterface.dropTable('asset');
  },
};
