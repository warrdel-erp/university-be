'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // =========================================================================
      // STEP 1: Extract unique elective_subject_type and ensure they exist in
      //         subject_component table.
      // =========================================================================
      const [electiveTypes] = await queryInterface.sequelize.query(
        `SELECT DISTINCT TRIM(elective_subject_type) AS type_name 
         FROM elective_subject 
         WHERE elective_subject_type IS NOT NULL AND TRIM(elective_subject_type) != ''`,
        { transaction: t }
      );

      const [existingComponents] = await queryInterface.sequelize.query(
        `SELECT id, component_name, code FROM subject_component`,
        { transaction: t }
      );

      const componentMap = new Map();
      for (const c of existingComponents) {
        const cleanName = (c.component_name || '').replace(/['"]/g, '').trim().toLowerCase();
        const cleanCode = (c.code || '').replace(/['"]/g, '').trim().toLowerCase();
        if (cleanName) componentMap.set(cleanName, c.id);
        if (cleanCode) componentMap.set(cleanCode, c.id);
      }

      for (const row of electiveTypes) {
        const rawType = (row.type_name || '').trim();
        const cleanType = rawType.replace(/['"]/g, '').trim();
        const lower = cleanType.toLowerCase();

        if (!componentMap.has(lower)) {
          const code = cleanType.substring(0, 10).toUpperCase();
          const [insertRes] = await queryInterface.sequelize.query(
            `INSERT INTO subject_component (component_name, code, description, created_at, updated_at)
             VALUES (:name, :code, :desc, NOW(), NOW())`,
            {
              replacements: {
                name: cleanType,
                code: code,
                desc: `Component for ${cleanType}`,
              },
              transaction: t,
            }
          );
          const newId = insertRes;
          componentMap.set(lower, newId);
          componentMap.set(code.toLowerCase(), newId);
        }
      }

      // =========================================================================
      // STEP 2: Map elective_subject to subject table & ensure subject_component_mapping
      // =========================================================================
      const [electiveSubjects] = await queryInterface.sequelize.query(
        `SELECT elective_subject_id, elective_subject_name, elective_subject_code, 
                elective_subject_type, course_id, specialization_id, institute_id, 
                university_id, created_by 
         FROM elective_subject`,
        { transaction: t }
      );

      const [existingSubjects] = await queryInterface.sequelize.query(
        `SELECT subject_id, subject_code, institute_id FROM subject`,
        { transaction: t }
      );

      const existingSubjectMap = new Map();
      for (const s of existingSubjects) {
        const code = (s.subject_code || '').trim().toLowerCase();
        const key = `${code}_${s.institute_id}`;
        existingSubjectMap.set(key, s.subject_id);
      }

      // Mapping from elective_subject_id -> { subjectId, scmId }
      const electiveToSubjectMap = new Map();

      for (const es of electiveSubjects) {
        const cleanCode = (es.elective_subject_code || '').trim();
        const codeKey = `${cleanCode.toLowerCase()}_${es.institute_id}`;
        let subjectId = existingSubjectMap.get(codeKey);

        if (!subjectId) {
          // Insert into subject table with subject_category = NULL as requested
          const [insertSub] = await queryInterface.sequelize.query(
            `INSERT INTO subject (
               subject_name, subject_code, subject_type, subject_category, 
               course_id, specialization_id, institute_id, university_id, 
               is_active, created_by, created_at, updated_at
             ) VALUES (
               :name, :code, 'Elective', NULL, 
               :courseId, :specId, :instId, :univId, 
               1, :createdBy, NOW(), NOW()
             )`,
            {
              replacements: {
                name: (es.elective_subject_name || '').trim(),
                code: cleanCode,
                courseId: es.course_id,
                specId: es.specialization_id,
                instId: es.institute_id,
                univId: es.university_id,
                createdBy: es.created_by,
              },
              transaction: t,
            }
          );
          subjectId = insertSub;
          existingSubjectMap.set(codeKey, subjectId);
        }

        // Determine matching component ID
        const cleanType = (es.elective_subject_type || '').replace(/['"]/g, '').trim().toLowerCase();
        let compId = componentMap.get(cleanType);
        if (!compId) {
          // Fallback to practical (PR) or theory (TH) or first available component
          compId = componentMap.get('pr') || componentMap.get('th') || 1;
        }

        // Check if subject_component_mapping already exists for this subject
        const [existingScm] = await queryInterface.sequelize.query(
          `SELECT id FROM subject_component_mapping 
           WHERE subject_id = :subjectId AND subject_component_id = :compId 
           LIMIT 1`,
          {
            replacements: { subjectId, compId },
            transaction: t,
          }
        );

        let scmId;
        if (existingScm.length > 0) {
          scmId = existingScm[0].id;
        } else {
          // Check if any mapping exists for this subject
          const [anyScm] = await queryInterface.sequelize.query(
            `SELECT id FROM subject_component_mapping WHERE subject_id = :subjectId LIMIT 1`,
            {
              replacements: { subjectId },
              transaction: t,
            }
          );
          if (anyScm.length > 0) {
            scmId = anyScm[0].id;
          } else {
            const [insertScm] = await queryInterface.sequelize.query(
              `INSERT INTO subject_component_mapping (subject_id, subject_component_id, created_at, updated_at)
               VALUES (:subjectId, :compId, NOW(), NOW())`,
              {
                replacements: { subjectId, compId },
                transaction: t,
              }
            );
            scmId = insertScm;
          }
        }

        electiveToSubjectMap.set(es.elective_subject_id, { subjectId, scmId });
      }

      // =========================================================================
      // STEP 3: Update time_table_cell with subject_id and subject_component_mapping_id
      // (Retains elective_subject_id untouched for future verification)
      // =========================================================================
      for (const [electiveId, { subjectId, scmId }] of electiveToSubjectMap.entries()) {
        await queryInterface.sequelize.query(
          `UPDATE time_table_cell 
           SET subject_id = :subjectId, 
               subject_component_mapping_id = :scmId 
           WHERE elective_subject_id = :electiveId`,
          {
            replacements: { subjectId, scmId, electiveId },
            transaction: t,
          }
        );
      }

      // =========================================================================
      // STEP 4: Update time_table_cell_date_wise with subject_id and subject_component_mapping_id
      // =========================================================================
      for (const [electiveId, { subjectId, scmId }] of electiveToSubjectMap.entries()) {
        await queryInterface.sequelize.query(
          `UPDATE time_table_cell_date_wise 
           SET subject_id = :subjectId, 
               subject_component_mapping_id = :scmId 
           WHERE elective_subject_id = :electiveId`,
          {
            replacements: { subjectId, scmId, electiveId },
            transaction: t,
          }
        );
      }

      // Inherit in date_wise from parent time_table_cell if any date-wise cells
      // were linked to an elective cell but had elective_subject_id as NULL
      await queryInterface.sequelize.query(
        `UPDATE time_table_cell_date_wise dw
         INNER JOIN time_table_cell ttc ON ttc.time_table_cell_id = dw.time_table_cell_id
         SET dw.subject_id = ttc.subject_id,
             dw.subject_component_mapping_id = ttc.subject_component_mapping_id
         WHERE dw.subject_id IS NULL 
           AND ttc.subject_id IS NOT NULL 
           AND ttc.elective_subject_id IS NOT NULL`,
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // Revert timetable cells where elective_subject_id is present
      await queryInterface.sequelize.query(
        `UPDATE time_table_cell 
         SET subject_id = NULL, 
             subject_component_mapping_id = NULL 
         WHERE elective_subject_id IS NOT NULL`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `UPDATE time_table_cell_date_wise dw
         INNER JOIN time_table_cell ttc ON ttc.time_table_cell_id = dw.time_table_cell_id
         SET dw.subject_id = NULL, 
             dw.subject_component_mapping_id = NULL 
         WHERE dw.elective_subject_id IS NOT NULL 
            OR ttc.elective_subject_id IS NOT NULL`,
        { transaction: t }
      );
    });
  },
};

