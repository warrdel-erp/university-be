'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create the table
    await queryInterface.createTable('curriculum_batch_term_mapping', {
      curriculum_batch_term_mapping_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      curriculum_batch_mapping_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'curriculum_batch_mapping',
          key: 'curriculum_batch_mapping_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      term: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      year_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        }
      }
    });

    // 2. Backfill existing data
    const mappings = await queryInterface.sequelize.query(
      `SELECT cbm.curriculum_batch_mapping_id, cbm.batch, cbm.created_by, cbm.curriculum_id,
              c.course_id, co.term_type, co.total_terms, co.course_duration
       FROM curriculum_batch_mapping cbm
       JOIN curriculum c ON cbm.curriculum_id = c.curriculum_id
       JOIN course co ON c.course_id = co.course_id`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const courseTerms = await import('../utility/courseTerms.js');
    
    const recordsToInsert = [];
    for (const row of mappings) {
        const course = {
            totalTerms: row.total_terms,
            courseDuration: row.course_duration,
            termType: row.term_type
        };

        const totalTerms = courseTerms.resolveTotalTerms(course);
        const batch = row.batch;

        for (let term = 1; term <= totalTerms; term++) {
            const yearNum = courseTerms.yearFromTerm(term, course);
            const calcYear = batch + yearNum - 1;

            recordsToInsert.push({
                curriculum_batch_mapping_id: row.curriculum_batch_mapping_id,
                term: term,
                year_number: yearNum,
                year: calcYear,
                created_by: row.created_by,
                created_at: new Date(),
                updated_at: new Date()
            });
        }
    }

    if (recordsToInsert.length > 0) {
        await queryInterface.bulkInsert('curriculum_batch_term_mapping', recordsToInsert);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('curriculum_batch_term_mapping');
  }
};
