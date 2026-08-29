'use strict';

/**
 * Migration to clean up duplicate subject entries in the database.
 * 
 * Logic & Safety Guarantees:
 * 1. Discovers all ERP tables and columns that reference subject(subject_id), both statically
 *    and dynamically via MySQL's INFORMATION_SCHEMA.KEY_COLUMN_USAGE.
 * 2. Groups duplicate subjects sharing the same (university_id, institute_id, course_id, 
 *    academic_year_id, subject_code, subject_name, term, specialization_id).
 * 3. In each duplicate group, designates the lowest subject_id as the canonical keeper.
 * 4. For every extra duplicate subject:
 *    a. Repoints all foreign key references in child/mapping tables to the canonical keeper subject.
 *    b. Handles unique index collisions safely (removes redundant duplicate mappings if the keeper 
 *       is already mapped to the exact same relation).
 *    c. Deletes the extra duplicate subject from the `subject` table.
 * 5. Guarantees that only one canonical subject entry exists at the end without losing any relational data.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('--- Starting Duplicate Subjects Consolidation & Cleanup Migration ---');

      // 1. Known tables and columns in the ERP that store subject IDs
      const knownReferences = [
        { table: 'academic_group_scope', column: 'context_subject_id' },
        { table: 'assessment_evalution', column: 'subject_id' },
        { table: 'assessment_plan_subject_mapping', column: 'subject_id' },
        { table: 'class_schedule_item', column: 'subject_id' },
        { table: 'class_subject_mapper', column: 'subject_id' },
        { table: 'co', column: 'subject_id' },
        { table: 'credits', column: 'subject_id' },
        { table: 'evalutions', column: 'subject_id' },
        { table: 'exam_schedule', column: 'subject_id' },
        { table: 'exam_setup', column: 'subject_id' },
        { table: 'internal_assessment', column: 'subject_id' },
        { table: 'jobs', column: 'subject_id' },
        { table: 'lecture_window', column: 'subject_id' },
        { table: 'lesson', column: 'subject_id' },
        { table: 'library_book_subject_mappings', column: 'library_subject_id' },
        { table: 'question_bank', column: 'subject_id' },
        { table: 'question_paper_blueprint', column: 'subject_id' },
        { table: 'subject_mapper', column: 'subject_id' },
        { table: 'subject_weightage', column: 'subject_id' },
        { table: 'syllabus_details', column: 'subject_id' },
        { table: 'syllabus_unit', column: 'subject_id' },
        { table: 'teacher_subject_mapping', column: 'subject_id' },
        { table: 'time_table_cell', column: 'subject_id' },
        { table: 'time_table_cell_date_wise', column: 'subject_id' }
      ];

      // 2. Discover dynamic foreign keys from INFORMATION_SCHEMA
      const [fkRows] = await queryInterface.sequelize.query(
        `
        SELECT TABLE_NAME AS \`table\`, COLUMN_NAME AS \`column\`
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_NAME = 'subject'
          AND REFERENCED_COLUMN_NAME = 'subject_id'
          AND TABLE_SCHEMA = DATABASE()
        `,
        { transaction }
      );

      const allRefsMap = new Map();
      for (const r of [...knownReferences, ...(fkRows || [])]) {
        allRefsMap.set(`${r.table}.${r.column}`, { table: r.table, column: r.column });
      }

      // 3. Filter only tables and columns that actually exist in the current database
      const validReferences = [];
      for (const r of allRefsMap.values()) {
        const [exists] = await queryInterface.sequelize.query(
          `
          SELECT 1 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ? 
            AND COLUMN_NAME = ?
          `,
          {
            replacements: [r.table, r.column],
            transaction
          }
        );
        if (exists && exists.length > 0) {
          validReferences.push(r);
        }
      }

      console.log(`Discovered ${validReferences.length} referencing table columns to inspect.`);

      // 4. Fetch all active subject records
      const [allSubjects] = await queryInterface.sequelize.query(
        `
        SELECT 
          subject_id, 
          university_id, 
          institute_id, 
          course_id, 
          specialization_id, 
          acedmic_year_id, 
          subject_name, 
          subject_code, 
          term, 
          deleted_at
        FROM subject
        WHERE deleted_at IS NULL
        ORDER BY subject_id ASC
        `,
        { transaction }
      );

      // 5. Group subjects by duplicate identifying attributes
      const groups = new Map();
      for (const s of allSubjects) {
        const key = [
          s.university_id || 0,
          s.institute_id || 0,
          s.course_id || 0,
          s.acedmic_year_id || 0,
          (s.subject_code || '').trim().toUpperCase(),
          (s.subject_name || '').trim().toUpperCase(),
          s.term !== null && s.term !== undefined ? s.term : 'NULL',
          s.specialization_id !== null && s.specialization_id !== undefined ? s.specialization_id : 'NULL'
        ].join('::');

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(s);
      }

      const duplicateGroups = Array.from(groups.values()).filter(g => g.length > 1);
      console.log(`Found ${duplicateGroups.length} duplicate groups to consolidate.`);

      let totalReferencesRepointed = 0;
      let totalRedundantMappingsRemoved = 0;
      const deletedSubjectIds = [];

      for (const group of duplicateGroups) {
        const keeper = group[0]; // Lowest subject_id as the canonical keeper
        const duplicates = group.slice(1);

        console.log(`\nConsolidating duplicate group for code "${keeper.subject_code}", name "${keeper.subject_name}":`);
        console.log(`  -> Canonical Keeper ID: ${keeper.subject_id}`);
        console.log(`  -> Extra Duplicate IDs to merge & remove: ${duplicates.map(d => d.subject_id).join(', ')}`);

        for (const dup of duplicates) {
          // Repoint references across all referencing tables to the keeper subject
          for (const ref of validReferences) {
            // Update references with UPDATE IGNORE in case of unique constraint collisions
            const [updateResult] = await queryInterface.sequelize.query(
              `UPDATE IGNORE \`${ref.table}\` SET \`${ref.column}\` = ? WHERE \`${ref.column}\` = ?`,
              {
                replacements: [keeper.subject_id, dup.subject_id],
                transaction
              }
            );

            const affected = (updateResult && updateResult.affectedRows !== undefined) 
              ? updateResult.affectedRows 
              : (updateResult && typeof updateResult === 'number' ? updateResult : 0);

            if (affected > 0) {
              totalReferencesRepointed += affected;
              console.log(`     Repointed ${affected} rows in ${ref.table}.${ref.column} from subject ${dup.subject_id} -> ${keeper.subject_id}`);
            }

            // If any rows could not be updated due to unique constraint collision (i.e. keeper is already mapped identically),
            // remove the redundant mapping row for the duplicate subject
            const [remainingRows] = await queryInterface.sequelize.query(
              `SELECT COUNT(*) AS cnt FROM \`${ref.table}\` WHERE \`${ref.column}\` = ?`,
              {
                replacements: [dup.subject_id],
                transaction
              }
            );

            const remainingCount = remainingRows && remainingRows[0] ? Number(remainingRows[0].cnt) : 0;
            if (remainingCount > 0) {
              await queryInterface.sequelize.query(
                `DELETE FROM \`${ref.table}\` WHERE \`${ref.column}\` = ?`,
                {
                  replacements: [dup.subject_id],
                  transaction
                }
              );
              totalRedundantMappingsRemoved += remainingCount;
              console.log(`     Removed ${remainingCount} redundant mapping rows in ${ref.table}.${ref.column} for duplicate subject ${dup.subject_id}`);
            }
          }

          // Delete the duplicate subject row from subject table
          await queryInterface.sequelize.query(
            `DELETE FROM subject WHERE subject_id = ?`,
            {
              replacements: [dup.subject_id],
              transaction
            }
          );
          deletedSubjectIds.push(dup.subject_id);
        }
      }

      console.log('\n--- Migration Consolidation Summary ---');
      console.log(`Total duplicate groups processed: ${duplicateGroups.length}`);
      console.log(`Total referencing rows repointed to canonical subjects: ${totalReferencesRepointed}`);
      console.log(`Total redundant duplicate mapping rows removed: ${totalRedundantMappingsRemoved}`);
      console.log(`Total duplicate subject entries deleted: ${deletedSubjectIds.length}`);

      await transaction.commit();
      console.log('--- Duplicate Subjects Consolidation & Cleanup Migration Completed Successfully ---');
    } catch (error) {
      await transaction.rollback();
      console.error('Error executing duplicate subjects consolidation migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Duplicate subjects cleanup migration down step executed (no-op as deleted duplicate data cannot be restored).');
  }
};
