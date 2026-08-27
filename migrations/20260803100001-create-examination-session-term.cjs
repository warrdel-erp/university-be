'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('examination_session_term', {
      examination_session_term_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      examination_session_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'examination_session',
          key: 'examination_session_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      class_section_term_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'class_section_term',
          key: 'class_section_term_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      include_electives: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      remarks: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('examination_session_term', ['examination_session_id', 'class_section_term_id'], {
      unique: true,
      name: 'unique_examination_session_class_section_term',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('examination_session_term');
  },
};
