'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE t1 FROM library_member t1
      INNER JOIN library_member t2
        ON t1.student_id = t2.student_id
       AND t1.student_id IS NOT NULL
       AND t1.library_member_id > t2.library_member_id
    `);

    await queryInterface.sequelize.query(`
      DELETE t1 FROM library_member t1
      INNER JOIN library_member t2
        ON t1.employee_id = t2.employee_id
       AND t1.employee_id IS NOT NULL
       AND t1.library_member_id > t2.library_member_id
    `);

    const tableDefinition = await queryInterface.describeTable('library_member');

    if (!tableDefinition.student_id?.unique) {
      await queryInterface.addIndex('library_member', ['student_id'], {
        unique: true,
        name: 'uq_library_member_student_id',
      });
    }

    if (!tableDefinition.employee_id?.unique) {
      await queryInterface.addIndex('library_member', ['employee_id'], {
        unique: true,
        name: 'uq_library_member_employee_id',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'library_member',
      'uq_library_member_employee_id',
    );
    await queryInterface.removeIndex(
      'library_member',
      'uq_library_member_student_id',
    );
  },
};
