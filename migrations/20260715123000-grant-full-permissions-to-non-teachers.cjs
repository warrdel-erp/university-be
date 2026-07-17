'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { PERMISSIONS } = await import('../const/permissions.js');
    const { SCOPES } = await import('../const/scopes.js');

    // 1. Get all non-teacher users with a default institute
    const users = await queryInterface.sequelize.query(
      `SELECT user_id, university_id, default_institute_id, default_role_id 
       FROM users 
       WHERE is_teacher = false AND deleted_at IS NULL AND default_institute_id IS NOT NULL`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const user of users) {
      let roleId = user.default_role_id;
      
      // If no default_role_id, find or create CLIENT_ADMIN role for their institute
      if (!roleId) {
        let roles = await queryInterface.sequelize.query(
          `SELECT role_id FROM role WHERE role = 'CLIENT_ADMIN' AND institute_id = ? LIMIT 1`,
          { replacements: [user.default_institute_id], type: Sequelize.QueryTypes.SELECT }
        );

        if (roles.length > 0) {
          roleId = roles[0].role_id;
        } else {
          await queryInterface.sequelize.query(
            `INSERT INTO role (role, institute_id, is_default, created_at, updated_at) 
             VALUES ('CLIENT_ADMIN', ?, true, NOW(), NOW())`,
            { replacements: [user.default_institute_id] }
          );
          
          roles = await queryInterface.sequelize.query(
            `SELECT role_id FROM role WHERE role = 'CLIENT_ADMIN' AND institute_id = ? ORDER BY role_id DESC LIMIT 1`,
            { replacements: [user.default_institute_id], type: Sequelize.QueryTypes.SELECT }
          );
          roleId = roles[0].role_id;
        }

        // Update user's default_role_id
        await queryInterface.sequelize.query(
          `UPDATE users SET default_role_id = ? WHERE user_id = ?`,
          { replacements: [roleId, user.user_id] }
        );
      }

      // user_roles table does not exist, role assignment is managed via user_role_permission_scope

      // Remove existing permissions for this user and role to avoid duplicates
      await queryInterface.sequelize.query(
        `DELETE FROM user_role_permission_scope WHERE user_id = ? AND role_id = ?`,
        { replacements: [user.user_id, roleId] }
      );

      // Prepare permission rows
      const permissionRows = [];
      for (const [key, valueObj] of Object.entries(PERMISSIONS)) {
        const isMasterSection = valueObj.value === PERMISSIONS.MASTER_SECTION.value || valueObj.parentPermission === 'MASTER_SECTION';
        
        const permScope = isMasterSection ? SCOPES.UNIVERSITY : SCOPES.INSTITUTE;
        // Fallback to 0 or null if IDs are missing, though they shouldn't be
        const resourceId = isMasterSection ? (user.university_id || 0) : (user.default_institute_id || 0);
        
        let finalScope = permScope;
        let finalResourceId = resourceId;
        
        if (valueObj.value === PERMISSIONS.ACCESS_INSTITUTE.value) {
          finalScope = SCOPES.UNIVERSITY;
          finalResourceId = user.university_id || 0;
        }

        permissionRows.push(`(${roleId}, ${user.user_id}, '${valueObj.value}', '${finalScope}', ${finalResourceId}, NOW(), NOW())`);
      }

      // Insert all permissions at once
      if (permissionRows.length > 0) {
        // Chunk inserts to avoid query size limits (just in case)
        const chunkSize = 100;
        for (let i = 0; i < permissionRows.length; i += chunkSize) {
          const chunk = permissionRows.slice(i, i + chunkSize);
          await queryInterface.sequelize.query(`
            INSERT INTO user_role_permission_scope 
            (role_id, user_id, permission, scope, resource_id, created_at, updated_at) 
            VALUES ${chunk.join(', ')}
          `);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverting this complex logic completely is hard without a snapshot, 
    // but we can just provide a no-op down or remove all permissions for non-teachers
  }
};
