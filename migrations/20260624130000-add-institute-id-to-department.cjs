'use strict';

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

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

const instituteRef = { model: 'institute', key: 'institute_id' };

/** Add institute_id to department; backfill then enforce NOT NULL */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await columnExists(queryInterface, 'department', 'institute_id'))) {
      await queryInterface.addColumn('department', 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: instituteRef,
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE department d
      INNER JOIN sub_account sa ON sa.sub_account_id = d.sub_account_id
      SET d.institute_id = sa.institute_id
      WHERE d.institute_id IS NULL
        AND sa.institute_id IS NOT NULL
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
  },

  down: async (queryInterface) => {
    if (await columnExists(queryInterface, 'department', 'institute_id')) {
      await queryInterface.removeColumn('department', 'institute_id');
    }
  },
};
