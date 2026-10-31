'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // =========================================================================
      // STEP 0: Base Master Backfill (subject_component_mapping)
      // Ensure EVERY subject has at least one entry in subject_component_mapping
      // so foreign key constraints on downstream tables will not fail.
      // =========================================================================
      await queryInterface.sequelize.query(
        `INSERT INTO subject_component_mapping (subject_id, subject_component_id, created_at, updated_at)
         SELECT 
           s.subject_id,
           COALESCE(
             (SELECT sc.id FROM subject_component sc WHERE LOWER(sc.component_name) = LOWER(TRIM(s.subject_category)) LIMIT 1),
             CASE 
               WHEN LOWER(s.subject_type) LIKE '%session%' THEN (SELECT sc.id FROM subject_component sc WHERE sc.code = 'PR' OR LOWER(sc.component_name) = 'practical' LIMIT 1)
               WHEN LOWER(s.subject_type) LIKE '%lab%' THEN (SELECT sc.id FROM subject_component sc WHERE sc.code = 'LB' OR LOWER(sc.component_name) = 'lab' LIMIT 1)
               WHEN LOWER(s.subject_type) LIKE '%studio%' THEN (SELECT sc.id FROM subject_component sc WHERE sc.code = 'ST' OR LOWER(sc.component_name) = 'studio' LIMIT 1)
               WHEN LOWER(s.subject_type) LIKE '%workshop%' THEN (SELECT sc.id FROM subject_component sc WHERE sc.code = 'WS' OR LOWER(sc.component_name) = 'workshop' LIMIT 1)
               WHEN LOWER(s.subject_type) LIKE '%theoret%' THEN (SELECT sc.id FROM subject_component sc WHERE sc.code = 'TH' OR LOWER(sc.component_name) = 'theory' LIMIT 1)
               ELSE (SELECT sc.id FROM subject_component sc WHERE sc.code = 'TH' OR LOWER(sc.component_name) = 'theory' LIMIT 1)
             END,
             (SELECT sc.id FROM subject_component sc ORDER BY sc.id ASC LIMIT 1)
           ) AS subject_component_id,
           NOW(),
           NOW()
         FROM subject s
         LEFT JOIN subject_component_mapping scm ON scm.subject_id = s.subject_id
         WHERE scm.id IS NULL;`,
        { transaction: t }
      );

      // =========================================================================
      // STEP 1: curriculum_subject_term_mapping (Column already exists)
      // Backfill subject_component_mapping_id for all unmapped rows
      // =========================================================================
      await queryInterface.sequelize.query(
        `UPDATE curriculum_subject_term_mapping cstm
         INNER JOIN (
           SELECT subject_id, MIN(id) AS scm_id
           FROM subject_component_mapping
           GROUP BY subject_id
         ) scm ON scm.subject_id = cstm.subject_id
         SET cstm.subject_component_mapping_id = scm.scm_id
         WHERE cstm.subject_component_mapping_id IS NULL;`,
        { transaction: t }
      );

      // =========================================================================
      // STEP 2: time_table_cell (Column already exists)
      // Backfill subject_component_mapping_id for all unmapped subject cells
      // =========================================================================
      await queryInterface.sequelize.query(
        `UPDATE time_table_cell ttc
         INNER JOIN (
           SELECT subject_id, MIN(id) AS scm_id
           FROM subject_component_mapping
           GROUP BY subject_id
         ) scm ON scm.subject_id = ttc.subject_id
         SET ttc.subject_component_mapping_id = scm.scm_id
         WHERE ttc.subject_id IS NOT NULL 
           AND ttc.subject_component_mapping_id IS NULL;`,
        { transaction: t }
      );

      // =========================================================================
      // STEP 3: time_table_cell_date_wise (ADD COLUMN + BACKFILL)
      // =========================================================================
      const [dwCols] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM time_table_cell_date_wise LIKE 'subject_component_mapping_id'`,
        { transaction: t }
      );
      if (!dwCols || dwCols.length === 0) {
        await queryInterface.sequelize.query(
          `ALTER TABLE time_table_cell_date_wise 
           ADD COLUMN subject_component_mapping_id INT NULL,
           ADD CONSTRAINT fk_time_table_cell_date_wise_scm 
           FOREIGN KEY (subject_component_mapping_id) 
           REFERENCES subject_component_mapping(id) 
           ON UPDATE CASCADE ON DELETE SET NULL;`,
          { transaction: t }
        );
      }

      // Inherit from parent time_table_cell
      await queryInterface.sequelize.query(
        `UPDATE time_table_cell_date_wise dw
         INNER JOIN time_table_cell ttc ON ttc.time_table_cell_id = dw.time_table_cell_id
         SET dw.subject_component_mapping_id = ttc.subject_component_mapping_id
         WHERE dw.subject_component_mapping_id IS NULL 
           AND ttc.subject_component_mapping_id IS NOT NULL;`,
        { transaction: t }
      );

      // Fallback: match direct subject_id on date_wise if any remain null
      await queryInterface.sequelize.query(
        `UPDATE time_table_cell_date_wise dw
         INNER JOIN (
           SELECT subject_id, MIN(id) AS scm_id
           FROM subject_component_mapping
           GROUP BY subject_id
         ) scm ON scm.subject_id = dw.subject_id
         SET dw.subject_component_mapping_id = scm.scm_id
         WHERE dw.subject_component_mapping_id IS NULL 
           AND dw.subject_id IS NOT NULL;`,
        { transaction: t }
      );

      // =========================================================================
      // STEP 4: exam_schedule (ADD COLUMN + BACKFILL)
      // =========================================================================
      const [esCols] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM exam_schedule LIKE 'subject_component_mapping_id'`,
        { transaction: t }
      );
      if (!esCols || esCols.length === 0) {
        await queryInterface.sequelize.query(
          `ALTER TABLE exam_schedule 
           ADD COLUMN subject_component_mapping_id INT NULL,
           ADD CONSTRAINT fk_exam_schedule_scm 
           FOREIGN KEY (subject_component_mapping_id) 
           REFERENCES subject_component_mapping(id) 
           ON UPDATE CASCADE ON DELETE SET NULL;`,
          { transaction: t }
        );
      }

      // Match via curriculum_subject_term_mapping_id
      await queryInterface.sequelize.query(
        `UPDATE exam_schedule es
         INNER JOIN curriculum_subject_term_mapping cstm 
           ON cstm.curriculum_subject_term_mapping_id = es.curriculum_subject_term_mapping_id
         SET es.subject_component_mapping_id = cstm.subject_component_mapping_id
         WHERE es.subject_component_mapping_id IS NULL 
           AND cstm.subject_component_mapping_id IS NOT NULL;`,
        { transaction: t }
      );

      // Fallback: match via subject_id
      await queryInterface.sequelize.query(
        `UPDATE exam_schedule es
         INNER JOIN (
           SELECT subject_id, MIN(id) AS scm_id
           FROM subject_component_mapping
           GROUP BY subject_id
         ) scm ON scm.subject_id = es.subject_id
         SET es.subject_component_mapping_id = scm.scm_id
         WHERE es.subject_component_mapping_id IS NULL 
           AND es.subject_id IS NOT NULL;`,
        { transaction: t }
      );

      // =========================================================================
      // STEP 5: assessment_plan_subject_mapping (ADD COLUMN + BACKFILL)
      // =========================================================================
      const [apsmCols] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM assessment_plan_subject_mapping LIKE 'subject_component_mapping_id'`,
        { transaction: t }
      );
      if (!apsmCols || apsmCols.length === 0) {
        await queryInterface.sequelize.query(
          `ALTER TABLE assessment_plan_subject_mapping 
           ADD COLUMN subject_component_mapping_id INT NULL,
           ADD CONSTRAINT fk_assessment_plan_subject_mapping_scm 
           FOREIGN KEY (subject_component_mapping_id) 
           REFERENCES subject_component_mapping(id) 
           ON UPDATE CASCADE ON DELETE SET NULL;`,
          { transaction: t }
        );
      }

      // Match via curriculum_subject_term_mapping_id
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan_subject_mapping apsm
         INNER JOIN curriculum_subject_term_mapping cstm 
           ON cstm.curriculum_subject_term_mapping_id = apsm.curriculum_subject_term_mapping_id
         SET apsm.subject_component_mapping_id = cstm.subject_component_mapping_id
         WHERE apsm.subject_component_mapping_id IS NULL 
           AND cstm.subject_component_mapping_id IS NOT NULL;`,
        { transaction: t }
      );

      // Fallback: match via subject_id
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan_subject_mapping apsm
         INNER JOIN (
           SELECT subject_id, MIN(id) AS scm_id
           FROM subject_component_mapping
           GROUP BY subject_id
         ) scm ON scm.subject_id = apsm.subject_id
         SET apsm.subject_component_mapping_id = scm.scm_id
         WHERE apsm.subject_component_mapping_id IS NULL 
           AND apsm.subject_id IS NOT NULL;`,
        { transaction: t }
      );

      // =========================================================================
      // STEP 6: academic_group_scope (ADD COLUMN + BACKFILL)
      // =========================================================================
      const [agsCols] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM academic_group_scope LIKE 'subject_component_mapping_id'`,
        { transaction: t }
      );
      if (!agsCols || agsCols.length === 0) {
        await queryInterface.sequelize.query(
          `ALTER TABLE academic_group_scope 
           ADD COLUMN subject_component_mapping_id INT NULL,
           ADD CONSTRAINT fk_academic_group_scope_scm 
           FOREIGN KEY (subject_component_mapping_id) 
           REFERENCES subject_component_mapping(id) 
           ON UPDATE CASCADE ON DELETE SET NULL;`,
          { transaction: t }
        );
      }

      await queryInterface.sequelize.query(
        `UPDATE academic_group_scope ags
         INNER JOIN (
           SELECT subject_id, MIN(id) AS scm_id
           FROM subject_component_mapping
           GROUP BY subject_id
         ) scm ON scm.subject_id = ags.context_subject_id
         SET ags.subject_component_mapping_id = scm.scm_id
         WHERE ags.context_subject_id IS NOT NULL 
           AND ags.subject_component_mapping_id IS NULL;`,
        { transaction: t }
      );

      // =========================================================================
      // STEP 7: teacher_subject_mapping (ADD COLUMN + BACKFILL)
      // =========================================================================
      const [tsmCols] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM teacher_subject_mapping LIKE 'subject_component_mapping_id'`,
        { transaction: t }
      );
      if (!tsmCols || tsmCols.length === 0) {
        await queryInterface.sequelize.query(
          `ALTER TABLE teacher_subject_mapping 
           ADD COLUMN subject_component_mapping_id INT NULL,
           ADD CONSTRAINT fk_teacher_subject_mapping_scm 
           FOREIGN KEY (subject_component_mapping_id) 
           REFERENCES subject_component_mapping(id) 
           ON UPDATE CASCADE ON DELETE SET NULL;`,
          { transaction: t }
        );
      }

      await queryInterface.sequelize.query(
        `UPDATE teacher_subject_mapping tsm
         INNER JOIN (
           SELECT subject_id, MIN(id) AS scm_id
           FROM subject_component_mapping
           GROUP BY subject_id
         ) scm ON scm.subject_id = tsm.subject_id
         SET tsm.subject_component_mapping_id = scm.scm_id
         WHERE tsm.subject_id IS NOT NULL 
           AND tsm.subject_component_mapping_id IS NULL;`,
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // Revert added columns and constraints in reverse order
      await queryInterface.sequelize.query(
        `ALTER TABLE teacher_subject_mapping 
         DROP FOREIGN KEY fk_teacher_subject_mapping_scm,
         DROP COLUMN subject_component_mapping_id;`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE academic_group_scope 
         DROP FOREIGN KEY fk_academic_group_scope_scm,
         DROP COLUMN subject_component_mapping_id;`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE assessment_plan_subject_mapping 
         DROP FOREIGN KEY fk_assessment_plan_subject_mapping_scm,
         DROP COLUMN subject_component_mapping_id;`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE exam_schedule 
         DROP FOREIGN KEY fk_exam_schedule_scm,
         DROP COLUMN subject_component_mapping_id;`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE time_table_cell_date_wise 
         DROP FOREIGN KEY fk_time_table_cell_date_wise_scm,
         DROP COLUMN subject_component_mapping_id;`,
        { transaction: t }
      );
    });
  },
};

