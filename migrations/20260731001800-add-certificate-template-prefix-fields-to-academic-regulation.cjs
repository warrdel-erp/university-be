'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (!tableInfo.marksheet_template_id) await queryInterface.addColumn('academic_regulation', 'marksheet_template_id', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.transcript_template_id) await queryInterface.addColumn('academic_regulation', 'transcript_template_id', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.degree_certificate_template_id) await queryInterface.addColumn('academic_regulation', 'degree_certificate_template_id', { type: Sequelize.INTEGER, allowNull: true });
    if (!tableInfo.provisional_certificate_template_id) await queryInterface.addColumn('academic_regulation', 'provisional_certificate_template_id', { type: Sequelize.INTEGER, allowNull: true });

    if (!tableInfo.is_generate_transcript_automatically) await queryInterface.addColumn('academic_regulation', 'is_generate_transcript_automatically', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
    if (!tableInfo.is_generate_marksheet_automatically) await queryInterface.addColumn('academic_regulation', 'is_generate_marksheet_automatically', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false });
    if (!tableInfo.is_digital_signature_required) await queryInterface.addColumn('academic_regulation', 'is_digital_signature_required', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });
    if (!tableInfo.is_qr_verification_enabled) await queryInterface.addColumn('academic_regulation', 'is_qr_verification_enabled', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });

    if (!tableInfo.marksheet_prefix) await queryInterface.addColumn('academic_regulation', 'marksheet_prefix', { type: Sequelize.STRING(50), allowNull: true });
    if (!tableInfo.transcript_prefix) await queryInterface.addColumn('academic_regulation', 'transcript_prefix', { type: Sequelize.STRING(50), allowNull: true });
    if (!tableInfo.degree_prefix) await queryInterface.addColumn('academic_regulation', 'degree_prefix', { type: Sequelize.STRING(50), allowNull: true });

    if (!tableInfo.is_auto_numbering_enabled) await queryInterface.addColumn('academic_regulation', 'is_auto_numbering_enabled', { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true });
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.is_auto_numbering_enabled) await queryInterface.removeColumn('academic_regulation', 'is_auto_numbering_enabled');
    if (tableInfo.degree_prefix) await queryInterface.removeColumn('academic_regulation', 'degree_prefix');
    if (tableInfo.transcript_prefix) await queryInterface.removeColumn('academic_regulation', 'transcript_prefix');
    if (tableInfo.marksheet_prefix) await queryInterface.removeColumn('academic_regulation', 'marksheet_prefix');

    if (tableInfo.is_qr_verification_enabled) await queryInterface.removeColumn('academic_regulation', 'is_qr_verification_enabled');
    if (tableInfo.is_digital_signature_required) await queryInterface.removeColumn('academic_regulation', 'is_digital_signature_required');
    if (tableInfo.is_generate_marksheet_automatically) await queryInterface.removeColumn('academic_regulation', 'is_generate_marksheet_automatically');
    if (tableInfo.is_generate_transcript_automatically) await queryInterface.removeColumn('academic_regulation', 'is_generate_transcript_automatically');

    if (tableInfo.provisional_certificate_template_id) await queryInterface.removeColumn('academic_regulation', 'provisional_certificate_template_id');
    if (tableInfo.degree_certificate_template_id) await queryInterface.removeColumn('academic_regulation', 'degree_certificate_template_id');
    if (tableInfo.transcript_template_id) await queryInterface.removeColumn('academic_regulation', 'transcript_template_id');
    if (tableInfo.marksheet_template_id) await queryInterface.removeColumn('academic_regulation', 'marksheet_template_id');
  }
};
