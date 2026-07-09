'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Find user
    const [users] = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE email = 'aadi28x6@gmail.com' LIMIT 1;`
    );
    if (!users || users.length === 0) {
      console.log('User aadi28x6@gmail.com not found. Skipping seeding.');
      return;
    }
    const userId = users[0].user_id;

    // 2. Find admin role
    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id FROM role WHERE role = 'Admin' OR role = 'Super Admin' LIMIT 1;`
    );
    let roleId = null;
    if (roles && roles.length > 0) {
      roleId = roles[0].role_id;
      // Assign default role to user
      await queryInterface.sequelize.query(
        `UPDATE users SET default_role_id = ${roleId} WHERE user_id = ${userId};`
      );
    }

    // 3. Clear existing user role permissions scope
    await queryInterface.sequelize.query(
      `DELETE FROM user_role_permission_scope WHERE user_id = ${userId};`
    );

    // 4. Read all permissions from const/permissions.js
    // Let's use dynamic import since this is a .cjs file and permissions.js might be an ES module.
    const path = require('path');
    let permissionsObj = {};
    try {
      const { PERMISSIONS } = await import('../const/permissions.js');
      permissionsObj = PERMISSIONS;
    } catch (e) {
      console.log('Failed to import permissions:', e);
      return;
    }

    const permissionKeys = Object.values(permissionsObj).map(p => p.value);
    
    // Insert all permissions for the user
    const insertData = permissionKeys.map(perm => ({
      user_id: userId,
      role_id: roleId,
      permission: perm,
      scope: 'INSTITUTE',
      resource_id: null,
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Clear existing for this user
    await queryInterface.sequelize.query(
      `DELETE FROM user_role_permission_scope WHERE user_id = ${userId};`
    );

    await queryInterface.bulkInsert('user_role_permission_scope', insertData);
  },

  async down (queryInterface, Sequelize) {
    const [users] = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE email = 'aadi28x6@gmail.com' LIMIT 1;`
    );
    if (users && users.length > 0) {
      await queryInterface.sequelize.query(
        `DELETE FROM user_role_permission_scope WHERE user_id = ${users[0].user_id};`
      );
    }
  }
};
