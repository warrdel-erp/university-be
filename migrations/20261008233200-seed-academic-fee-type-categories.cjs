'use strict';

/**
 * Seed migration to populate 10 standard academic fee type categories
 * for every university.
 */

const ACADEMIC_FEE_CATEGORIES = [
  {
    name: 'Tuition Fee',
    description: 'Fee for core academic instruction, lectures, and credit hours',
  },
  {
    name: 'Laboratory Fee',
    description: 'Fee for laboratory consumables, practical sessions, workshops, and lab facilities',
  },
  {
    name: 'Examination Fee',
    description: 'Fee for term assessments, semester examination, and grade cards',
  },
  {
    name: 'Library Fee',
    description: 'Fee for library access, learning resources, and academic digital databases',
  },
  {
    name: 'Admission & Registration Fee',
    description: 'One-time fee for admission processing, enrollment, and verification',
  },
  {
    name: 'Caution Deposit',
    description: 'Refundable security deposit for institutional and campus property',
  },
  {
    name: 'Development & Infrastructure Fee',
    description: 'Fee for campus development, classroom infrastructure, and IT/LMS facilities',
  },
  {
    name: 'Student Welfare & Activities Fee',
    description: 'Fee for student societies, cultural events, clubs, sports, and health services',
  },
  {
    name: 'Hostel & Accommodation Fee',
    description: 'Fee for campus residential room rent, utilities, and hostel maintenance',
  },
  {
    name: 'Transportation Fee',
    description: 'Fee for student bus routes and campus transit facilities',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Fetch all active universities
      const [universities] = await queryInterface.sequelize.query(
        `SELECT DISTINCT university_id
         FROM university
         WHERE deleted_at IS NULL`,
        { transaction }
      );

      if (!universities.length) {
        return;
      }

      // Fetch existing categories to ensure idempotency per university
      const [existingCategories] = await queryInterface.sequelize.query(
        'SELECT university_id, name FROM fee_type_categories',
        { transaction }
      );

      const existingSet = new Set(
        existingCategories.map((c) => `${c.university_id}_${c.name.trim().toLowerCase()}`)
      );

      const now = new Date();
      const toInsert = [];

      for (const univ of universities) {
        const universityId = univ.university_id;

        for (const cat of ACADEMIC_FEE_CATEGORIES) {
          const key = `${universityId}_${cat.name.trim().toLowerCase()}`;
          if (!existingSet.has(key)) {
            toInsert.push({
              name: cat.name,
              description: cat.description,
              university_id: universityId,
              created_at: now,
              updated_at: now,
            });
            existingSet.add(key);
          }
        }
      }

      if (toInsert.length > 0) {
        await queryInterface.bulkInsert('fee_type_categories', toInsert, { transaction });
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const categoryNames = ACADEMIC_FEE_CATEGORIES.map((c) => c.name);

      // Only delete seeded categories that are not currently in use by fee_type_catalog
      await queryInterface.sequelize.query(
        `DELETE FROM fee_type_categories
         WHERE name IN (:categoryNames)
           AND fee_type_category_id NOT IN (
             SELECT DISTINCT fee_type_category_id 
             FROM fee_type_catalog 
             WHERE fee_type_category_id IS NOT NULL
           )`,
        {
          replacements: { categoryNames },
          transaction,
        }
      );
    });
  },
};
