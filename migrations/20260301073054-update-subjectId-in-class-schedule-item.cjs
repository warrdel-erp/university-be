'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      UPDATE class_schedule_item csi
      JOIN teacher_subject_mapping tsm ON csi.teacher_subject_mapping_id = tsm.teacher_subject_mapping_id
      JOIN class_subject_mapper csm ON tsm.class_subject_mapper_id = csm.class_subject_mapper_id
      SET csi.subject_id = csm.subject_id
      WHERE csi.teacher_subject_mapping_id IS NOT NULL;
    `);
    },

    async down(queryInterface, Sequelize) {
        // If you ever need to revert, we would potentially set subject_id back to null for those rows,
        // though this is data loss, here is the commented query just in case.
        /*
        await queryInterface.sequelize.query(`
          UPDATE class_schedule_item
          SET subject_id = NULL
          WHERE teacher_subject_mapping_id IS NOT NULL;
        `);
        */
    }
};
