import { teacherSubjectMapping ,getTeacherSubjectMapping,updateTeachersSubjectMapping,deleteTeachersSubjectMapping} from "../repository/teacherSubjectMappingRepository.js";
import { teacherSectionMapping ,getTeacherSectionMapping,updateTeachersSectionMapping,deleteTeachersSectionMapping} from "../repository/teacherSectionMappingRepository.js";


export async function teacherSubjectMappingService(data,createdBy) {
  
    try {
      const { employeeId, classSubjectMapperId } = data;

      const results = [];
  
      for (const id of classSubjectMapperId) {
        const entryData = { employeeId, classSubjectMapperId :id,createdBy};
        const result = await teacherSubjectMapping(entryData);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error in teacher Subject Mapping:', error);
      throw error;
    }
}; 

export async function teacherSectionMappingService(data,createdBy) {
  try {
    const { employeeId, classSectionsId } = data;
    const results = [];

    for (const id of classSectionsId) {
      const entryData = {employeeId, classSectionsId:id ,createdBy};
      const result = await teacherSectionMapping(entryData);
      results.push(result);
    }
    
    return results;
  } catch (error) {
    console.error('Error in teacher Section Mapping:', error);
    throw error;
  }
}; 

export async function getTeacherSubjectMappingService(employeeId,universityId,acedmicYearId,instituteId,role){
  return await getTeacherSubjectMapping(employeeId,universityId,acedmicYearId,instituteId,role)
};

export async function getTeacherSectionMappingService(employeeId,universityId,acedmicYearId,instituteId,role){
  return await getTeacherSectionMapping(employeeId,universityId,acedmicYearId,instituteId,role)
};

export async function saveOrUpdateTeacherSubjectMapping(list, userId) {
    const results = [];

    for (const item of list) {

        const { teacherSubjectMappingId, employeeId, classSubjectMapperId } = item;

        if (teacherSubjectMappingId) {
            const updated = await updateTeachersSubjectMapping(teacherSubjectMappingId, {
                employeeId,
                classSubjectMapperId
            });

            results.push({
                action: "updated",
                teacherSubjectMappingId,
                result: updated
            });

        } 
        else {
            const created = await teacherSubjectMapping({
                employeeId,
                classSubjectMapperId,
                createdBy: userId
            });

            results.push({
                action: "created",
                teacherSubjectMappingId: created.teacherSubjectMappingId,
                result: created
            });
        }
    }

    return results;
};

export async function updateTeacherSectionMapping(data,teacherSectionMappingId){
  const { employeeId, classSectionsId } = data;
  const results = [];

  for (const id of classSectionsId) {
    const entryData = { employeeId, classSectionsId: id };
    const result = await updateTeachersSectionMapping(teacherSectionMappingId, entryData);
    results.push(result);
  }  
  return results;
};

export async function deleteTeacherSectionMapping(teacherSectionMappingId){
  return await deleteTeachersSectionMapping(teacherSectionMappingId)
};

export async function deleteTeacherSubjectMapping(teacherSubjectMappingId){
  return await deleteTeachersSubjectMapping(teacherSubjectMappingId)
};