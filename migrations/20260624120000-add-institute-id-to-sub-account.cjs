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

/** Add institute_id to sub_account; backfill then enforce NOT NULL */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await columnExists(queryInterface, 'sub_account', 'institute_id'))) {
      await queryInterface.addColumn('sub_account', 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: instituteRef,
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

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
  },

  down: async (queryInterface) => {
    if (await columnExists(queryInterface, 'sub_account', 'institute_id')) {
      await queryInterface.removeColumn('sub_account', 'institute_id');
    }
  },
};
