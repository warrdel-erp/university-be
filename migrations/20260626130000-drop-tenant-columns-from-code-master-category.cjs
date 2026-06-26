'use strict';

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

/** Code master categories are software-wide; tenant columns belong only on code values. */
module.exports = {
  async up(queryInterface) {
    if (await columnExists(queryInterface, 'employee_code_master', 'institute_id')) {
      await queryInterface.removeColumn('employee_code_master', 'institute_id');
    }
    if (await columnExists(queryInterface, 'employee_code_master', 'university_id')) {
      await queryInterface.removeColumn('employee_code_master', 'university_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const universityRef = { model: 'university', key: 'university_id' };
    const instituteRef = { model: 'institute', key: 'institute_id' };

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
  },
};
