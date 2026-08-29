'use strict';

/**
 * Migration to clean up mistakenly created duplicate subject entries in the DB.
 * 
 * Safety checks performed:
 * 1. Checks INFORMATION_SCHEMA.KEY_COLUMN_USAGE for all foreign keys referencing subject(subject_id).
 * 2. Checks all known application tables with columns storing subject IDs.
 * 3. Aggregates all active referenced subject IDs across all referencing tables.
 * 4. Groups duplicate subjects by (university_id, institute_id, course_id, acedmic_year_id, subject_code, subject_name, term, specialization_id).
 * 5. Keeps a canonical record (the lowest referenced ID or lowest ID).
 * 6. For extra duplicates:
 *    - If referenced in ANY table -> KEEPS the row (does not delete).
 *    - If NOT referenced in any table -> DELETES the extra row.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('--- Starting Duplicate Subjects Cleanup Migration ---');

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

      console.log(`Discovered ${validReferences.length} referencing table columns to check.`);

      // 4. Collect all distinct subject_ids currently referenced across all valid tables
      const referencedSubjectIds = new Set();
      for (const ref of validReferences) {
        const [rows] = await queryInterface.sequelize.query(
          `SELECT DISTINCT \`${ref.column}\` AS id FROM \`${ref.table}\` WHERE \`${ref.column}\` IS NOT NULL`,
          { transaction }
        );
        if (rows && rows.length > 0) {
          for (const row of rows) {
            if (row.id !== null && row.id !== undefined) {
              referencedSubjectIds.add(Number(row.id));
            }
          }
        }
      }

      console.log(`Total unique subject IDs currently referenced in foreign tables: ${referencedSubjectIds.size}`);

      // 5. Fetch all active subject records
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

      // 6. Group subjects by duplicate identifying attributes
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
      console.log(`Found ${duplicateGroups.length} duplicate groups.`);

      const idsToDelete = [];
      const idsRetainedDueToFK = [];
      const keepers = [];

      for (const group of duplicateGroups) {
        // Pick keeper: first referenced subject if available, otherwise lowest subject_id
        const keeper = group.find(s => referencedSubjectIds.has(Number(s.subject_id))) || group[0];
        keepers.push(keeper.subject_id);

        for (const item of group) {
          if (item.subject_id === keeper.subject_id) {
            continue;
          }

          const isReferenced = referencedSubjectIds.has(Number(item.subject_id));
          if (isReferenced) {
            idsRetainedDueToFK.push({
              subjectId: item.subject_id,
              subjectCode: item.subject_code,
              subjectName: item.subject_name,
              reason: 'Subject ID is in use as a foreign key'
            });
          } else {
            idsToDelete.push(item.subject_id);
          }
        }
      }

      console.log(`Canonical subject records preserved: ${keepers.length}`);
      console.log(`Extra duplicate subjects preserved due to active foreign key references: ${idsRetainedDueToFK.length}`);
      console.log(`Extra duplicate subjects to be deleted: ${idsToDelete.length}`);

      if (idsRetainedDueToFK.length > 0) {
        console.log('Retained extra duplicate subjects due to FK constraints:');
        idsRetainedDueToFK.forEach(item => {
          console.log(`  - ID: ${item.subjectId}, Code: ${item.subjectCode}, Name: "${item.subjectName}" (${item.reason})`);
        });
      }

      // 7. Delete unreferenced duplicate rows
      if (idsToDelete.length > 0) {
        // Delete in batches of 100 to avoid overly large IN queries
        const batchSize = 100;
        for (let i = 0; i < idsToDelete.length; i += batchSize) {
          const batch = idsToDelete.slice(i, i + batchSize);
          await queryInterface.sequelize.query(
            `DELETE FROM subject WHERE subject_id IN (?)`,
            {
              replacements: [batch],
              transaction
            }
          );
        }
        console.log(`Successfully deleted ${idsToDelete.length} unreferenced duplicate subject entries.`);
      } else {
        console.log('No unreferenced duplicate subject entries found to delete.');
      }

      await transaction.commit();
      console.log('--- Duplicate Subjects Cleanup Migration Completed Successfully ---');
    } catch (error) {
      await transaction.rollback();
      console.error('Error executing duplicate subjects cleanup migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Note: Deleted unreferenced duplicate records cannot be automatically restored in down migration.
    console.log('Duplicate subjects cleanup migration down step executed (no-op as deleted duplicate data cannot be restored).');
  }
};
