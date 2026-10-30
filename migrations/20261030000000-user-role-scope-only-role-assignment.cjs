'use strict';

const TABLE = 'user_role_permission_scope';

/**
 * Users no longer hold permissions directly. This table becomes a plain
 * user -> role assignment; permissions are resolved from `role_permissions`.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Drop rows with no role (old standalone perm_access_inst rows)
    await queryInterface.sequelize.query(`DELETE FROM ${TABLE} WHERE role_id IS NULL;`);

    // 2. Keep a single row per (user, role)
    await queryInterface.sequelize.query(`
      DELETE t FROM ${TABLE} t
      INNER JOIN (
        SELECT user_id, role_id, MIN(user_role_permission_id) AS keep_id
        FROM ${TABLE}
        GROUP BY user_id, role_id
      ) k ON k.user_id = t.user_id AND k.role_id = t.role_id
      WHERE t.user_role_permission_id <> k.keep_id;
    `);

    // 3. Drop the per-user permission columns
    const columns = await queryInterface.describeTable(TABLE);
    for (const col of ['permission', 'scope', 'resource_id']) {
      if (columns[col]) await queryInterface.removeColumn(TABLE, col);
    }

    // 4. role_id is now mandatory
    await queryInterface.changeColumn(TABLE, 'role_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // 5. A user can hold a role only once
    await queryInterface.addIndex(TABLE, ['user_id', 'role_id'], {
      unique: true,
      name: 'uq_urps_user_role',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(TABLE, 'uq_urps_user_role');

    await queryInterface.changeColumn(TABLE, 'role_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn(TABLE, 'permission', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn(TABLE, 'scope', {
      type: Sequelize.ENUM('OWN', 'CLASS', 'DEPARTMENT', 'INSTITUTE', 'CAMPUS', 'UNIVERSITY'),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn(TABLE, 'resource_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Re-expand each assignment into per-user rows copied from role_permissions
    await queryInterface.sequelize.query(`
      INSERT INTO ${TABLE} (role_id, user_id, permission, scope, resource_id, university_id)
      SELECT u.role_id, u.user_id, rp.permission, rp.scope, rp.resource_id, u.university_id
      FROM ${TABLE} u
      INNER JOIN role_permissions rp ON rp.role_id = u.role_id
      WHERE u.permission IS NULL;
    `);
    await queryInterface.sequelize.query(`DELETE FROM ${TABLE} WHERE permission IS NULL;`);
  },
};
