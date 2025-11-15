import * as studentInvoice  from "../repository/studentInvoiceRepository.js";
import sequelize from '../database/sequelizeConfig.js';
import { updateStudentfeeStatus } from "../repository/studentRepository.js";
import { getInvoiceNumber } from "./feeInvoiceServices.js";

export async function getStudentCount(type, universityId, instituteId,role) {
  return await studentInvoice.getStudentCount(type, universityId, instituteId,role)
};

// export async function updateInvoices(universityId,instituteId, data) {
//   const latestInvoiceNumber = await getInvoiceNumber(instituteId)
//   console.log(`>>>>latestInvoiceNumber>`,latestInvoiceNumber)
//   console.log(`>>>>data`,data);
//   try {
//     const updatePromises = data.map(async (item) => {
//       const { studentId, feeNewInvoiceId, invoiceDate, invoiceNumber } = item;

//       await studentInvoice.updateFeeNewInvoice(feeNewInvoiceId,{ invoiceStatus:true, invoiceDate, invoiceNumber });
//       await updateStudentfeeStatus(studentId,{ feeStatus :true });
//     });

//     await Promise.all(updatePromises);

//     return {
//       message: 'Invoices and students updated successfully.',
//       updated: data.length
//     };
//   } catch (error) {
//     console.error('Error in activateInvoices service:', error);
//     throw error;
//   }
// }

export async function updateInvoices(universityId, instituteId, data) {
  let latestInvoiceNumber = await getInvoiceNumber(instituteId);

  try {
    const invoiceParts = latestInvoiceNumber.split('-');
    const prefix = `${invoiceParts[0]}-${invoiceParts[1]}`;
    let currentNumber = parseInt(invoiceParts[2], 10); 

    const updatePromises = data.map(async (item, index) => {
      const { studentId, feeNewInvoiceId, invoiceDate } = item;

      const paddedNumber = String(currentNumber).padStart(2, '0');
      const invoiceNumber = `${prefix}-${paddedNumber}`;
      currentNumber += 1; 

      await studentInvoice.updateFeeNewInvoice(feeNewInvoiceId, {
        invoiceStatus: true,
        invoiceDate,
        invoiceNumber
      });

      await updateStudentfeeStatus(studentId, { feeStatus: true });
    });

    await Promise.all(updatePromises);

    return {
      message: 'Invoices and students updated successfully.',
      updated: data.length
    };
  } catch (error) {
    console.error('Error in updateInvoices service:', error);
    throw error;
  }
};

export async function addStudentSpecificInvoice(universityId, createdBy, updatedBy, instituteId, data) {
    const transaction = await sequelize.transaction();

    try {
        const invoiceData = {
            studentId: data.studentId,
            invoiceDate: data.invoiceDate,
            invoiceNumber: data.invoiceNumber,
            dueDate: data.dueDate,
            invoiceStatus: true,
            createdBy,
            updatedBy,
            instituteId,
            universityId
        };

        const invoice = await studentInvoice.addStudentSpecificInvoice(invoiceData, transaction);
        const studentInvoiceMapperId = invoice.studentInvoiceMapperId;

        const feeTypeArray = data.feeTypes.map((ft) => ({
            feeTypeId: ft.feeTypeId,
            amount: ft.Amount,
            waiver: ft.waiver,
            subtotal: ft.subTotal,
            studentInvoiceMapperId,
            createdBy,
            updatedBy
        }));

        await studentInvoice.addMultipleFeeTypeGroup(feeTypeArray, transaction);
        await transaction.commit();

        return {
            status: true,
            message: "Invoice created successfully",
            studentInvoiceMapperId
        };

    } catch (error) {
        await transaction.rollback();
        throw new Error(error.message);
    }
};

export async function getAllActiveInvoice(universityId) {
    return await studentInvoice.getAllActiveInvoice(universityId);
}

// export async function updateFeePlan(poId, data, updatedBy) {    
//         data.updatedBy = updatedBy;
//        return await feePlan.updateFeePlan(poId, data);
// }

// export async function deleteFeePlan(poId) {
//     return await feePlan.deleteFeePlan(poId);
// }