'use strict';

/**
 * SAFETY GUARD:
 * Keep ENABLE_MIGRATION = false until you finalize all teacher permissions.
 * Set ENABLE_MIGRATION = true when you are ready to execute Part 2.
 */
const ENABLE_MIGRATION = false;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!ENABLE_MIGRATION) {
      console.log('----------------------------------------------------------------------');
      console.log('[SKIPPED] Migration Part 2 is currently DISABLED (ENABLE_MIGRATION = false).');
      console.log('Update ENABLE_MIGRATION = true in this file when ready to run.');
      console.log('----------------------------------------------------------------------');
      return;
    }

    const { PERMISSIONS } = await import('../const/permissions.js');
    const { SCOPES } = await import('../const/scopes.js');

    // ─────────────────────────────────────────────────────────────
    // 1. Rename existing legacy roles (code remains NULL)
    // ─────────────────────────────────────────────────────────────
    await queryInterface.sequelize.query(`
      UPDATE role 
      SET role = 'CLIENT_ADMIN_OLD' 
      WHERE UPPER(role) = 'CLIENT_ADMIN' AND code IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE role 
      SET role = 'TEACHER_OLD' 
      WHERE UPPER(role) = 'TEACHER' AND code IS NULL;
    `);

    // ─────────────────────────────────────────────────────────────
    // 2. Fetch all existing universities
    // ─────────────────────────────────────────────────────────────
    const [universities] = await queryInterface.sequelize.query(`
      SELECT university_id FROM university WHERE deleted_at IS NULL;
    `);

    // ─────────────────────────────────────────────────────────────
    // 3. Teacher Permissions Config with Scopes (OWN, CLASS, INSTITUTE)
    // Review and adjust permissions here as needed before running.
    // ─────────────────────────────────────────────────────────────
    const teacherPermissions = [
      // 1. University Level Access
      { perm: 'perm_access_inst', scope: SCOPES.UNIVERSITY, isUniScope: true },

      // 2. Academic & Teacher Routine (INSTITUTE scope)
      { perm: 'USER_CLASSES', scope: SCOPES.INSTITUTE },
      { perm: 'USER_ROUTINE', scope: SCOPES.INSTITUTE },
      { perm: 'USER_LECTURES', scope: SCOPES.INSTITUTE },
      { perm: 'USER_QUESTION_BANK', scope: SCOPES.INSTITUTE },
      { perm: 'USER_LESSON_PLAN_OVERVIEW', scope: SCOPES.INSTITUTE },
      { perm: 'USER_LESSON_PLAN_CREATION', scope: SCOPES.INSTITUTE },
      { perm: 'USER_QUESTION_PAPERS', scope: SCOPES.INSTITUTE },
      { perm: 'USER_ISSUED_BOOKS', scope: SCOPES.INSTITUTE },
      { perm: 'USER_INVIGILATION', scope: SCOPES.INSTITUTE },
      { perm: 'USER_EVALUATION', scope: SCOPES.INSTITUTE },

      // 3. Answer Sheet Mapping (INSTITUTE scope)
      { perm: 'ANSWER_SHEET_MAPPING', scope: SCOPES.INSTITUTE },

      // 4. Question Paper Builder (INSTITUTE scope)
      { perm: 'QUESTION_PAPER_BUILDER_SIDEBAR', scope: SCOPES.INSTITUTE },
      { perm: 'QUESTION_PAPER_BUILDER_ADD', scope: SCOPES.INSTITUTE },
      { perm: 'QUESTION_PAPER_BUILDER_DELETE', scope: SCOPES.INSTITUTE },
      { perm: 'QUESTION_PAPER_BUILDER_EDIT', scope: SCOPES.INSTITUTE },
      { perm: 'QUESTION_PAPER_BUILDER_APPROVE', scope: SCOPES.INSTITUTE },
    ];

    for (const uni of universities) {
      const uId = uni.university_id;

      // ─── Create New System Role: CLIENT_ADMIN ─────────────────
      let [adminRole] = await queryInterface.sequelize.query(`
        SELECT role_id FROM role WHERE university_id = ${uId} AND code = 'SYS_CLIENT_ADMIN' LIMIT 1;
      `);

      let adminRoleId;
      if (!adminRole || adminRole.length === 0) {
        await queryInterface.sequelize.query(`
          INSERT INTO role (role, code, university_id, created_at, updated_at)
          VALUES ('CLIENT_ADMIN', 'SYS_CLIENT_ADMIN', ${uId}, NOW(), NOW());
        `);
        const [insertedAdmin] = await queryInterface.sequelize.query(`
          SELECT role_id FROM role WHERE university_id = ${uId} AND code = 'SYS_CLIENT_ADMIN' LIMIT 1;
        `);
        adminRoleId = insertedAdmin[0].role_id;
      } else {
        adminRoleId = adminRole[0].role_id;
      }

      // Populate full permissions for CLIENT_ADMIN
      const adminPermRows = [];
      for (const [key, valueObj] of Object.entries(PERMISSIONS)) {
        if (!valueObj || !valueObj.value) continue;
        const isMaster =
          valueObj.value === PERMISSIONS.MASTER_SECTION?.value ||
          valueObj.parentPermission === 'MASTER_SECTION';
        const scope = isMaster ? SCOPES.UNIVERSITY : SCOPES.INSTITUTE;
        const resId = isMaster ? uId : 'NULL';
        adminPermRows.push(`(${adminRoleId}, '${valueObj.value}', '${scope}', ${resId}, NOW(), NOW())`);
      }

      if (adminPermRows.length > 0) {
        // Clear previous template if any and insert
        await queryInterface.sequelize.query(`DELETE FROM role_permissions WHERE role_id = ${adminRoleId};`);
        const chunkSize = 100;
        for (let i = 0; i < adminPermRows.length; i += chunkSize) {
          const chunk = adminPermRows.slice(i, i + chunkSize);
          await queryInterface.sequelize.query(`
            INSERT INTO role_permissions (role_id, permission, scope, resource_id, created_at, updated_at)
            VALUES ${chunk.join(', ')};
          `);
        }
      }

      // ─── Create New System Role: TEACHER ──────────────────────
      let [teacherRole] = await queryInterface.sequelize.query(`
        SELECT role_id FROM role WHERE university_id = ${uId} AND code = 'SYS_TEACHER' LIMIT 1;
      `);

      let teacherRoleId;
      if (!teacherRole || teacherRole.length === 0) {
        await queryInterface.sequelize.query(`
          INSERT INTO role (role, code, university_id, created_at, updated_at)
          VALUES ('TEACHER', 'SYS_TEACHER', ${uId}, NOW(), NOW());
        `);
        const [insertedTeacher] = await queryInterface.sequelize.query(`
          SELECT role_id FROM role WHERE university_id = ${uId} AND code = 'SYS_TEACHER' LIMIT 1;
        `);
        teacherRoleId = insertedTeacher[0].role_id;
      } else {
        teacherRoleId = teacherRole[0].role_id;
      }

      // Populate teacher permissions (17 permissions)
      const teacherPermRows = teacherPermissions.map(
        (p) => `(${teacherRoleId}, '${p.perm}', '${p.scope}', ${p.isUniScope ? uId : 'NULL'}, NOW(), NOW())`
      );

      if (teacherPermRows.length > 0) {
        await queryInterface.sequelize.query(`DELETE FROM role_permissions WHERE role_id = ${teacherRoleId};`);
        await queryInterface.sequelize.query(`
          INSERT INTO role_permissions (role_id, permission, scope, resource_id, created_at, updated_at)
          VALUES ${teacherPermRows.join(', ')};
        `);
      }
    }
  },

  async down(queryInterface) {
    if (!ENABLE_MIGRATION) return;
    await queryInterface.sequelize.query(`DELETE FROM role WHERE code IN ('SYS_CLIENT_ADMIN', 'SYS_TEACHER');`);
    await queryInterface.sequelize.query(`UPDATE role SET role = 'CLIENT_ADMIN' WHERE role = 'CLIENT_ADMIN_OLD';`);
    await queryInterface.sequelize.query(`UPDATE role SET role = 'TEACHER' WHERE role = 'TEACHER_OLD';`);
  }
};
