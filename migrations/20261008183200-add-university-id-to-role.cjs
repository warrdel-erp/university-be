'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add university_id to role table
    const tableDescription = await queryInterface.describeTable('role');
    if (!tableDescription.university_id) {
      await queryInterface.addColumn('role', 'university_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'university',
          key: 'university_id'
        }
      });
    }

    // 2. Derive university_id from role_permissions table
    // A role might have an INSTITUTE scope in role_permissions, which gives an institute_id. 
    // We can find the university_id from the institute table.
    // Or if it has UNIVERSITY scope, we can get it directly.
    const query = `
      UPDATE role r
      JOIN (
        SELECT rp.role_id, 
               MAX(COALESCE(u1.university_id, u2.university_id, u3.university_id)) as valid_university_id
        FROM role_permissions rp
        LEFT JOIN university u1 ON rp.scope = 'UNIVERSITY' AND u1.university_id = rp.resource_id
        LEFT JOIN institute i ON rp.scope = 'INSTITUTE' AND rp.resource_id = i.institute_id
        LEFT JOIN university u2 ON u2.university_id = i.university_id
        LEFT JOIN campus c ON rp.scope = 'CAMPUS' AND rp.resource_id = c.campus_id
        LEFT JOIN university u3 ON u3.university_id = c.university_id
        WHERE u1.university_id IS NOT NULL OR u2.university_id IS NOT NULL OR u3.university_id IS NOT NULL
        GROUP BY rp.role_id
      ) derived ON r.role_id = derived.role_id
      SET r.university_id = derived.valid_university_id
      WHERE r.university_id IS NULL;
    `;
    
    await queryInterface.sequelize.query(query);
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('role');
    if (tableDescription.university_id) {
      await queryInterface.removeColumn('role', 'university_id');
    }
  }
};
