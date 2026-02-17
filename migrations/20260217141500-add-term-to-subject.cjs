'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // 1. Add the 'term' column to the 'subject' table
            await queryInterface.addColumn('subject', 'term', {
                type: Sequelize.INTEGER,
                allowNull: true,
                after: 'subject_type'
            }, { transaction });

            // 2. Populate existing records
            // Fetch subjects and their associated semester names
            const [results] = await queryInterface.sequelize.query(`
        SELECT s.subject_id, sem.name 
        FROM subject s
        JOIN class_subject_mapper csm ON s.subject_id = csm.subject_id
        JOIN semester sem ON csm.semester_id = sem.semester_id
        WHERE sem.deleted_at IS NULL 
          AND csm.deleted_at IS NULL 
          AND s.deleted_at IS NULL
      `, { transaction });

            // Use a Map to handle subjects with multiple mappings
            const subjectTermMap = new Map();

            for (const row of results) {
                if (row.name && !subjectTermMap.has(row.subject_id)) {
                    // Extract the first number found in the name (e.g., "Sem 1" -> 1, "Tri 3" -> 3)
                    const match = row.name.match(/\d+/);
                    if (match) {
                        subjectTermMap.set(row.subject_id, parseInt(match[0], 10));
                    }
                }
            }

            // Perform updates
            for (const [subjectId, termNumber] of subjectTermMap.entries()) {
                await queryInterface.sequelize.query(`
          UPDATE subject SET term = ? WHERE subject_id = ?
        `, {
                    replacements: [termNumber, subjectId],
                    transaction
                });
            }

            await transaction.commit();
            console.log(`Successfully updated term for ${subjectTermMap.size} subjects.`);
        } catch (error) {
            await transaction.rollback();
            console.error('Error populating term column in subject migration:', error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('subject', 'term');
    }
};
