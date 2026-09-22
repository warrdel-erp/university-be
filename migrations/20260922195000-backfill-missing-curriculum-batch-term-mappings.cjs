'use strict';

/**
 * Backfill curriculum_batch_term_mapping for curriculum_batch_mapping rows
 * created via raw SQL during session/batch redesign (hooks did not run).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const [missing] = await queryInterface.sequelize.query(
        `
        SELECT
          cbm.curriculum_batch_mapping_id,
          cbm.created_by,
          b.batch AS batch_year,
          co.term_type,
          co.total_terms,
          co.course_duration
        FROM curriculum_batch_mapping cbm
        INNER JOIN batch b ON b.batch_id = cbm.batch_id
        INNER JOIN curriculum c ON c.curriculum_id = cbm.curriculum_id
        INNER JOIN course co ON co.course_id = c.course_id
        LEFT JOIN curriculum_batch_term_mapping t
          ON t.curriculum_batch_mapping_id = cbm.curriculum_batch_mapping_id
        WHERE t.curriculum_batch_term_mapping_id IS NULL
        `,
        { transaction: t },
      );

      for (const row of missing) {
        const totalTerms = Number(row.total_terms) || 0;
        const courseDuration = Number(row.course_duration) || 1;
        const batchYear = Number(row.batch_year);
        if (!totalTerms || !batchYear) {
          continue;
        }

        const termType = String(row.term_type || 'Sem').trim().toLowerCase();
        let monthsPerTerm = 6;
        if (termType.startsWith('year')) monthsPerTerm = 12;
        else if (termType.startsWith('tri')) monthsPerTerm = 4;
        else if (termType.startsWith('quar')) monthsPerTerm = 3;
        const termsPerYear = Math.max(1, Math.floor(12 / monthsPerTerm));
        const resolvedTotal =
          totalTerms > 0 ? totalTerms : Math.max(1, courseDuration * termsPerYear);

        const values = [];
        const replacements = [];
        for (let term = 1; term <= resolvedTotal; term++) {
          const yearNumber = Math.ceil(term / termsPerYear);
          const year = batchYear + yearNumber - 1;
          values.push('(?, ?, ?, ?, ?, NOW(), NOW())');
          replacements.push(
            row.curriculum_batch_mapping_id,
            term,
            yearNumber,
            year,
            row.created_by,
          );
        }

        if (values.length === 0) {
          continue;
        }

        await queryInterface.sequelize.query(
          `
          INSERT INTO curriculum_batch_term_mapping
            (curriculum_batch_mapping_id, term, year_number, year, created_by, created_at, updated_at)
          VALUES ${values.join(', ')}
          `,
          { replacements, transaction: t },
        );
      }

      console.log(
        `[MIGRATION] Backfilled term mappings for ${missing.length} curriculum_batch_mapping row(s).`,
      );
    });
  },

  down: async () => {
    // Non-destructive backfill; do not delete generated term rows.
  },
};
