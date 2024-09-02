import { teacherSubjectMapping ,getTeacherSubjectMapping} from "../repository/teacherSubjectMappingRepository.js";
import { teacherSectionMapping ,getTeacherSectionMapping} from "../repository/teacherSectionMappingRepository.js";


export async function teacherSubjectMappingService(data,createdBy) {
  console.log(`>>>>>>>teacherSubjectMappingService>>>>>>>>>>>`,data);
  
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

export async function getTeacherSubjectMappingService(employeeId,universityId){
  return await getTeacherSubjectMapping(employeeId,universityId)
};

export async function getTeacherSectionMappingService(employeeId,universityId){
  return await getTeacherSectionMapping(employeeId,universityId)
};