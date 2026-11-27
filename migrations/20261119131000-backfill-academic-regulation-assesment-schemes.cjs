'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const regulations = await queryInterface.sequelize.query(
        `SELECT * FROM academic_regulation WHERE deleted_at IS NULL`,
        { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
      );

      for (const reg of regulations) {
        // Check if already backfilled
        const existingSchemes = await queryInterface.sequelize.query(
          `SELECT id FROM academic_regulation_assesment_scheme WHERE academic_regulation_id = :regulationId LIMIT 1`,
          {
            replacements: { regulationId: reg.academic_regulation_id },
            type: queryInterface.sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        let schemeId = existingSchemes.length > 0 ? existingSchemes[0].id : null;

        if (!schemeId) {
          const evalPattern = reg.evaluation_pattern || 'INTERNAL_EXTERNAL';
          const schemeName = `${reg.regulation_name || 'General'} - Default Assessment Scheme`;
          const schemeCode = `${reg.regulation_code || 'REG'}_SCHEME`.substring(0, 50);

          const insertResult = await queryInterface.sequelize.query(
            `INSERT INTO academic_regulation_assesment_scheme (
              academic_regulation_id,
              name,
              code,
              evaluation_pattern,
              grading_scheme_id,
              internal_weightage,
              external_weightage,
              maximum_internal_marks,
              maximum_external_marks,
              minimum_internal_marks,
              minimum_external_marks,
              minimum_overall_marks,
              minimum_overall_percentage,
              is_active,
              institute_id,
              university_id,
              created_by,
              updated_by,
              created_at,
              updated_at
            ) VALUES (
              :academic_regulation_id,
              :name,
              :code,
              :evaluation_pattern,
              :grading_scheme_id,
              :internal_weightage,
              :external_weightage,
              :maximum_internal_marks,
              :maximum_external_marks,
              :minimum_internal_marks,
              :minimum_external_marks,
              :minimum_overall_marks,
              :minimum_overall_percentage,
              :is_active,
              :institute_id,
              :university_id,
              :created_by,
              :updated_by,
              NOW(),
              NOW()
            )`,
            {
              replacements: {
                academic_regulation_id: reg.academic_regulation_id,
                name: schemeName.substring(0, 100),
                code: schemeCode,
                evaluation_pattern: evalPattern,
                grading_scheme_id: reg.grading_scheme_id || null,
                internal_weightage: reg.internal_weightage != null ? reg.internal_weightage : null,
                external_weightage: reg.external_weightage != null ? reg.external_weightage : null,
                maximum_internal_marks: reg.maximum_internal_marks != null ? reg.maximum_internal_marks : null,
                maximum_external_marks: reg.maximum_external_marks != null ? reg.maximum_external_marks : null,
                minimum_internal_marks: reg.minimum_internal_marks != null ? reg.minimum_internal_marks : null,
                minimum_external_marks: reg.minimum_external_marks != null ? reg.minimum_external_marks : null,
                minimum_overall_marks: reg.minimum_overall_marks != null ? reg.minimum_overall_marks : null,
                minimum_overall_percentage: reg.minimum_overall_percentage != null ? reg.minimum_overall_percentage : null,
                is_active: reg.is_active !== false,
                institute_id: reg.institute_id,
                university_id: reg.university_id,
                created_by: reg.created_by || null,
                updated_by: reg.updated_by || null,
              },
              transaction,
            }
          );

          // Get the inserted id (either from insertResult or select last_insert_id)
          const lastIdResult = await queryInterface.sequelize.query(
            `SELECT LAST_INSERT_ID() as lastId`,
            { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
          );
          schemeId = lastIdResult?.[0]?.lastId || null;
        }

        // Backfill assessment_plan pointing to this regulation
        if (schemeId) {
          await queryInterface.sequelize.query(
            `UPDATE assessment_plan 
             SET academic_regulation_assesment_scheme_id = :schemeId 
             WHERE regulation_id = :regulationId AND academic_regulation_assesment_scheme_id IS NULL`,
            {
              replacements: {
                schemeId,
                regulationId: reg.academic_regulation_id,
              },
              transaction,
            }
          );
        }
      }

      await transaction.commit();
      console.log('Successfully backfilled academic_regulation_assesment_scheme records and linked assessment_plan rows.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert assessment_plan backfilled values
    await queryInterface.sequelize.query(
      `UPDATE assessment_plan SET academic_regulation_assesment_scheme_id = NULL`
    );
  }
};
