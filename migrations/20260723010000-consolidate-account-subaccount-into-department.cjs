'use strict';

/**
 * Consolidate account + sub_account into department.
 * Idempotent — safe to resume after MySQL DDL implicit-commit partial runs.
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) =>
    typeof t === 'string' ? t : t.tableName || t.name || String(t),
  );
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function columnExists(queryInterface, tableName, columnName) {
  if (!(await tableExists(queryInterface, tableName))) {
    return false;
  }
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

async function dropFksOnColumn(queryInterface, tableName, columnName) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME = :columnName
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { tableName, columnName } },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
    );
  }
}

async function addFkIfMissing(queryInterface, tableName, columnName, constraintName) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND CONSTRAINT_NAME = :constraintName
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `,
    { replacements: { tableName, constraintName } },
  );
  if (rows.length) {
    return;
  }
  await queryInterface.sequelize.query(
    `
    ALTER TABLE \`${tableName}\`
    ADD CONSTRAINT \`${constraintName}\`
    FOREIGN KEY (${columnName}) REFERENCES department (department_id)
    ON UPDATE CASCADE ON DELETE SET NULL
    `,
  );
}

async function defaultUserId(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT MIN(user_id) AS userId FROM users`,
  );
  return Number(rows[0]?.userId) || 1;
}

async function remapSubAccountColumn(queryInterface, Sequelize, tableName) {
  if (!(await tableExists(queryInterface, tableName))) {
    return;
  }
  if (!(await columnExists(queryInterface, tableName, 'sub_account_id'))) {
    if (await columnExists(queryInterface, tableName, 'department_id')) {
      await addFkIfMissing(
        queryInterface,
        tableName,
        'department_id',
        `fk_${tableName}_department_id`,
      );
    }
    return;
  }

  await dropFksOnColumn(queryInterface, tableName, 'sub_account_id');

  if (!(await columnExists(queryInterface, tableName, 'department_id'))) {
    await queryInterface.addColumn(tableName, 'department_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  }

  if (await tableExists(queryInterface, '_map_sub_account_to_dept')) {
    await queryInterface.sequelize.query(
      `
      UPDATE \`${tableName}\` t
      LEFT JOIN _map_sub_account_to_dept m ON m.sub_account_id = t.sub_account_id
      SET t.department_id = m.department_id
      WHERE t.department_id IS NULL
      `,
    );
  }

  await queryInterface.removeColumn(tableName, 'sub_account_id');
  await addFkIfMissing(queryInterface, tableName, 'department_id', `fk_${tableName}_department_id`);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'department'))) {
      throw new Error('department table is required');
    }

    const hasAccount = await tableExists(queryInterface, 'account');
    const hasSubAccount = await tableExists(queryInterface, 'sub_account');

    if (!(await columnExists(queryInterface, 'department', 'alternate_name'))) {
      await queryInterface.addColumn('department', 'alternate_name', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!(await columnExists(queryInterface, 'department', 'department_code'))) {
      await queryInterface.addColumn('department', 'department_code', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!(await columnExists(queryInterface, 'department', 'description'))) {
      await queryInterface.addColumn('department', 'description', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!(await columnExists(queryInterface, 'department', 'parent_department_id'))) {
      await queryInterface.addColumn('department', 'parent_department_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (await columnExists(queryInterface, 'department', 'sub_account_id')) {
      await dropFksOnColumn(queryInterface, 'department', 'sub_account_id');
      await queryInterface.changeColumn('department', 'sub_account_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!(await tableExists(queryInterface, '_map_account_to_dept'))) {
      await queryInterface.sequelize.query(`
        CREATE TABLE _map_account_to_dept (
          account_id INT NOT NULL,
          university_id INT NOT NULL,
          institute_id INT NOT NULL,
          department_id INT NOT NULL,
          PRIMARY KEY (account_id, university_id, institute_id)
        )
      `);
    }
    if (!(await tableExists(queryInterface, '_map_sub_account_to_dept'))) {
      await queryInterface.sequelize.query(`
        CREATE TABLE _map_sub_account_to_dept (
          sub_account_id INT NOT NULL PRIMARY KEY,
          department_id INT NOT NULL
        )
      `);
    }

    const [[mapCount]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM _map_sub_account_to_dept`,
    );
    const mapsPopulated = Number(mapCount.cnt) > 0;
    const userId = await defaultUserId(queryInterface);

    if (hasAccount && hasSubAccount && !mapsPopulated) {
      const [accountGroups] = await queryInterface.sequelize.query(`
        SELECT DISTINCT
          sa.account_id AS accountId,
          sa.university_id AS universityId,
          sa.institute_id AS instituteId,
          a.account_name AS accountName
        FROM sub_account sa
        INNER JOIN account a ON a.account_id = sa.account_id
        WHERE sa.deleted_at IS NULL
      `);

      for (const group of accountGroups) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO department (
            department_name, alternate_name, department_code, description,
            department_order, parent_department_id, university_id, institute_id,
            created_by, updated_by, created_at, updated_at
          ) VALUES (
            :departmentName, NULL, NULL, NULL,
            0, NULL, :universityId, :instituteId,
            :userId, :userId, NOW(), NOW()
          )
          `,
          {
            replacements: {
              departmentName: group.accountName,
              universityId: group.universityId,
              instituteId: group.instituteId,
              userId,
            },
          },
        );
        const [[{ id }]] = await queryInterface.sequelize.query(
          `SELECT LAST_INSERT_ID() AS id`,
        );
        await queryInterface.sequelize.query(
          `
          INSERT INTO _map_account_to_dept (account_id, university_id, institute_id, department_id)
          VALUES (:accountId, :universityId, :instituteId, :departmentId)
          `,
          {
            replacements: {
              accountId: group.accountId,
              universityId: group.universityId,
              instituteId: group.instituteId,
              departmentId: id,
            },
          },
        );
      }

      const [subAccounts] = await queryInterface.sequelize.query(`
        SELECT
          sa.sub_account_id AS subAccountId,
          sa.account_id AS accountId,
          sa.university_id AS universityId,
          sa.institute_id AS instituteId,
          sa.department_name AS departmentName,
          sa.alternate_name AS alternateName,
          sa.department_code AS departmentCode,
          sa.description AS description,
          sa.created_by AS createdBy,
          sa.updated_by AS updatedBy,
          sa.created_at AS createdAt,
          sa.updated_at AS updatedAt,
          sa.deleted_at AS deletedAt
        FROM sub_account sa
      `);

      for (const sa of subAccounts) {
        const [[parent]] = await queryInterface.sequelize.query(
          `
          SELECT department_id AS departmentId
          FROM _map_account_to_dept
          WHERE account_id = :accountId
            AND university_id = :universityId
            AND institute_id = :instituteId
          LIMIT 1
          `,
          {
            replacements: {
              accountId: sa.accountId,
              universityId: sa.universityId,
              instituteId: sa.instituteId,
            },
          },
        );

        await queryInterface.sequelize.query(
          `
          INSERT INTO department (
            department_name, alternate_name, department_code, description,
            department_order, parent_department_id, university_id, institute_id,
            created_by, updated_by, created_at, updated_at, deleted_at
          ) VALUES (
            :departmentName, :alternateName, :departmentCode, :description,
            0, :parentDepartmentId, :universityId, :instituteId,
            :createdBy, :updatedBy, :createdAt, :updatedAt, :deletedAt
          )
          `,
          {
            replacements: {
              departmentName: sa.departmentName,
              alternateName: sa.alternateName,
              departmentCode: sa.departmentCode,
              description: sa.description,
              parentDepartmentId: parent?.departmentId ?? null,
              universityId: sa.universityId,
              instituteId: sa.instituteId,
              createdBy: sa.createdBy || userId,
              updatedBy: sa.updatedBy || userId,
              createdAt: sa.createdAt || new Date(),
              updatedAt: sa.updatedAt || new Date(),
              deletedAt: sa.deletedAt,
            },
          },
        );
        const [[{ id }]] = await queryInterface.sequelize.query(
          `SELECT LAST_INSERT_ID() AS id`,
        );
        await queryInterface.sequelize.query(
          `
          INSERT INTO _map_sub_account_to_dept (sub_account_id, department_id)
          VALUES (:subAccountId, :departmentId)
          `,
          {
            replacements: { subAccountId: sa.subAccountId, departmentId: id },
          },
        );
      }
    }

    if (
      (await columnExists(queryInterface, 'department', 'sub_account_id')) &&
      (await tableExists(queryInterface, '_map_sub_account_to_dept'))
    ) {
      await queryInterface.sequelize.query(`
        UPDATE department d
        INNER JOIN _map_sub_account_to_dept m ON m.sub_account_id = d.sub_account_id
        SET d.parent_department_id = m.department_id
        WHERE d.sub_account_id IS NOT NULL
          AND d.parent_department_id IS NULL
      `);
    }

    if (await tableExists(queryInterface, 'department_structure')) {
      await dropFksOnColumn(queryInterface, 'department_structure', 'account_id');
      await dropFksOnColumn(queryInterface, 'department_structure', 'sub_account_id');
      await dropFksOnColumn(queryInterface, 'department_structure', 'parent_account_id');

      if (!(await columnExists(queryInterface, 'department_structure', 'department_id'))) {
        await queryInterface.addColumn('department_structure', 'department_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        });
      }
      if (!(await columnExists(queryInterface, 'department_structure', 'parent_department_id'))) {
        await queryInterface.addColumn('department_structure', 'parent_department_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        });
      }

      if (
        (await columnExists(queryInterface, 'department_structure', 'sub_account_id')) &&
        (await tableExists(queryInterface, '_map_sub_account_to_dept'))
      ) {
        await queryInterface.sequelize.query(`
          UPDATE department_structure ds
          LEFT JOIN _map_sub_account_to_dept m ON m.sub_account_id = ds.sub_account_id
          SET ds.department_id = COALESCE(ds.department_id, m.department_id)
        `);
      }
      if (
        (await columnExists(queryInterface, 'department_structure', 'parent_account_id')) &&
        (await tableExists(queryInterface, '_map_sub_account_to_dept'))
      ) {
        await queryInterface.sequelize.query(`
          UPDATE department_structure ds
          LEFT JOIN _map_sub_account_to_dept m ON m.sub_account_id = ds.parent_account_id
          SET ds.parent_department_id = COALESCE(ds.parent_department_id, m.department_id)
        `);
      }

      if (await columnExists(queryInterface, 'department_structure', 'account_id')) {
        await queryInterface.removeColumn('department_structure', 'account_id');
      }
      if (await columnExists(queryInterface, 'department_structure', 'sub_account_id')) {
        await queryInterface.removeColumn('department_structure', 'sub_account_id');
      }
      if (await columnExists(queryInterface, 'department_structure', 'parent_account_id')) {
        await queryInterface.removeColumn('department_structure', 'parent_account_id');
      }

      await addFkIfMissing(
        queryInterface,
        'department_structure',
        'department_id',
        'fk_department_structure_department_id',
      );
      await addFkIfMissing(
        queryInterface,
        'department_structure',
        'parent_department_id',
        'fk_department_structure_parent_department_id',
      );
    }

    await remapSubAccountColumn(queryInterface, Sequelize, 'org_position');
    await remapSubAccountColumn(queryInterface, Sequelize, 'course');
    await remapSubAccountColumn(queryInterface, Sequelize, 'jobs');

    if (await columnExists(queryInterface, 'department', 'sub_account_id')) {
      await dropFksOnColumn(queryInterface, 'department', 'sub_account_id');
      await queryInterface.removeColumn('department', 'sub_account_id');
    }

    await addFkIfMissing(
      queryInterface,
      'department',
      'parent_department_id',
      'fk_department_parent_department_id',
    );

    if (await tableExists(queryInterface, '_map_account_to_dept')) {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS _map_account_to_dept`);
    }
    if (await tableExists(queryInterface, '_map_sub_account_to_dept')) {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS _map_sub_account_to_dept`);
    }

    if (await tableExists(queryInterface, 'sub_account')) {
      const [fks] = await queryInterface.sequelize.query(`
        SELECT TABLE_NAME t, COLUMN_NAME c, CONSTRAINT_NAME k
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_NAME = 'sub_account'
      `);
      for (const row of fks) {
        await queryInterface.sequelize.query(
          `ALTER TABLE \`${row.t}\` DROP FOREIGN KEY \`${row.k}\``,
        );
      }
      await queryInterface.dropTable('sub_account');
    }

    if (await tableExists(queryInterface, 'account')) {
      const [fks] = await queryInterface.sequelize.query(`
        SELECT TABLE_NAME t, COLUMN_NAME c, CONSTRAINT_NAME k
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_NAME = 'account'
      `);
      for (const row of fks) {
        await queryInterface.sequelize.query(
          `ALTER TABLE \`${row.t}\` DROP FOREIGN KEY \`${row.k}\``,
        );
      }
      await queryInterface.dropTable('account');
    }
  },

  async down() {
    throw new Error(
      'Irreversible migration: account/sub_account consolidated into department. Restore from backup.',
    );
  },
};
