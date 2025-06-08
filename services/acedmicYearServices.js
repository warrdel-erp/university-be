import * as acedmicYearCreationService  from "../repository/acedmicYearRepository.js";

export async function addacedmicYear(acedmicYearData, createdBy, updatedBy,universityId) {

        acedmicYearData.createdBy = createdBy;
        acedmicYearData.updatedBy = updatedBy;
        acedmicYearData.universityId = universityId;
        const acedmicYear = await acedmicYearCreationService.addacedmicYear(acedmicYearData);
        return acedmicYear;
};

export async function getacedmicYearDetails(universityId) {
    return await acedmicYearCreationService.getacedmicYearDetails(universityId);
}

export async function getSingleacedmicYearDetails(acedmicYearId,universityId) {
    return await acedmicYearCreationService.getSingleacedmicYearDetails(acedmicYearId,universityId);
}

export async function updateacedmicYear(acedmicYearData, updatedBy) {
  const { startingDate, endingDate } = acedmicYearData;

  const allAcedmicyear = await acedmicYearCreationService.getacedmicYearDetails();
  for (const record of allAcedmicyear) {
    const { acedmicYearId, yearTitle } = record.dataValues;

    if (!yearTitle || !yearTitle.includes('-')) {
      console.warn(`>>>>>>>Skipping record with ID ${acedmicYearId} due to invalid yearTitle: ${yearTitle}`);
      continue;
    }

    const [startYear, endYear] = yearTitle.split('-');

    const fullStartingDate = `${startYear}-${startingDate}`;
    const fullEndingDate = `${endYear}-${endingDate}`;

    const updatePayload = {
      startingDate: fullStartingDate,
      endingDate: fullEndingDate,
      updatedBy
    };

    console.log(`>>>>>>>>>>>>>Updating ID ${acedmicYearId} =>`, updatePayload);

     await acedmicYearCreationService.updateacedmicYear(acedmicYearId, updatePayload);
  }
};

export async function activateAcedmicYear(acedmicYearId, updatedBy) {    
  try {
    const allAcedmicyear = await acedmicYearCreationService.getacedmicYearDetails();

    const currentIndex = allAcedmicyear.findIndex(
      (record) => record.dataValues.acedmicYearId  === Number(acedmicYearId)
    );
    

    if (currentIndex === -1) {
      throw new Error(`Academic year with ID ${acedmicYearId} not found.`);
    }

    const updatePayload = {
      isActive: true,
      updatedBy
    };

    await acedmicYearCreationService.updateacedmicYear(
      acedmicYearId,
      updatePayload
    );
    const nextRecord = allAcedmicyear[currentIndex + 1];
    if (nextRecord) {
      const nextAcedmicYearId = nextRecord.dataValues.acedmicYearId;

      await acedmicYearCreationService.updateacedmicYear(
        nextAcedmicYearId,
        updatePayload
      );

      console.log(`Activated current (ID ${acedmicYearId}) and next (ID ${nextAcedmicYearId}) academic years.`);
    } else {
      console.log(`Activated current (ID ${acedmicYearId}) academic year. No next year found.`);
    }

  } catch (error) {
    console.error('Error in activateAcedmicYear:', error);
    throw error;
  }
}

export async function deleteacedmicYear(acedmicYearId) {
    return await acedmicYearCreationService.deleteacedmicYear(acedmicYearId);
}

export async function getAllActiveAcedmicYear(universityId) {
    return await acedmicYearCreationService.getAllActiveAcedmicYear(universityId);
}