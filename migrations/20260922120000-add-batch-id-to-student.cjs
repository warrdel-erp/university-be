'use strict';

/**
 * Adds batch_id (FK → session_batch_mapping) to the student table.
 *
 * Backfill logic:
 *   Match student to session_batch_mapping by (student.session_id, student.batch_year).
 *   If a student has no session_id or no matching session_batch_mapping, batch_id stays NULL.
 *   Audit log is printed for unmatched students.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Add batch_id column
      await queryInterface.addColumn(
        'students',
        'batch_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'session_batch_mapping',
            key: 'session_batch_mapping_id',
          },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        { transaction: t },
      );

      // 2. Backfill: match by class_section_term_id → class_sections → session_batch_mapping_id
      await queryInterface.sequelize.query(
        `UPDATE students s
         JOIN class_section_term cst ON cst.class_section_term_id = s.class_section_term_id
         JOIN class_sections cs ON cs.class_sections_id = cst.class_sections_id
         SET s.batch_id = cs.session_batch_mapping_id
         WHERE s.batch_id IS NULL
           AND cs.session_batch_mapping_id IS NOT NULL`,
        { transaction: t },
      );

      // 3. Fallback Backfill: match by (session_id, batch_year) for students without class_section_term_id
      await queryInterface.sequelize.query(
        `UPDATE students s
         JOIN session_batch_mapping sbm
           ON sbm.session_id = s.session_id
          AND sbm.batch      = s.batch_year
         SET s.batch_id = sbm.session_batch_mapping_id
         WHERE s.batch_id IS NULL
           AND s.session_id IS NOT NULL
           AND s.batch_year IS NOT NULL`,
        { transaction: t },
      );

      // 4. Audit: count students that could not be matched
      const [[{ unmatched }]] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS unmatched
         FROM students
         WHERE batch_id IS NULL`,
        { transaction: t },
      );

      if (Number(unmatched) > 0) {
        console.warn(
          `\n[MIGRATION AUDIT] ${unmatched} student(s) could not be matched to a session_batch_mapping.`,
          'Their batch_id is NULL. Check their class_section_term_id or (session_id, batch_year).\n',
        );
      } else {
        console.log('[MIGRATION] All students successfully backfilled to batch_id.');
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn('students', 'batch_id', { transaction: t });
    });
  },
};
