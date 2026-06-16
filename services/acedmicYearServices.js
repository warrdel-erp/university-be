import * as acedmicYearCreationService from '../repository/acedmicYearRepository.js';
import { addBulkCourse, getCourseByAcedmicId } from '../repository/courseRepository.js';
import { addBulkElectiveSubject, getSingleElectiveSubjectByAcedmicId } from '../repository/electiveSubjectRepository.js';
import { getAllSubject, subjectBulkCreate } from '../repository/mainRepository.js';
import { addBulkSession, getSessionDetailsByAcedmic } from '../repository/sessionRepository.js';

export async function addacedmicYear(acedmicYearData, createdBy, updatedBy) {
    acedmicYearData.createdBy = createdBy;
    acedmicYearData.updatedBy = updatedBy;
    return await acedmicYearCreationService.addacedmicYear(acedmicYearData);
}

export async function getacedmicYearDetails(universityId, instituteId) {
    return await acedmicYearCreationService.getacedmicYearDetails(universityId, instituteId);
}

export async function getSingleacedmicYearDetails(acedmicYearId) {
    return await acedmicYearCreationService.getSingleacedmicYearDetails(acedmicYearId);
}

export async function getSingleacedmicYearDetailsByTitle(yearTitle) {
    return await acedmicYearCreationService.getSingleacedmicYearDetailsByTitle(yearTitle);
}

export async function updateacedmicYear(acedmicYearData, updatedBy, universityId, instituteId) {
    const { startingDate, endingDate } = acedmicYearData;

    const allAcedmicyear = await acedmicYearCreationService.getacedmicYearDetails(universityId, instituteId);
    const currentYear = new Date().getFullYear();

    for (const record of allAcedmicyear) {
        const { acedmicYearId, yearTitle } = record.dataValues;

        if (!yearTitle || !yearTitle.includes('-')) {
            console.warn(`Skipping record with ID ${acedmicYearId} due to invalid yearTitle: ${yearTitle}`);
            continue;
        }

        const [startYear, endYear] = yearTitle.split('-');

        const fullStartingDate = `${startYear}-${startingDate}`;
        const fullEndingDate = `${endYear}-${endingDate}`;
        const isActive = Number(startYear) === currentYear;

        const updatePayload = {
            startingDate: fullStartingDate,
            endingDate: fullEndingDate,
            isActive,
            updatedBy,
        };

        await acedmicYearCreationService.updateacedmicYear(acedmicYearId, updatePayload);
    }
}

export async function activateAcedmicYear(acedmicYearId, updatedBy, universityId, instituteId) {
    try {
        const allAcedmicyear = await acedmicYearCreationService.getacedmicYearDetails(universityId, instituteId);

        const currentIndex = allAcedmicyear.findIndex(
            (record) => record.dataValues.acedmicYearId === Number(acedmicYearId)
        );

        if (currentIndex === -1) {
            throw new Error(`Academic year with ID ${acedmicYearId} not found.`);
        }

        const updatePayload = {
            isActive: true,
            updatedBy,
        };

        await acedmicYearCreationService.updateacedmicYear(acedmicYearId, updatePayload);

        const nextRecord = allAcedmicyear[currentIndex + 1];
        if (nextRecord) {
            const nextAcedmicYearId = nextRecord.dataValues.acedmicYearId;
            await acedmicYearCreationService.updateacedmicYear(nextAcedmicYearId, updatePayload);
        }
    } catch (error) {
        console.error('Error in activateAcedmicYear:', error);
        throw error;
    }
}

export async function deleteacedmicYear(acedmicYearId) {
    return await acedmicYearCreationService.deleteacedmicYear(acedmicYearId);
}

export async function getAllActiveAcedmicYear(universityId, instituteId) {
    return await acedmicYearCreationService.getAllActiveAcedmicYear(universityId, instituteId);
}

export async function newActivateAndCopyData(data, universityId, instituteId, createdBy, updatedBy) {
    const { acedmicYearId, copyAcedmicYearId, copyData } = data;
    const updatePayload = {
        isActive: true,
        updatedBy,
    };
    try {
        if (!copyAcedmicYearId) {
            await acedmicYearCreationService.updateacedmicYear(acedmicYearId, updatePayload);
        } else if (copyAcedmicYearId && Array.isArray(copyData) && copyData.length > 0) {
            for (const dataType of copyData) {
                switch (dataType) {
                    case 'subject':
                        const subjects = await getAllSubject('', copyAcedmicYearId, '', '');
                        const newSubjects = subjects.map((subject) => ({
                            ...subject.get({ plain: true }),
                            acedmicYearId,
                            createdBy,
                            updated_by: updatedBy,
                            subjectId: undefined,
                        }));
                        await subjectBulkCreate(newSubjects);
                        break;

                    case 'electiveSubject':
                        const electives = await getSingleElectiveSubjectByAcedmicId(copyAcedmicYearId);
                        const newElectives = electives.map((item) => ({
                            ...item.get({ plain: true }),
                            acedmicYearId,
                            createdBy,
                            updatedBy,
                            electiveSubjectId: undefined,
                        }));
                        await addBulkElectiveSubject(newElectives);
                        break;

                    case 'session':
                        const sessions = await getSessionDetailsByAcedmic(copyAcedmicYearId);
                        const newSessions = sessions.map((item) => ({
                            ...item.get({ plain: true }),
                            acedmicYearId,
                            createdBy,
                            updatedBy,
                            sessionId: undefined,
                        }));
                        await addBulkSession(newSessions);
                        break;

                    default:
                        console.warn(`Unknown data type: ${dataType}`);
                }
            }

            await acedmicYearCreationService.updateacedmicYear(acedmicYearId, updatePayload);
        }
    } catch (error) {
        console.error('Error in copy data and academic year:', error);
        throw error;
    }
}
