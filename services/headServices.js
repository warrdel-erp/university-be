import * as headCreationService from "../repository/headRepository.js";
import * as instituteRepository from "../repository/instituteRepository.js";
import * as registerRepository from "../repository/userRepository.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import sequelize from "../database/sequelizeConfig.js";
import { requestContext } from "../utility/requestContext.js";

function getActiveInstituteId() {
  const instituteId = requestContext.getStore()?.instituteId;
  if (!instituteId) {
    throw new Error("Active institute is required. Save your default institute via PUT /user/saveUserDefaults.");
  }
  return instituteId;
}

export async function addHead(headData, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const { headName, mobileNumber, registerEmail, alternateEmail } = headData;
    const instituteId = getActiveInstituteId();

    const institute = await instituteRepository.getInstituteById(instituteId);
    if (!institute) {
      throw new Error("Institute not found for your active institute");
    }

    const campusId = institute.campusId ?? institute.dataValues?.campusId;
    const universityId = institute.universityId ?? institute.dataValues?.universityId;

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(alternateEmail, salt);

    Object.assign(headData, {
      createdBy,
      updatedBy,
      universityId,
      instituteId,
      campusId,
    });

    const userPayload = {
      userName: headName,
      universityId,
      password: hashedPassword,
      phone: mobileNumber,
      email: registerEmail.toLowerCase(),
      uniqueId: uuidv4(),
      role: "Head",
      instituteId,
    };

    const user = await registerRepository.headRegister(userPayload, transaction);
    const head = await headCreationService.addHead(headData, transaction);

    await transaction.commit();
    return { head, user };
  } catch (error) {
    await transaction.rollback();
    console.error("Error in addHead:", error);
    throw new Error(error.message || "Failed to add head. Please try again.");
  }
}

export async function getHeadDetails() {
  return await headCreationService.getHeadDetails();
}

export async function getSingleHeadDetails(headId) {
  return await headCreationService.getSingleHeadDetails(headId);
}

export async function deleteHead(headId) {
  return await headCreationService.deleteHead(headId);
}

export async function updateHead(headId, headData, updatedBy) {
  const {
    campusId: _campusId,
    instituteId: _instituteId,
    universityId: _universityId,
    headId: _headId,
    ...updateData
  } = headData;
  updateData.updatedBy = updatedBy;
  await headCreationService.updateHead(headId, updateData);
}
