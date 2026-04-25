'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const [userRows] = await queryInterface.sequelize.query(
      "SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1;"
    );
    const createdBy = userRows?.[0]?.user_id;
    if (!createdBy) return;

    const [masterRows] = await queryInterface.sequelize.query(
      "SELECT employee_code_master_id FROM employee_code_master WHERE LOWER(REPLACE(code_master_type, ' ', '')) = 'proficiencylevel' AND deleted_at IS NULL LIMIT 1;"
    );

    let masterId = masterRows?.[0]?.employee_code_master_id;

    if (!masterId) {
      const [insertMasterMeta] = await queryInterface.bulkInsert(
        'employee_code_master',
        [{
          code_master_type: 'ProficiencyLevel',
          created_at: now,
          updated_at: now,
          deleted_at: null
        }],
        {}
      );

      masterId = insertMasterMeta || null;

      if (!masterId) {
        const [newMasterRows] = await queryInterface.sequelize.query(
          "SELECT employee_code_master_id FROM employee_code_master WHERE LOWER(REPLACE(code_master_type, ' ', '')) = 'proficiencylevel' AND deleted_at IS NULL ORDER BY employee_code_master_id DESC LIMIT 1;"
        );
        masterId = newMasterRows?.[0]?.employee_code_master_id;
      }
    }

    if (!masterId) return;

    const [existingTypeRows] = await queryInterface.sequelize.query(
      `SELECT code FROM employee_code_master_type WHERE employee_code_master_id = ${masterId} AND deleted_at IS NULL;`
    );
    const existingCodes = new Set((existingTypeRows || []).map((r) => String(r.code).toLowerCase()));

    const seedTypes = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
      .filter((code) => !existingCodes.has(code.toLowerCase()))
      .map((code) => ({
        employee_code_master_id: masterId,
        code,
        description: code,
        created_by: createdBy,
        created_at: now,
        updated_at: now,
        deleted_at: null
      }));

    if (seedTypes.length > 0) {
      await queryInterface.bulkInsert('employee_code_master_type', seedTypes, {});
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('employee_code_master_type', {
      code: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    }, {});
  }
};
