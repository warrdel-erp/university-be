'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the 'term' column to the 'class' table
    await queryInterface.addColumn('class', 'term', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'semester_id'
    });

    // Populate existing records by extracting the number from the associated semester name
    try {
      // Fetch all classes and their associated semester names
      // Since we don't have access to models here easily, we use raw SQL
      const [results] = await queryInterface.sequelize.query(`
        SELECT c.class_id, s.name 
        FROM class c
        JOIN semester s ON c.semester_id = s.semester_id
      `);

      for (const row of results) {
        if (row.name) {
          // Extract the last number from the name string (e.g., "SEM 1" -> 1, "Tri 3" -> 3)
          const match = row.name.match(/(\d+)(?!.*\d)/);
          if (match) {
            const termNumber = parseInt(match[0], 10);
            await queryInterface.sequelize.query(`
              UPDATE class SET term = ? WHERE class_id = ?
            `, {
              replacements: [termNumber, row.class_id]
            });
          }
        }
      }
    } catch (error) {
      console.error('Error populating term column in class migration:', error);
      // We don't throw here to allow the migration to complete even if data population fails
      // as the schema change (addColumn) happened first.
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('class', 'term');
  }
};
