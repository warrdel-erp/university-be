'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper function to safely add a column if it doesn't exist
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      try {
        const desc = await queryInterface.describeTable(table);
        if (!desc[column]) {
          await queryInterface.addColumn(table, column, {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: referenceModel,
              key: referenceKey
            }
          });
          console.log(`Successfully added column ${column} to ${table}`);
        } else {
          console.log(`Precaution: Column ${column} already exists in ${table}. Skipping.`);
        }
      } catch (error) {
        console.error(`Error checking/adding column ${column} in ${table}:`, error.message);
      }
    };

    // Safely add the missing acedmic_year_id column to the tables experiencing the 500 error
    await addColumnIfNotExists('exam_setup_type', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('students', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
  },

  async down(queryInterface, Sequelize) {
    // Left as a no-op to ensure we do not accidentally drop columns that might have production data
    console.log("Precautionary down migration is a no-op to prevent data loss.");
  }
};
