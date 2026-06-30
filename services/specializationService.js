import * as specializationRepository from "../repository/specializationRepository.js";

function mapSpecializationRow(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    specializationId: plain.specializationId,
    specializationName: plain.specializationName,
    specializationCode: plain.specializationCode,
    courseId: plain.course_Id,
    instituteId: plain.instituteId,
    academicYearId: plain.academicYearId,
  };
}

export async function updateSpecialization(specializationId, body) {
  try {
    const data = {};
    if (body.specializationName !== undefined) data.specializationName = body.specializationName;
    if (body.specializationCode !== undefined) data.specializationCode = body.specializationCode;
    if (body.course_Id !== undefined) data.course_Id = body.course_Id;

    const row = await specializationRepository.updateSpecialization(specializationId, data);
    if (!row) {
      const error = new Error("Specialization not found");
      error.statusCode = 404;
      throw error;
    }
    return mapSpecializationRow(row);
  } catch (error) {
    console.error("Error in Specialization Service (updateSpecialization):", error);
    throw error;
  }
}
