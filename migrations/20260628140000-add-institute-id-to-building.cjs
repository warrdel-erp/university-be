'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'building',
        'institute_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'institute',
            key: 'institute_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE building b
        INNER JOIN (
          SELECT campus_id, MIN(institute_id) AS institute_id
          FROM institute
          GROUP BY campus_id
        ) i ON i.campus_id = b.campus_id
        SET b.institute_id = i.institute_id
        WHERE b.institute_id IS NULL
        `,
        { transaction },
      );

      await queryInterface.changeColumn(
        'building',
        'institute_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'institute',
            key: 'institute_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('building', 'institute_id');
  },
};
