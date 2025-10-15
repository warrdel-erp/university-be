import * as acedmicYearCreationService  from "../repository/acedmicYearRepository.js";
import { getAllSubject, subjectBulkCreate } from "../repository/mainRepository.js";

export async function addacedmicYear(acedmicYearData, createdBy, updatedBy,universityId) {

        acedmicYearData.createdBy = createdBy;
        acedmicYearData.updatedBy = updatedBy;
        acedmicYearData.universityId = universityId;
        const acedmicYear = await acedmicYearCreationService.addacedmicYear(acedmicYearData);
        return acedmicYear;
};

export async function getacedmicYearDetails(universityId) {
    return await acedmicYearCreationService.getacedmicYearDetails(universityId);
};

export async function getSingleacedmicYearDetails(acedmicYearId,universityId) {
    return await acedmicYearCreationService.getSingleacedmicYearDetails(acedmicYearId,universityId);
};

export async function getSingleacedmicYearDetailsByTitle(yearTitle) {
    return await acedmicYearCreationService.getSingleacedmicYearDetailsByTitle(yearTitle);
};

// export async function updateacedmicYear(acedmicYearData, updatedBy) {
//   const { startingDate, endingDate } = acedmicYearData;

//   const allAcedmicyear = await acedmicYearCreationService.getacedmicYearDetails();
//   for (const record of allAcedmicyear) {
//     const { acedmicYearId, yearTitle } = record.dataValues;

//     if (!yearTitle || !yearTitle.includes('-')) {
//       console.warn(`>>>>>>>Skipping record with ID ${acedmicYearId} due to invalid yearTitle: ${yearTitle}`);
//       continue;
//     }

//     const [startYear, endYear] = yearTitle.split('-');

//     const fullStartingDate = `${startYear}-${startingDate}`;
//     const fullEndingDate = `${endYear}-${endingDate}`;

//     const updatePayload = {
//       startingDate: fullStartingDate,
//       endingDate: fullEndingDate,
//       updatedBy
//     };

//     console.log(`>>>>>>>>>>>>>Updating ID ${acedmicYearId} =>`, updatePayload);

//      await acedmicYearCreationService.updateacedmicYear(acedmicYearId, updatePayload);
//   }
// };

export async function updateacedmicYear(acedmicYearData, updatedBy) {
  const { startingDate, endingDate } = acedmicYearData;

  const allAcedmicyear = await acedmicYearCreationService.getacedmicYearDetails();
  const currentYear = new Date().getFullYear();

  for (const record of allAcedmicyear) {
    const { acedmicYearId, yearTitle } = record.dataValues;

    if (!yearTitle || !yearTitle.includes('-')) {
      console.warn(`>>>>>>>Skipping record with ID ${acedmicYearId} due to invalid yearTitle: ${yearTitle}`);
      continue;
    }

    const [startYear, endYear] = yearTitle.split('-');

    const fullStartingDate = `${startYear}-${startingDate}`;
    const fullEndingDate = `${endYear}-${endingDate}`;

    // Determine if this academic year is the current one
    const isActive = Number(startYear) === currentYear;

    const updatePayload = {
      startingDate: fullStartingDate,
      endingDate: fullEndingDate,
      isActive,
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
};

export async function deleteacedmicYear(acedmicYearId) {
    return await acedmicYearCreationService.deleteacedmicYear(acedmicYearId);
};

export async function getAllActiveAcedmicYear(universityId) {
    return await acedmicYearCreationService.getAllActiveAcedmicYear(universityId);
};

export async function newActivateAndCopyData(data, universityId, instituteId, createdBy, updatedBy) {
  const { acedmicYearId, copyAcedmicYearId, copyData } = data;
  const updatePayload = {
      isActive: true,
      updatedBy
  };
  try {
    if (!copyAcedmicYearId) {
      await acedmicYearCreationService.updateacedmicYear(
        acedmicYearId,
        updatePayload
      );
      console.log(`Activated academic year ID: ${acedmicYearId}`);

    } else if (copyAcedmicYearId && Array.isArray(copyData) && copyData.length > 0) {
      for (const dataType of copyData) {
        switch (dataType) {
          case 'subject':
            const subjects = await getAllSubject('',copyAcedmicYearId,'','')            
            const newSubjects = subjects.map(subject => ({
              ...subject.get({ plain: true }),
              acedmicYearId: acedmicYearId,
              createdBy: createdBy,
              updated_by: updatedBy,
              createdBy:createdBy,
              subjectId: undefined  // Remove the id so a new one is generated
            }));            
            await subjectBulkCreate(newSubjects);
            console.log(`Copied subjects from AY ${copyAcedmicYearId} to ${acedmicYearId}`);
            break;

          // case 'electiveSubject':
          //   const electives = await electiveSubjectModel.findAll({ where: { academic_year_id: copyAcedmicYearId } });
          //   const newElectives = electives.map(item => ({
          //     ...item.get({ plain: true }),
          //     academic_year_id: acedmicYearId,
          //     created_by: createdBy,
          //     updated_by: updatedBy,
          //     id: undefined
          //   }));
          //   await electiveSubjectModel.bulkCreate(newElectives);
          //   console.log(`Copied electiveSubjects`);
          //   break;

          // case 'session':
          //   const sessions = await sessionModel.findAll({ where: { academic_year_id: copyAcedmicYearId } });
          //   const newSessions = sessions.map(item => ({
          //     ...item.get({ plain: true }),
          //     academic_year_id: acedmicYearId,
          //     created_by: createdBy,
          //     updated_by: updatedBy,
          //     id: undefined
          //   }));
          //   await sessionModel.bulkCreate(newSessions);
          //   console.log(`Copied sessions`);
          //   break;

          // case 'semesterSubjectMapping':
          //   const mappings = await semesterSubjectMappingModel.findAll({ where: { academic_year_id: copyAcedmicYearId } });
          //   const newMappings = mappings.map(item => ({
          //     ...item.get({ plain: true }),
          //     academic_year_id: acedmicYearId,
          //     created_by: createdBy,
          //     updated_by: updatedBy,
          //     id: undefined
          //   }));
          //   await semesterSubjectMappingModel.bulkCreate(newMappings);
          //   console.log(`Copied semesterSubjectMappings`);
          //   break;

          default:
            console.warn(`Unknown data type: ${dataType}`);
        }
      }

      await acedmicYearCreationService.updateacedmicYear(
        acedmicYearId,
        updatePayload
      );
    }
  } catch (error) {
    console.error('Error in copy data and academic year:', error);
    throw error;
  }
};