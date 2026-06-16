import * as headCreationService from "../repository/headRepository.js";
import * as campusRepository from "../repository/campusRepository.js";
import * as instituteRepository from "../repository/instituteRepository.js";
import * as registerRepository from "../repository/userRepository.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import sequelize from "../database/sequelizeConfig.js";

export async function addHead(headData, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    const { headName, mobileNumber, registerEmail, alternateEmail, instituteId, campusId } = headData;

    const campus = await campusRepository.getCampusById(campusId);
    if (!campus) {
      throw new Error("Campus not found or does not belong to this university");
    }

    const institute = await instituteRepository.getInstituteByCampusAndId(campusId, instituteId);
    if (!institute) {
      throw new Error("Institute not found for this campus and university");
    }

    const universityId = campus.universityId ?? campus.dataValues?.universityId;

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(alternateEmail, salt);

    Object.assign(headData, {
      createdBy,
      updatedBy,
      universityId,
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
  headData.updatedBy = updatedBy;
  await headCreationService.updateHead(headId, headData);
}
