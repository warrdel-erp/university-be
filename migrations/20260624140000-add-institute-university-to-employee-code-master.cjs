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

const universityRef = { model: 'university', key: 'university_id' };
const instituteRef = { model: 'institute', key: 'institute_id' };

/** Add university_id and institute_id to employee_code_master tables */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await columnExists(queryInterface, 'employee_code_master', 'university_id'))) {
      await queryInterface.addColumn('employee_code_master', 'university_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: universityRef,
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    if (!(await columnExists(queryInterface, 'employee_code_master', 'institute_id'))) {
      await queryInterface.addColumn('employee_code_master', 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: instituteRef,
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

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

    if (!(await columnExists(queryInterface, 'employee_code_master_type', 'university_id'))) {
      await queryInterface.addColumn('employee_code_master_type', 'university_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: universityRef,
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    if (!(await columnExists(queryInterface, 'employee_code_master_type', 'institute_id'))) {
      await queryInterface.addColumn('employee_code_master_type', 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: instituteRef,
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

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

  down: async (queryInterface) => {
    if (await columnExists(queryInterface, 'employee_code_master_type', 'institute_id')) {
      await queryInterface.removeColumn('employee_code_master_type', 'institute_id');
    }
    if (await columnExists(queryInterface, 'employee_code_master_type', 'university_id')) {
      await queryInterface.removeColumn('employee_code_master_type', 'university_id');
    }
    if (await columnExists(queryInterface, 'employee_code_master', 'institute_id')) {
      await queryInterface.removeColumn('employee_code_master', 'institute_id');
    }
    if (await columnExists(queryInterface, 'employee_code_master', 'university_id')) {
      await queryInterface.removeColumn('employee_code_master', 'university_id');
    }
  },
};
