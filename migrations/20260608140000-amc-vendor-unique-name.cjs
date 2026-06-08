'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex('amc_vendor');
    const hasNameIndex = indexes.some(
      (idx) => idx.name === 'amc_vendor_institute_id_vendor_name_unique'
    );

    if (!hasNameIndex) {
      await queryInterface.addIndex('amc_vendor', ['institute_id', 'vendor_name'], {
        unique: true,
        name: 'amc_vendor_institute_id_vendor_name_unique',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('amc_vendor');
    const hasNameIndex = indexes.some(
      (idx) => idx.name === 'amc_vendor_institute_id_vendor_name_unique'
    );

    if (hasNameIndex) {
      await queryInterface.removeIndex(
        'amc_vendor',
        'amc_vendor_institute_id_vendor_name_unique'
      );
    }
  },
};
