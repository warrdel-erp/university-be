'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('class_section_term');

      if (!table.university_id) {
        await queryInterface.addColumn(
          'class_section_term',
          'university_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'university', key: 'university_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          { transaction },
        );
      }

      if (!table.institute_id) {
        await queryInterface.addColumn(
          'class_section_term',
          'institute_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'institute', key: 'institute_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `
        UPDATE class_section_term cst
        INNER JOIN class_sections cs ON cs.class_sections_id = cst.class_sections_id
        INNER JOIN course c ON c.course_id = cs.course_id
        SET
          cst.university_id = COALESCE(cst.university_id, c.university_id),
          cst.institute_id = COALESCE(cst.institute_id, cs.institute_id, c.institute_id)
        WHERE cst.university_id IS NULL OR cst.institute_id IS NULL
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('class_section_term');
      if (table.institute_id) {
        await queryInterface.removeColumn('class_section_term', 'institute_id', { transaction });
      }
      if (table.university_id) {
        await queryInterface.removeColumn('class_section_term', 'university_id', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
