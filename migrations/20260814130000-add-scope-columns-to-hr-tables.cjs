'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: referenceModel ? {
            model: referenceModel,
            key: referenceKey
          } : undefined
        });
      }
    };

    // Add missing scope columns to HR tables
    await addColumnIfNotExists('staff', 'campus_id', 'campus', 'campus_id');

    await addColumnIfNotExists('leave_requests', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('leave_requests', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('leave_requests', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('leave_requests', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('leave_policies', 'campus_id', 'campus', 'campus_id');

    await addColumnIfNotExists('schedule', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('schedule', 'department_id', 'department', 'department_id');

    // BACKFILL QUERIES

    // staff campus_id
    await queryInterface.sequelize.query(`
      UPDATE staff s
      JOIN institute i ON s.institute_id = i.institute_id
      SET s.campus_id = i.campus_id
      WHERE s.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    // leave_policies campus_id
    await queryInterface.sequelize.query(`
      UPDATE leave_policies l
      JOIN institute i ON l.institute_id = i.institute_id
      SET l.campus_id = i.campus_id
      WHERE l.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    // schedule campus_id
    await queryInterface.sequelize.query(`
      UPDATE schedule s
      JOIN institute i ON s.institute_id = i.institute_id
      SET s.campus_id = i.campus_id
      WHERE s.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `);

    // leave_requests scope columns backfill from staff/employee via user_id
    await queryInterface.sequelize.query(`
      UPDATE leave_requests lr
      JOIN staff s ON lr.user_id = s.created_by
      JOIN institute i ON s.institute_id = i.institute_id
      SET lr.university_id = COALESCE(lr.university_id, s.university_id),
          lr.institute_id = COALESCE(lr.institute_id, s.institute_id),
          lr.department_id = COALESCE(lr.department_id, s.department_id),
          lr.campus_id = COALESCE(lr.campus_id, i.campus_id)
      WHERE lr.university_id IS NULL OR lr.department_id IS NULL OR lr.campus_id IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('staff', 'campus_id');
    await removeColumnIfExists('leave_requests', 'university_id');
    await removeColumnIfExists('leave_requests', 'campus_id');
    await removeColumnIfExists('leave_requests', 'institute_id');
    await removeColumnIfExists('leave_requests', 'department_id');
    await removeColumnIfExists('leave_policies', 'campus_id');
    await removeColumnIfExists('schedule', 'campus_id');
    await removeColumnIfExists('schedule', 'department_id');
  }
};
