'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE time_table_cell 
         ADD COLUMN subject_component_mapping_id INT NULL,
         ADD CONSTRAINT fk_time_table_cell_scm 
         FOREIGN KEY (subject_component_mapping_id) 
         REFERENCES subject_component_mapping(id) 
         ON UPDATE CASCADE ON DELETE SET NULL;`,
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE time_table_cell 
         DROP FOREIGN KEY fk_time_table_cell_scm,
         DROP COLUMN subject_component_mapping_id;`,
        { transaction: t }
      );
    });
  },
};

