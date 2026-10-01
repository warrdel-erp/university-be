'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [terms] = await queryInterface.sequelize.query(
      'SELECT examination_session_term_id, examination_session_id, course_id, session_id, term FROM examination_session_term;'
    );

    for (const row of terms) {
      const estId = row.examination_session_term_id;
      const examSessionId = row.examination_session_id;
      const courseId = row.course_id;
      const sessionId = row.session_id;
      const term = Number(row.term) || 1;

      let targetBatchId = null;

      // Tier 1: Check existing exam_schedule for this exam session and term
      if (examSessionId && term) {
        const [schedules] = await queryInterface.sequelize.query(
          'SELECT batch_id FROM exam_schedule WHERE examination_session_id = ? AND term = ? AND batch_id IS NOT NULL LIMIT 1;',
          { replacements: [examSessionId, term] }
        );
        if (schedules.length > 0 && schedules[0].batch_id) {
          targetBatchId = schedules[0].batch_id;
        }
      }

      // Tier 2: Check enrolled students in this (sessionId, courseId, term)
      if (!targetBatchId && sessionId && courseId && term) {
        const [studentCohorts] = await queryInterface.sequelize.query(
          `SELECT s.batch_id, COUNT(*) as cnt 
           FROM students s
           JOIN class_section_term cst ON s.class_section_term_id = cst.class_section_term_id
           WHERE s.session_id = ? AND s.course_id = ? AND cst.term = ? AND s.batch_id IS NOT NULL
           GROUP BY s.batch_id 
           ORDER BY cnt DESC 
           LIMIT 1;`,
          { replacements: [sessionId, courseId, term] }
        );
        if (studentCohorts.length > 0 && studentCohorts[0].batch_id) {
          targetBatchId = studentCohorts[0].batch_id;
        }
      }

      // Tier 3 & 4: Calculate from Course termsPerYear and Session admission batches
      if (!targetBatchId && sessionId) {
        let termsPerYear = 2;
        if (courseId) {
          const [courseRows] = await queryInterface.sequelize.query(
            'SELECT term_type FROM course WHERE course_id = ? LIMIT 1;',
            { replacements: [courseId] }
          );
          if (courseRows.length > 0) {
            const tt = String(courseRows[0].term_type || '').toLowerCase();
            if (tt.startsWith('year')) termsPerYear = 1;
            else if (tt.startsWith('tri')) termsPerYear = 3;
            else if (tt.startsWith('quar')) termsPerYear = 4;
            else termsPerYear = 2;
          }
        }

        const yearNum = Math.max(1, Math.ceil(term / termsPerYear));

        const [batches] = await queryInterface.sequelize.query(
          'SELECT batch_id, batch FROM batch WHERE session_id = ? ORDER BY batch DESC;',
          { replacements: [sessionId] }
        );

        if (batches.length > 0) {
          const maxBatchYear = Number(batches[0].batch);
          const expectedBatchYear = maxBatchYear - (yearNum - 1);

          // Match exact calculated admission year
          const matchedByYear = batches.find((b) => Number(b.batch) === expectedBatchYear);
          if (matchedByYear) {
            targetBatchId = matchedByYear.batch_id;
          } else {
            // Fallback to sorted index
            const idx = yearNum - 1;
            targetBatchId = (idx >= 0 && idx < batches.length)
              ? batches[idx].batch_id
              : batches[batches.length - 1].batch_id;
          }
        }
      }

      if (targetBatchId != null) {
        await queryInterface.sequelize.query(
          'UPDATE examination_session_term SET batch_id = ? WHERE examination_session_term_id = ?;',
          { replacements: [targetBatchId, estId] }
        );
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'UPDATE examination_session_term SET batch_id = NULL;'
    );
  },
};
