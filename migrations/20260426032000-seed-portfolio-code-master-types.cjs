'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [userRows] = await queryInterface.sequelize.query(
      "SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1;"
    );
    const createdBy = userRows?.[0]?.user_id;
    if (!createdBy) return;

    const ensureMaster = async (name) => {
      const normalized = String(name).replace(/\s+/g, '').toLowerCase();
      const [masterRows] = await queryInterface.sequelize.query(
        `SELECT employee_code_master_id FROM employee_code_master WHERE LOWER(REPLACE(code_master_type, ' ', '')) = '${normalized}' AND deleted_at IS NULL LIMIT 1;`
      );
      let masterId = masterRows?.[0]?.employee_code_master_id;
      if (!masterId) {
        await queryInterface.bulkInsert('employee_code_master', [{
          code_master_type: name,
          created_at: now,
          updated_at: now,
          deleted_at: null
        }], {});
        const [newMasterRows] = await queryInterface.sequelize.query(
          `SELECT employee_code_master_id FROM employee_code_master WHERE LOWER(REPLACE(code_master_type, ' ', '')) = '${normalized}' AND deleted_at IS NULL ORDER BY employee_code_master_id DESC LIMIT 1;`
        );
        masterId = newMasterRows?.[0]?.employee_code_master_id;
      }
      return masterId;
    };

    const seedTypes = async (masterName, codes) => {
      const masterId = await ensureMaster(masterName);
      if (!masterId) return;

      const [existingTypeRows] = await queryInterface.sequelize.query(
        `SELECT code FROM employee_code_master_type WHERE employee_code_master_id = ${masterId} AND deleted_at IS NULL;`
      );
      const existingCodes = new Set((existingTypeRows || []).map((r) => String(r.code).toLowerCase()));

      const rows = codes
        .filter((code) => !existingCodes.has(String(code).toLowerCase()))
        .map((code) => ({
          employee_code_master_id: masterId,
          code,
          description: code,
          created_by: createdBy,
          created_at: now,
          updated_at: now,
          deleted_at: null
        }));

      if (rows.length > 0) {
        await queryInterface.bulkInsert('employee_code_master_type', rows, {});
      }
    };

    await seedTypes('Document', [
      'Aadhaar Card',
      'PAN Card',
      'Passport',
      'Voter ID',
      'Driving License',
      'Marksheet',
      'Degree Certificate'
    ]);
    await seedTypes('AchievementCategory', [
      'Academic',
      'Research',
      'Sports',
      'Cultural',
      'Administrative',
      'Other'
    ]);
    await seedTypes('LeaveType', [
      'Medical Leave',
      'Maternity Leave',
      'Paternity Leave',
      'Sabbatical',
      'Personal Leave'
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('employee_code_master_type', {
      code: [
        'Aadhaar Card',
        'PAN Card',
        'Passport',
        'Voter ID',
        'Driving License',
        'Marksheet',
        'Degree Certificate',
        'Academic',
        'Research',
        'Sports',
        'Cultural',
        'Administrative',
        'Other',
        'Medical Leave',
        'Maternity Leave',
        'Paternity Leave',
        'Sabbatical',
        'Personal Leave'
      ]
    }, {});
  }
};
