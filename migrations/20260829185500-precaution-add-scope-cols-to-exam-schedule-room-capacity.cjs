'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'exam_schedule_room_capacity';

    // Helper function to safely add a column if it doesn't already exist
    const addColumnIfNotExists = async (column, referenceModel, referenceKey) => {
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
        console.error(`Error checking/adding column ${column}:`, error.message);
      }
    };

    // Safely attempt to add the scope columns
    await addColumnIfNotExists('university_id', 'university', 'university_id');
    await addColumnIfNotExists('institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
  },

  async down(queryInterface, Sequelize) {
    // As per your request ("do not delete"), the down migration is intentionally 
    // left as a no-op to ensure no data is accidentally wiped if this is rolled back.
    console.log("Precautionary down migration is a no-op to prevent data loss.");
  }
};
