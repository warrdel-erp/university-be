'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'amc_vendor',
      {
        amc_vendor_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'institute', key: 'institute_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        vendor_name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        vendor_code: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        contact_person: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        gst_number: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        asset_category_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'asset_categories', key: 'asset_category_id' },
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

    await queryInterface.addIndex('amc_vendor', ['institute_id', 'vendor_code'], {
      unique: true,
      name: 'amc_vendor_institute_id_vendor_code_unique',
    });

    await queryInterface.addIndex('amc_vendor', ['institute_id', 'vendor_name'], {
      unique: true,
      name: 'amc_vendor_institute_id_vendor_name_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('amc_vendor', 'amc_vendor_institute_id_vendor_name_unique');
    await queryInterface.removeIndex('amc_vendor', 'amc_vendor_institute_id_vendor_code_unique');
    await queryInterface.dropTable('amc_vendor');
  },
};
