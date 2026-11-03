'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE curriculum_subject_term_mapping 
         ADD COLUMN subject_component_mapping_id INT NULL,
         ADD CONSTRAINT fk_cstm_scm 
         FOREIGN KEY (subject_component_mapping_id) 
         REFERENCES subject_component_mapping(id) 
         ON UPDATE CASCADE ON DELETE SET NULL,
         ADD COLUMN curriculum_category_id INT NULL,
         ADD CONSTRAINT fk_cstm_cc
         FOREIGN KEY (curriculum_category_id)
         REFERENCES curriculum_category(id)
         ON UPDATE CASCADE ON DELETE SET NULL;`,
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE curriculum_subject_term_mapping 
         DROP FOREIGN KEY fk_cstm_scm,
         DROP COLUMN subject_component_mapping_id,
         DROP FOREIGN KEY fk_cstm_cc,
         DROP COLUMN curriculum_category_id;`,
        { transaction: t }
      );
    });
  },
};
