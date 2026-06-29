'use strict';

/** Re-run backfill + NOT NULL enforcement for tenant columns (safe if already applied) */

function isColumnNullable(columnDef) {
  if (!columnDef) return false;
  if (columnDef.allowNull === false) return false;
  if (columnDef.allowNull === true) return true;
  return columnDef.null === 'YES';
}

async function assertNoNulls(queryInterface, tableName, columnName) {
  const [[{ cnt }]] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS cnt FROM \`${tableName}\` WHERE \`${columnName}\` IS NULL`,
  );
  if (Number(cnt) > 0) {
    throw new Error(`${tableName}.${columnName} still has NULL values after backfill`);
  }
}

async function enforceNotNull(queryInterface, Sequelize, tableName, columnName, references) {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName] || !isColumnNullable(table[columnName])) {
    return;
  }

  await assertNoNulls(queryInterface, tableName, columnName);

  await queryInterface.changeColumn(tableName, columnName, {
    type: Sequelize.INTEGER,
    allowNull: false,
    references,
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });
}

const universityRef = { model: 'university', key: 'university_id' };
const instituteRef = { model: 'institute', key: 'institute_id' };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      UPDATE sub_account sa
      INNER JOIN (
        SELECT university_id, MIN(institute_id) AS institute_id
        FROM institute
        GROUP BY university_id
      ) i ON i.university_id = sa.university_id
      SET sa.institute_id = i.institute_id
      WHERE sa.institute_id IS NULL
    `);
    await enforceNotNull(queryInterface, Sequelize, 'sub_account', 'institute_id', instituteRef);

    await queryInterface.sequelize.query(`
      UPDATE department d
      INNER JOIN sub_account sa ON sa.sub_account_id = d.sub_account_id
      SET d.institute_id = sa.institute_id
      WHERE d.institute_id IS NULL AND sa.institute_id IS NOT NULL
    `);
    await queryInterface.sequelize.query(`
      UPDATE department d
      INNER JOIN (
        SELECT university_id, MIN(institute_id) AS institute_id
        FROM institute
        GROUP BY university_id
      ) i ON i.university_id = d.university_id
      SET d.institute_id = i.institute_id
      WHERE d.institute_id IS NULL
    `);
    await enforceNotNull(queryInterface, Sequelize, 'department', 'institute_id', instituteRef);

    await queryInterface.sequelize.query(`
      UPDATE employee_code_master ecm
      SET ecm.university_id = COALESCE(
        ecm.university_id,
        (SELECT MIN(university_id) FROM university)
      ),
      ecm.institute_id = COALESCE(
        ecm.institute_id,
        (
          SELECT MIN(institute_id) FROM institute
          WHERE university_id = COALESCE(
            ecm.university_id,
            (SELECT MIN(university_id) FROM university)
          )
        )
      )
      WHERE ecm.university_id IS NULL OR ecm.institute_id IS NULL
    `);
    await enforceNotNull(queryInterface, Sequelize, 'employee_code_master', 'university_id', universityRef);
    await enforceNotNull(queryInterface, Sequelize, 'employee_code_master', 'institute_id', instituteRef);

    await queryInterface.sequelize.query(`
      UPDATE employee_code_master_type ect
      INNER JOIN employee_code_master ecm
        ON ecm.employee_code_master_id = ect.employee_code_master_id
      SET ect.university_id = COALESCE(ect.university_id, ecm.university_id),
          ect.institute_id = COALESCE(ect.institute_id, ecm.institute_id)
      WHERE ect.university_id IS NULL OR ect.institute_id IS NULL
    `);
    await queryInterface.sequelize.query(`
      UPDATE employee_code_master_type ect
      SET ect.university_id = COALESCE(
        ect.university_id,
        (SELECT MIN(university_id) FROM university)
      ),
      ect.institute_id = COALESCE(
        ect.institute_id,
        (
          SELECT MIN(institute_id) FROM institute
          WHERE university_id = COALESCE(
            ect.university_id,
            (SELECT MIN(university_id) FROM university)
          )
        )
      )
      WHERE ect.university_id IS NULL OR ect.institute_id IS NULL
    `);
    await enforceNotNull(queryInterface, Sequelize, 'employee_code_master_type', 'university_id', universityRef);
    await enforceNotNull(queryInterface, Sequelize, 'employee_code_master_type', 'institute_id', instituteRef);
  },

  down: async () => {},
};
