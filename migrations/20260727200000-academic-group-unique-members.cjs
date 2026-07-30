'use strict';

/**
 * Unique membership: one active row per (group, student) and (group, user).
 * Cleans duplicate soft-deleted rows before adding unique indexes.
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function indexExists(queryInterface, tableName, indexName) {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((idx) => idx.name === indexName);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (await tableExists(queryInterface, 'academic_group_student')) {
      await queryInterface.sequelize.query(`
        DELETE t1 FROM academic_group_student t1
        INNER JOIN academic_group_student t2
          ON t1.academic_group_id = t2.academic_group_id
         AND t1.student_id = t2.student_id
         AND t1.academic_group_student_id < t2.academic_group_student_id
      `);

      if (!(await indexExists(queryInterface, 'academic_group_student', 'uq_academic_group_student_group_student'))) {
        await queryInterface.addIndex('academic_group_student', ['academic_group_id', 'student_id'], {
          unique: true,
          name: 'uq_academic_group_student_group_student',
        });
      }
    }

    if (await tableExists(queryInterface, 'academic_group_user')) {
      await queryInterface.sequelize.query(`
        DELETE t1 FROM academic_group_user t1
        INNER JOIN academic_group_user t2
          ON t1.academic_group_id = t2.academic_group_id
         AND t1.user_id = t2.user_id
         AND t1.academic_group_user_id < t2.academic_group_user_id
      `);

      if (!(await indexExists(queryInterface, 'academic_group_user', 'uq_academic_group_user_group_user'))) {
        await queryInterface.addIndex('academic_group_user', ['academic_group_id', 'user_id'], {
          unique: true,
          name: 'uq_academic_group_user_group_user',
        });
      }
    }
  },

  async down(queryInterface) {
    if (
      (await tableExists(queryInterface, 'academic_group_student')) &&
      (await indexExists(queryInterface, 'academic_group_student', 'uq_academic_group_student_group_student'))
    ) {
      await queryInterface.removeIndex('academic_group_student', 'uq_academic_group_student_group_student');
    }

    if (
      (await tableExists(queryInterface, 'academic_group_user')) &&
      (await indexExists(queryInterface, 'academic_group_user', 'uq_academic_group_user_group_user'))
    ) {
      await queryInterface.removeIndex('academic_group_user', 'uq_academic_group_user_group_user');
    }
  },
};
