'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE ect FROM employee_code_master_type ect
      INNER JOIN employee_code_master_type keeper
        ON keeper.employee_code_master_id = ect.employee_code_master_id
       AND keeper.university_id = ect.university_id
       AND keeper.institute_id = ect.institute_id
       AND keeper.code = ect.code
       AND keeper.employee_code_master_type_id < ect.employee_code_master_type_id
    `);

    const indexes = await queryInterface.showIndex('employee_code_master_type');
    const codeIndex = indexes.find(
      (idx) =>
        idx.unique &&
        idx.fields?.length === 1 &&
        idx.fields[0]?.attribute === 'code',
    );
    if (codeIndex) {
      await queryInterface.removeIndex('employee_code_master_type', codeIndex.name);
    }

    const hasTenantIndex = indexes.some(
      (idx) => idx.name === 'unique_code_master_type_per_tenant_category',
    );
    if (!hasTenantIndex) {
      await queryInterface.addIndex(
        'employee_code_master_type',
        ['employee_code_master_id', 'university_id', 'institute_id', 'code'],
        {
          unique: true,
          name: 'unique_code_master_type_per_tenant_category',
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'employee_code_master_type',
      'unique_code_master_type_per_tenant_category',
    );

    const indexes = await queryInterface.showIndex('employee_code_master_type');
    const hasCodeIndex = indexes.some(
      (idx) =>
        idx.unique &&
        idx.fields?.length === 1 &&
        idx.fields[0]?.attribute === 'code',
    );
    if (!hasCodeIndex) {
      await queryInterface.addIndex('employee_code_master_type', ['code'], {
        unique: true,
        name: 'code',
      });
    }
  },
};
