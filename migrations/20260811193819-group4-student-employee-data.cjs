'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Disable strict mode to allow ALTER TABLE on tables with invalid default dates (like 0000-00-00)
    await queryInterface.sequelize.query(`SET SESSION sql_mode = ''`);

    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: referenceModel,
            key: referenceKey
          }
        });
      }
    };

    // Add missing columns
    await addColumnIfNotExists('student_fee_invoice', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('student_fee_payment', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('students', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('students_entrance_detail', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('students_entrance_detail', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('students_entrance_detail', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('employee_cor_address', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('employee_cor_address', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('employee_rolls', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('employee_rolls', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('staff', 'institute_id', 'institute', 'institute_id');

    // BACKFILL QUERIES

    await queryInterface.sequelize.query(`
      UPDATE student_fee_invoice s
      JOIN institute i ON s.institute_id = i.institute_id
      SET s.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE student_fee_payment s
      JOIN institute i ON s.institute_id = i.institute_id
      SET s.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE students s
      JOIN session sn ON s.session_id = sn.session_id
      SET s.acedmic_year_id = sn.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE students_entrance_detail e
      JOIN students s ON e.student_id = s.student_id
      SET e.university_id = s.university_id, e.institute_id = s.institute_id, e.acedmic_year_id = s.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE employee_cor_address a
      JOIN employee e ON a.employee_id = e.user_id
      SET a.university_id = e.university_id, a.institute_id = e.institute_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE employee_rolls r
      JOIN employee e ON r.employee_id = e.user_id
      SET r.university_id = e.university_id, r.institute_id = e.institute_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE staff s
      JOIN employee e ON s.employee_id = e.employee_id
      SET s.institute_id = e.institute_id
    `);
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('student_fee_invoice', 'university_id');
    await removeColumnIfExists('student_fee_payment', 'university_id');
    await removeColumnIfExists('students', 'acedmic_year_id');
    await removeColumnIfExists('students_entrance_detail', 'university_id');
    await removeColumnIfExists('students_entrance_detail', 'institute_id');
    await removeColumnIfExists('students_entrance_detail', 'acedmic_year_id');
    await removeColumnIfExists('employee_cor_address', 'university_id');
    await removeColumnIfExists('employee_cor_address', 'institute_id');
    await removeColumnIfExists('employee_rolls', 'university_id');
    await removeColumnIfExists('employee_rolls', 'institute_id');
    await removeColumnIfExists('staff', 'institute_id');
  }
};
