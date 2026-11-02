'use strict';

const ROLE = 'role';
const RP = 'role_permissions';
const URPS = 'user_role_permission_scope';
const SCOPE_ENUM = ['MY', 'DEPARTMENT', 'INSTITUTE', 'CAMPUS', 'UNIVERSITY'];

/**
 * - role gets a single `scope`
 * - role_permissions keeps only (role, permission); scope/resource_id are dropped
 * - the resource (institute/campus/...) moves to the user's role assignment
 *   (user_role_permission_scope.resource_id, one row per user + role + resource)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. role.scope  (widest scope the role currently grants, default INSTITUTE)
    const roleCols = await queryInterface.describeTable(ROLE);
    if (!roleCols.scope) {
      await queryInterface.addColumn(ROLE, 'scope', {
        type: Sequelize.ENUM(...SCOPE_ENUM),
        allowNull: false,
        defaultValue: 'INSTITUTE',
      });
    }
    const rpCols = await queryInterface.describeTable(RP);
    if (rpCols.scope) {
      await queryInterface.sequelize.query(`
        UPDATE ${ ROLE } r
        SET r.scope = COALESCE((
      SELECT CASE rp.scope
            WHEN 'OWN' THEN 'MY'
            WHEN 'CLASS' THEN 'DEPARTMENT'
            ELSE rp.scope
          END
          FROM ${RP} rp
          WHERE rp.role_id = r.role_id AND rp.permission <> 'perm_access_inst'
          ORDER BY FIELD(
            CASE rp.scope
              WHEN 'OWN' THEN 'MY'
              WHEN 'CLASS' THEN 'DEPARTMENT'
              ELSE rp.scope
            END,
            'MY','DEPARTMENT','INSTITUTE','CAMPUS','UNIVERSITY'
          ) DESC
          LIMIT 1
        ), 'INSTITUTE');
      `);
  }

    // Ensure default system roles have their designated scopes and codes:
    // Admin -> UNIVERSITY (SYS_CLIENT_ADMIN), Teacher -> MY (SYS_TEACHER), Student -> SYS_STUDENT.
    // Separate scope updates from code updates and assign `code` to at most one row per
    // university_id so `unique_university_role_code (university_id, code)` is never violated.
    await queryInterface.sequelize.query(`
      UPDATE ${ROLE}
      SET scope = 'UNIVERSITY'
      WHERE code = 'SYS_CLIENT_ADMIN' OR UPPER(TRIM(role)) IN ('ADMIN', 'CLIENT_ADMIN', 'CLIENT ADMIN');
    `);
  await queryInterface.sequelize.query(`
      UPDATE ${ROLE}
      SET scope = 'MY'
      WHERE code = 'SYS_TEACHER' OR UPPER(TRIM(role)) IN ('TEACHER');
    `);

  const assignSystemCode = async (targetCode, roleNames) => {
    const quotedNames = roleNames.map((n) => `'${n}'`).join(', ');
    await queryInterface.sequelize.query(`
        UPDATE ${ROLE}
        SET code = '${targetCode}'
        WHERE university_id IS NULL
          AND code IS NULL
          AND UPPER(TRIM(role)) IN (${quotedNames});
      `);
    await queryInterface.sequelize.query(`
        UPDATE ${ROLE} r
        INNER JOIN (
          SELECT MIN(role_id) AS keep_role_id
          FROM ${ROLE}
          WHERE university_id IS NOT NULL
            AND code IS NULL
            AND UPPER(TRIM(role)) IN (${quotedNames})
            AND university_id NOT IN (
              SELECT university_id FROM (
                SELECT university_id
                FROM ${ROLE}
                WHERE code = '${targetCode}' AND university_id IS NOT NULL
              ) existing
            )
          GROUP BY university_id
        ) pick ON r.role_id = pick.keep_role_id
        SET r.code = '${targetCode}';
      `);
  };

  await assignSystemCode('SYS_CLIENT_ADMIN', ['CLIENT_ADMIN', 'CLIENT ADMIN']);
  await assignSystemCode('SYS_CLIENT_ADMIN', ['ADMIN']);
  await assignSystemCode('SYS_TEACHER', ['TEACHER']);
  await assignSystemCode('SYS_STUDENT', ['STUDENT']);

  // 2. user_role_permission_scope.resource_id
  const urpsCols = await queryInterface.describeTable(URPS);
  if(!urpsCols.resource_id) {
  await queryInterface.addColumn(URPS, 'resource_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
  });
}

// 3. Replace the old (user, role) unique index, if the previous migration created it
const indexes = await queryInterface.showIndex(URPS);
if (indexes.some((i) => i.name === 'uq_urps_user_role')) {
  await queryInterface.removeIndex(URPS, 'uq_urps_user_role');
}

// 4. Backfill: non-UNIVERSITY roles get one row per resource the role used to be bound to
if (rpCols.scope && rpCols.resource_id) {
  await queryInterface.sequelize.query(`
        INSERT IGNORE INTO ${URPS} (role_id, user_id, university_id, resource_id)
        SELECT u.role_id, u.user_id, u.university_id, x.resource_id
        FROM ${URPS} u
        INNER JOIN ${ROLE} r ON r.role_id = u.role_id
        INNER JOIN (
          SELECT DISTINCT role_id, scope, resource_id
          FROM ${RP}
          WHERE resource_id IS NOT NULL AND permission <> 'perm_access_inst'
        ) x ON x.role_id = u.role_id AND x.scope = r.scope
        WHERE r.scope <> 'UNIVERSITY' AND u.resource_id IS NULL;
      `);
  await queryInterface.sequelize.query(`
        DELETE u FROM ${URPS} u
        INNER JOIN (
          SELECT DISTINCT user_id, role_id FROM ${URPS} WHERE resource_id IS NOT NULL
        ) d ON d.user_id = u.user_id AND d.role_id = u.role_id
        WHERE u.resource_id IS NULL;
      `);
}

// Deduplicate any duplicates before adding unique index
await queryInterface.sequelize.query(`
      DELETE t FROM ${URPS} t
      INNER JOIN (
        SELECT user_id, role_id, resource_id, MIN(user_role_permission_id) AS keep_id
        FROM ${URPS}
        GROUP BY user_id, role_id, resource_id
      ) k ON k.user_id = t.user_id AND k.role_id = t.role_id AND (k.resource_id = t.resource_id OR (k.resource_id IS NULL AND t.resource_id IS NULL))
      WHERE t.user_role_permission_id <> k.keep_id;
    `);

const postUrpsIndexes = await queryInterface.showIndex(URPS);
if (!postUrpsIndexes.some((i) => i.name === 'uq_urps_user_role_resource')) {
  await queryInterface.addIndex(URPS, ['user_id', 'role_id', 'resource_id'], {
    unique: true,
    name: 'uq_urps_user_role_resource',
  });
}

// 5. role_permissions -> (role, permission) only
await queryInterface.sequelize.query(`DELETE FROM ${RP} WHERE permission = 'perm_access_inst';`);
await queryInterface.sequelize.query(`
      DELETE t FROM ${RP} t
      INNER JOIN (
        SELECT role_id, permission, MIN(id) AS keep_id FROM ${RP} GROUP BY role_id, permission
      ) k ON k.role_id = t.role_id AND k.permission = t.permission
      WHERE t.id <> k.keep_id;
    `);
for (const col of ['scope', 'resource_id']) {
  if (rpCols[col]) await queryInterface.removeColumn(RP, col);
}
const rpIndexes = await queryInterface.showIndex(RP);
if (!rpIndexes.some((i) => i.name === 'uq_role_permissions_role_permission')) {
  await queryInterface.addIndex(RP, ['role_id', 'permission'], {
    unique: true,
    name: 'uq_role_permissions_role_permission',
  });
}
  },

  async down(queryInterface, Sequelize) {
  await queryInterface.removeIndex(RP, 'uq_role_permissions_role_permission');
  await queryInterface.addColumn(RP, 'scope', {
    type: Sequelize.ENUM(...SCOPE_ENUM),
    allowNull: false,
    defaultValue: 'INSTITUTE',
  });
  await queryInterface.addColumn(RP, 'resource_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
  });
  await queryInterface.sequelize.query(`
      UPDATE ${RP} rp INNER JOIN ${ROLE} r ON r.role_id = rp.role_id SET rp.scope = r.scope;
    `);

  await queryInterface.removeIndex(URPS, 'uq_urps_user_role_resource');
  await queryInterface.sequelize.query(`
      DELETE u FROM ${URPS} u
      INNER JOIN (
        SELECT user_id, role_id, MIN(user_role_permission_id) AS keep_id FROM ${URPS} GROUP BY user_id, role_id
      ) k ON k.user_id = u.user_id AND k.role_id = u.role_id
      WHERE u.user_role_permission_id <> k.keep_id;
    `);
  await queryInterface.removeColumn(URPS, 'resource_id');
  await queryInterface.addIndex(URPS, ['user_id', 'role_id'], {
    unique: true,
    name: 'uq_urps_user_role',
  });

  await queryInterface.removeColumn(ROLE, 'scope');
},
};
