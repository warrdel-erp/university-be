import * as model from "../models/index.js";
import { Op } from "sequelize";
import { scoped } from "../utility/scoped.js";

/**
 * Bulk approve students whose current status is REVIEW.
 * Updates status to APPROVED and sets approval audit fields.
 * Returns [numberOfAffectedRows].
 */
export async function bulkApproveEligibility(examinationSessionId, studentIds, userId, options = {}) {
    try {
        const [affectedCount] = await model.examinationSessionEligibilityModel.update(
            {
                status: 'APPROVED',
                approvedBy: userId,
                approvedAt: new Date(),
                updatedBy: userId
            },
            {
                where: {
                    examinationSessionId,
                    studentId: {
                        [Op.in]: studentIds
                    },
                    status: 'REVIEW'
                },
                ...options
            }
        );
        return affectedCount;
    } catch (error) {
        console.error("Error in bulkApproveEligibility:", error);
        throw error;
    }
}

/**
 * Fetch eligible student IDs (READY or APPROVED) for a given examination session.
 * Optionally filter by a specific list of student IDs.
 * Checks for BLOCKED/REVIEW statuses to throw explicit errors if specific students were requested.
 */
export async function getEligibleStudentIdsForGeneration(examinationSessionId, requestedStudentIds = null, options = {}) {
    try {
        const whereClause = { 
            examinationSessionId,
            status: { [Op.in]: ['READY', 'APPROVED'] }
        };
        
        if (requestedStudentIds && requestedStudentIds.length > 0) {
            whereClause.studentId = { [Op.in]: requestedStudentIds };
        }

        const records = await model.examinationSessionEligibilityModel.findAll({
            where: whereClause,
            attributes: ['studentId'],
            ...options
        });

        return records.map(r => r.studentId);
    } catch (error) {
        console.error("Error in getEligibleStudentIdsForGeneration:", error);
        throw error;
    }
}

/**
 * Fetch a single student's eligibility record for an examination session.
 */
export async function getSingleEligibilityRecord(examinationSessionId, studentId, options = {}) {
    try {
        const record = await model.examinationSessionEligibilityModel.findOne({
            where: {
                examinationSessionId,
                studentId
            },
            ...options
        });
        return record;
    } catch (error) {
        console.error("Error in getSingleEligibilityRecord:", error);
        throw error;
    }
}

/**
 * Fetches existing eligibility records and returns a map of studentId -> status.
 */
export async function getEligibilityStatusesMap(examinationSessionId, options = {}) {
    try {
        const existingRecords = await model.examinationSessionEligibilityModel.findAll({
            where: { examinationSessionId },
            attributes: ['studentId', 'status'],
            ...options
        });

        const existingMap = new Map();
        existingRecords.forEach(r => existingMap.set(r.studentId, r.status));
        return existingMap;
    } catch (error) {
        console.error("Error in getEligibilityStatusesMap:", error);
        throw error;
    }
}

/**
 * Fetches existing eligibility records (only studentId, status).
 * Creates entries for any missing students.
 * Returns a map of studentId -> status.
 */
export async function syncEligibilityRecords(examinationSessionId, studentsData, options = {}) {
    try {
        const existingRecords = await model.examinationSessionEligibilityModel.findAll({
            where: { examinationSessionId },
            attributes: ['studentId', 'status'],
            ...options
        });

        const existingMap = new Map();
        existingRecords.forEach(r => existingMap.set(r.studentId, r.status));

        const recordsToCreate = [];

        for (const student of studentsData) {
            if (!existingMap.has(student.studentId)) {
                recordsToCreate.push({
                    universityId: student.universityId,
                    instituteId: student.instituteId,
                    academicYearId: student.academicYearId,
                    studentId: student.studentId,
                    examinationSessionId: Number(examinationSessionId),
                    status: student.calculatedStatus === 'Ready' ? 'READY' : 'REVIEW',
                    reviewReason: student.calculatedStatus !== 'Ready' ? student.reviewReason : null
                });
                // Optimistically add to map
                existingMap.set(student.studentId, student.calculatedStatus === 'Ready' ? 'READY' : 'REVIEW');
            }
        }

        if (recordsToCreate.length > 0) {
            await model.examinationSessionEligibilityModel.bulkCreate(recordsToCreate, { ...options });
        }

        return existingMap;
    } catch (error) {
        console.error("Error in syncEligibilityRecords:", error);
        throw error;
    }
}

export async function bulkCreateRecords(records, options = {}) {
    try {
        return await model.examinationSessionEligibilityModel.bulkCreate(records, {
            ignoreDuplicates: true,
            ...options
        });
    } catch (error) {
        console.error("Error in bulkCreateRecords:", error);
        throw error;
    }
}