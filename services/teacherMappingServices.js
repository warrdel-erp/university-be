import { teacherSubjectMapping ,getTeacherSubjectMapping} from "../repository/teacherSubjectMappingRepository.js";
import { teacherSectionMapping ,getTeacherSectionMapping} from "../repository/teacherSectionMappingRepository.js";


export async function teacherSubjectMappingService(data) {
  console.log(`>>>>>>>teacherSubjectMappingService>>>>>>>>>>>`,data);
  
    try {
      const { employeeId, classSubjectMapperId } = data;

      const results = [];
  
      for (const id of classSubjectMapperId) {
        const entryData = { employeeId, classSubjectMapperId :id };
        const result = await teacherSubjectMapping(entryData);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error in teacher Subject Mapping:', error);
      throw error;
    }
}; 

export async function teacherSectionMappingService(data) {
  try {
    const { employeeId, classSectionsId } = data;
    const results = [];

    for (const id of classSectionsId) {
      const entryData = {employeeId, classSectionsId:id };
      const result = await teacherSectionMapping(entryData);
      results.push(result);
    }
    
    return results;
  } catch (error) {
    console.error('Error in teacher Section Mapping:', error);
    throw error;
  }
}; 

export async function getTeacherSubjectMappingService(employeeId){
  return await getTeacherSubjectMapping(employeeId)
};

export async function getTeacherSectionMappingService(employeeId){
  return await getTeacherSectionMapping(employeeId)
};