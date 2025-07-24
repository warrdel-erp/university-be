import * as studentInvoice  from "../repository/studentInvoiceRepository.js";
import sequelize from '../database/sequelizeConfig.js';
import { updateStudentfeeStatus } from "../repository/studentRepository.js";

export async function getStudentCount(type, universityId, instituteId,role) {
  return await studentInvoice.getStudentCount(type, universityId, instituteId,role)
};

export async function updateInvoices(universityId, data) {
  try {
    const updatePromises = data.map(async (item) => {
      const { studentId, feeNewInvoiceId, invoiceDate, invoiceNumber } = item;

      await studentInvoice.updateFeeNewInvoice(feeNewInvoiceId,{ invoiceStatus:true, invoiceDate, invoiceNumber });
      await updateStudentfeeStatus(studentId,{ feeStatus :true });
    });

    await Promise.all(updatePromises);

    return {
      message: 'Invoices and students updated successfully.',
      updated: data.length
    };
  } catch (error) {
    console.error('Error in activateInvoices service:', error);
    throw error;
  }
}

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