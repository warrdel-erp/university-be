import * as acedmicYearCreationService from '../repository/acedmicYearRepository.js';
import { requestContext } from '../utility/requestContext.js';
import { addBulkElectiveSubject, getSingleElectiveSubjectByAcedmicId } from '../repository/electiveSubjectRepository.js';
import { getAllSubject, subjectBulkCreate } from '../repository/mainRepository.js';
import { addBulkSession, getSessionDetailsByAcedmic } from '../repository/sessionRepository.js';

async function upsertAndActivateAcedmicYear(acedmicYearData, updatedBy) {
    const { yearTitle, startingDate, endingDate } = acedmicYearData;
    const { universityId, instituteId } = requestContext.getStore() ?? {};

    if (!universityId || !instituteId) {
        throw new Error('Active university and institute are required');
    }

    const activatePayload = {
        startingDate,
        endingDate,
        updatedBy,
        isActive: true,
    };

    await acedmicYearCreationService.deactivateAllAcedmicYears(updatedBy);

    const forInstitute = await acedmicYearCreationService.getSingleacedmicYearDetailsByTitle(yearTitle);
    if (forInstitute) {
        const acedmicYearId = forInstitute.acedmicYearId ?? forInstitute.dataValues?.acedmicYearId;
        await acedmicYearCreationService.updateacedmicYear(acedmicYearId, activatePayload);
        return acedmicYearCreationService.getSingleacedmicYearDetails(acedmicYearId);
    }

    const withoutInstitute = await acedmicYearCreationService.findByYearTitleAndUniversityWithoutInstitute(
        yearTitle,
        universityId,
    );
    if (withoutInstitute) {
        const acedmicYearId = withoutInstitute.acedmicYearId ?? withoutInstitute.dataValues?.acedmicYearId;
        const claimed = await acedmicYearCreationService.claimUniversityAcedmicYear(
            acedmicYearId,
            universityId,
            { ...activatePayload, instituteId },
        );
        if (claimed) {
            return claimed;
        }
    }

    return acedmicYearCreationService.addacedmicYear({
        yearTitle,
        ...activatePayload,
    });
}

/** Create or update by yearTitle — always activates for the active institute. */
export async function addacedmicYear(acedmicYearData, updatedBy) {
    return upsertAndActivateAcedmicYear(acedmicYearData, updatedBy);
}

export async function getacedmicYearDetails() {
    return await acedmicYearCreationService.getacedmicYearDetails();
}

export async function getSingleacedmicYearDetailsByTitle(yearTitle) {
    return await acedmicYearCreationService.getSingleacedmicYearDetailsByTitle(yearTitle);
}

export async function updateacedmicYear(acedmicYearId, acedmicYearData, updatedBy) {
    const {
        instituteId: _instituteId,
        universityId: _universityId,
        acedmicYearId: _id,
        isActive: _isActive,
        ...updateData
    } = acedmicYearData;
    updateData.updatedBy = updatedBy;
    return await acedmicYearCreationService.updateacedmicYear(acedmicYearId, updateData);
}

export async function deleteacedmicYear(acedmicYearId) {
    return await acedmicYearCreationService.deleteacedmicYear(acedmicYearId);
}

export async function getActiveAcedmicYearByInstitute() {
    const instituteId = requestContext.getStore()?.instituteId;
    if (!instituteId) {
        throw new Error('Active institute is required');
    }
    return acedmicYearCreationService.getActiveAcedmicYearByInstitute(instituteId);
}

export async function newActivateAndCopyData(data, updatedBy) {
    const { copyAcedmicYearId, copyData, ...activateData } = data;

    const created = await upsertAndActivateAcedmicYear(activateData, updatedBy);

    if (!copyAcedmicYearId || !Array.isArray(copyData) || copyData.length === 0) {
        return created;
    }

    const acedmicYearId = created.acedmicYearId ?? created.dataValues?.acedmicYearId;

    for (const dataType of copyData) {
        switch (dataType) {
            case 'subject': {
                const subjects = await getAllSubject(copyAcedmicYearId);
                const newSubjects = subjects.map((subject) => ({
                    ...subject.get({ plain: true }),
                    acedmicYearId,
                    updated_by: updatedBy,
                    subjectId: undefined,
                }));
                await subjectBulkCreate(newSubjects);
                break;
            }
            case 'electiveSubject': {
                const electives = await getSingleElectiveSubjectByAcedmicId(copyAcedmicYearId);
                const newElectives = electives.map((item) => ({
                    ...item.get({ plain: true }),
                    acedmicYearId,
                    updatedBy,
                    electiveSubjectId: undefined,
                }));
                await addBulkElectiveSubject(newElectives);
                break;
            }
            case 'session': {
                const sessions = await getSessionDetailsByAcedmic(copyAcedmicYearId);
                const newSessions = sessions.map((item) => ({
                    ...item.get({ plain: true }),
                    acedmicYearId,
                    updatedBy,
                    sessionId: undefined,
                }));
                await addBulkSession(newSessions);
                break;
            }
            default:
                console.warn(`Unknown data type: ${dataType}`);
        }
    }

    return created;
}
