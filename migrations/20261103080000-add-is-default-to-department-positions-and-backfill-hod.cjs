'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Add is_default column to department_positions if not exists
      const tableInfo = await queryInterface.describeTable('department_positions');
      if (!tableInfo.is_default) {
        await queryInterface.addColumn(
          'department_positions',
          'is_default',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction }
        );
      }

      // 2. Fetch lowest existing user_id as safe fallback
      const [userRows] = await queryInterface.sequelize.query(
        'SELECT MIN(user_id) AS min_user_id FROM `users`;',
        { transaction }
      );
      const fallbackUserId = userRows?.[0]?.min_user_id || 1;

      // 3. Fetch all existing departments
      const [departments] = await queryInterface.sequelize.query(
        'SELECT department_id, department_name, university_id, institute_id, created_by, updated_by FROM `department`;',
        { transaction }
      );

      // 4. Backfill default HOD position for departments that don't have one
      for (const dept of departments) {
        const [existingPositions] = await queryInterface.sequelize.query(
          `SELECT department_position_id FROM \`department_positions\`
           WHERE department_id = :departmentId
             AND (position_code = 'HOD' OR position_name IN ('Head of Department', 'HOD') OR is_default = 1)
           LIMIT 1;`,
          {
            replacements: { departmentId: dept.department_id },
            transaction,
          }
        );

        if (existingPositions.length === 0) {
          const userId = dept.created_by || fallbackUserId;
          await queryInterface.sequelize.query(
            `INSERT INTO \`department_positions\` (
              department_id,
              position_name,
              position_code,
              employment_category,
              reporting_type,
              is_level_head,
              sort_order,
              level,
              is_default,
              university_id,
              institute_id,
              created_by,
              updated_by,
              created_at,
              updated_at
            ) VALUES (
              :departmentId,
              'Head of Department',
              'HOD',
              'Leadership',
              'Direct',
              1,
              1,
              1,
              1,
              :universityId,
              :instituteId,
              :userId,
              :userId,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            );`,
            {
              replacements: {
                departmentId: dept.department_id,
                universityId: dept.university_id,
                instituteId: dept.institute_id,
                userId,
              },
              transaction,
            }
          );
        } else {
          // Mark existing HOD position as default if not already
          await queryInterface.sequelize.query(
            `UPDATE \`department_positions\`
             SET is_default = 1
             WHERE department_position_id = :posId;`,
            {
              replacements: { posId: existingPositions[0].department_position_id },
              transaction,
            }
          );
        }
      }

      await transaction.commit();
      console.log('Successfully added is_default and backfilled default HOD positions for all departments.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Delete user assignments on default HOD positions (if any)
      await queryInterface.sequelize.query(
        `DELETE udp FROM \`user_department_positions\` udp
         INNER JOIN \`department_positions\` dp ON udp.department_position_id = dp.department_position_id
         WHERE dp.is_default = 1 AND dp.position_code = 'HOD';`,
        { transaction }
      );

      // 2. Remove backfilled default positions
      await queryInterface.sequelize.query(
        "DELETE FROM `department_positions` WHERE is_default = 1 AND position_code = 'HOD';",
        { transaction }
      );

      // 3. Remove column is_default
      const tableInfo = await queryInterface.describeTable('department_positions');
      if (tableInfo.is_default) {
        await queryInterface.removeColumn('department_positions', 'is_default', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
