'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Rename policy_code for soft-deleted policies to avoid unique collision in MySQL
      await queryInterface.sequelize.query(`
        UPDATE attendance_policies
        SET policy_code = CONCAT(policy_code, '_deleted_', policy_id)
        WHERE deleted_at IS NOT NULL 
          AND policy_code IS NOT NULL 
          AND policy_code NOT LIKE '%_deleted_%';
      `, { transaction: t });

      // 2. Handle any active duplicate policy codes (keep the earliest, append _dup_<id> to later ones)
      const [duplicateGroups] = await queryInterface.sequelize.query(`
        SELECT university_id, institute_id, policy_code, COUNT(*) as count
        FROM attendance_policies
        WHERE deleted_at IS NULL AND policy_code IS NOT NULL AND TRIM(policy_code) != ''
        GROUP BY university_id, institute_id, policy_code
        HAVING count > 1;
      `, { transaction: t });

      for (const group of duplicateGroups) {
        const [rows] = await queryInterface.sequelize.query(`
          SELECT policy_id
          FROM attendance_policies
          WHERE university_id = :univId
            AND institute_id = :instId
            AND policy_code = :pCode
            AND deleted_at IS NULL
          ORDER BY created_at ASC, policy_id ASC;
        `, {
          replacements: {
            univId: group.university_id,
            instId: group.institute_id,
            pCode: group.policy_code,
          },
          transaction: t,
        });

        // Leave rows[0] alone, update subsequent rows
        for (let i = 1; i < rows.length; i++) {
          await queryInterface.sequelize.query(`
            UPDATE attendance_policies
            SET policy_code = CONCAT(policy_code, '_dup_', :policyId)
            WHERE policy_id = :policyId;
          `, {
            replacements: { policyId: rows[i].policy_id },
            transaction: t,
          });
        }
      }

      // 3. Add unique constraint / index
      const rawIndexes = await queryInterface.showIndex('attendance_policies', { transaction: t });
      const indexNames = rawIndexes.map((idx) => idx.name);

      if (!indexNames.includes('unique_attendance_policy_code_univ_inst')) {
        await queryInterface.addIndex(
          'attendance_policies',
          ['university_id', 'institute_id', 'policy_code'],
          {
            name: 'unique_attendance_policy_code_univ_inst',
            unique: true,
            transaction: t,
          }
        );
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawIndexes = await queryInterface.showIndex('attendance_policies', { transaction: t });
      const indexNames = rawIndexes.map((idx) => idx.name);

      if (indexNames.includes('unique_attendance_policy_code_univ_inst')) {
        await queryInterface.removeIndex(
          'attendance_policies',
          'unique_attendance_policy_code_univ_inst',
          { transaction: t }
        );
      }
    });
  },
};
