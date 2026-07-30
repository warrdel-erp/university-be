'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add the class_section_term_id column
    await queryInterface.addColumn('academic_group_scope', 'class_section_term_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'class_section_term',
        key: 'class_section_term_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // 2. Populate the class_section_term_id for existing rows
    // We fetch scopes that have course_id, session_id, and term set
    const [scopes] = await queryInterface.sequelize.query(`
      SELECT academic_group_scope_id, course_id, session_id, term 
      FROM academic_group_scope 
      WHERE course_id IS NOT NULL 
        AND session_id IS NOT NULL 
        AND term IS NOT NULL
        AND class_section_term_id IS NULL;
    `);

    if (scopes && scopes.length > 0) {
      for (const scope of scopes) {
        // Fetch the matching class_sections_id from class_sections
        const [sections] = await queryInterface.sequelize.query(`
          SELECT class_sections_id 
          FROM class_sections 
          WHERE course_id = ${scope.course_id} 
            AND session_id = ${scope.session_id} 
          LIMIT 1;
        `);

        if (sections && sections.length > 0) {
          const sectionId = sections[0].class_sections_id;
          
          // Fetch the matching class_section_term_id from class_section_term
          const [terms] = await queryInterface.sequelize.query(`
            SELECT class_section_term_id 
            FROM class_section_term 
            WHERE class_sections_id = ${sectionId} 
              AND term = ${scope.term} 
            LIMIT 1;
          `);

          if (terms && terms.length > 0) {
            const termId = terms[0].class_section_term_id;
            
            // Update the scope with the found termId
            await queryInterface.sequelize.query(`
              UPDATE academic_group_scope 
              SET class_section_term_id = ${termId} 
              WHERE academic_group_scope_id = ${scope.academic_group_scope_id};
            `);
          }
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('academic_group_scope', 'class_section_term_id');
  },
};
