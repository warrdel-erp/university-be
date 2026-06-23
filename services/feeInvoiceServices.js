import * as feeInvoiceCreationService from "../repository/feeInvoiceRepository.js";
import * as FeeInvoiceDetailsCreationService from "../repository/feeInvoiceDetailsRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import moment from "moment";

export async function addFeeInvoice(feeInvoiceData, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();
  let feeInvoiceDetails = [];
  const classStudentMapperId = feeInvoiceData.classStudentMapperId;

  try {
    const getStudent = await feeInvoiceCreationService.getStudentIdByClassStudentMapper(
      classStudentMapperId,
      { transaction }
    );
    if (!getStudent) {
      throw new Error("Class student mapper not found");
    }
    const studentId = getStudent.studentId;

    const feeInvoicePayload = {
      ...feeInvoiceData,
      studentId,
      createdBy,
      updatedBy,
    };

    const feeInvoice = await feeInvoiceCreationService.addFeeInvoice(feeInvoicePayload, transaction);
    const feeInvoiceId = feeInvoice.feeInvoiceId;

    for (const slab of feeInvoiceData.slab) {
      const latestInvoiceDetailNumber = await getInvoiceDetailNumber();

      const feeInvoiceDetailsData = {
        ...slab,
        createdBy,
        updatedBy,
        feeInvoiceId,
        invoiceDetailNumber: latestInvoiceDetailNumber,
      };
      feeInvoiceDetails = await FeeInvoiceDetailsCreationService.addFeeInvoiceDetails(
        feeInvoiceDetailsData,
        transaction
      );
    }

    await transaction.commit();
    return { feeInvoice, feeInvoiceDetails };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getFeeInvoiceDetails(filters = {}) {
  return feeInvoiceCreationService.getFeeInvoiceDetails(filters);
}

export async function getSingleFeeInvoiceDetails(feeInvoiceId) {
  return feeInvoiceCreationService.getSingleFeeInvoiceDetails(feeInvoiceId);
}

export async function updateFeeInvoice(feeInvoiceId, feeInvoiceData, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const feeInvoicePayload = { ...feeInvoiceData, updatedBy };
    const [updatedCount] = await feeInvoiceCreationService.updateFeeInvoice(
      feeInvoiceId,
      feeInvoicePayload,
      transaction
    );
    if (!updatedCount) {
      throw new Error("Fee invoice not found");
    }

    for (const slab of feeInvoiceData.slab) {
      const feeInvoiceDetailsData = {
        ...slab,
        updatedBy,
        feeInvoiceId,
      };
      await FeeInvoiceDetailsCreationService.updateFeeInvoiceDetails(
        slab.feeInvoiceDetailsId,
        feeInvoiceDetailsData,
        transaction
      );
    }

    await transaction.commit();
    return { success: true, message: "Fee invoice updated successfully." };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function deleteFeeInvoice(feeInvoiceId) {
  return feeInvoiceCreationService.deleteFeeInvoice(feeInvoiceId);
}

export async function getInvoiceNumber() {
  const getInstitueCodeDetail = await feeInvoiceCreationService.findInstituteCodeForScope();
  if (!getInstitueCodeDetail) {
    throw new Error("Institute not found");
  }
  const institueCode = getInstitueCodeDetail.get("institute_code");
  const latestInvoiceNumber = await feeInvoiceCreationService.latestInoviceNumber(institueCode);
  const previousInvoiceNumber = latestInvoiceNumber ? latestInvoiceNumber.get("invoice_number") : null;
  let invoiceNumber;
  if (previousInvoiceNumber) {
    const invoiceNumberParts = previousInvoiceNumber.split("-");
    if (invoiceNumberParts.length === 3) {
      const year = invoiceNumberParts[1];
      const suffixNumber = parseInt(invoiceNumberParts[2], 10) + 1;
      const paddedSuffix = String(suffixNumber).padStart(2, "0");

      invoiceNumber = `${institueCode}-${year}-${paddedSuffix}`;
    } else {
      throw new Error("Invalid invoice number format");
    }
  } else {
    const yearLastTwoDigits = moment().format("YY");
    invoiceNumber = `${institueCode}-${yearLastTwoDigits}-01`;
  }
  return invoiceNumber;
}

export async function getInvoiceDetailNumber() {
  const getInstitueCodeDetail = await feeInvoiceCreationService.findInstituteCodeForScope();
  if (!getInstitueCodeDetail) {
    throw new Error("Institute not found");
  }
  const institueCode = getInstitueCodeDetail.get("institute_code");
  const latestInvoiceNumber = await feeInvoiceCreationService.latestInvoiceDetailNumber(institueCode);
  const previousInvoiceNumber = latestInvoiceNumber
    ? latestInvoiceNumber.get("invoice_detail_number")
    : null;
  let invoiceNumber;
  if (previousInvoiceNumber) {
    const invoiceNumberParts = previousInvoiceNumber.split("-");
    if (invoiceNumberParts.length === 3) {
      const suffixNumber = parseInt(invoiceNumberParts[2], 10) + 1;
      const paddedSuffix = String(suffixNumber).padStart(2, "0");

      invoiceNumber = `${institueCode}-${paddedSuffix}`;
    } else {
      throw new Error("Invalid invoice detail number");
    }
  } else {
    invoiceNumber = `${institueCode}-10001`;
  }
  return invoiceNumber;
}
