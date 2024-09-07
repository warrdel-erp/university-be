import { teacherSubjectMapping ,getTeacherSubjectMapping,updateTeachersSubjectMapping,deleteTeachersSubjectMapping} from "../repository/teacherSubjectMappingRepository.js";
import { teacherSectionMapping ,getTeacherSectionMapping,updateTeachersSectionMapping,deleteTeachersSectionMapping} from "../repository/teacherSectionMappingRepository.js";


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

export async function updateTeacherSubjectMapping(data, teacherSubjectMappingId) {  
  const { employeeId, classSubjectMapperId } = data;
  const results = [];

  for (const id of classSubjectMapperId) {
    const entryData = { employeeId, classSubjectMapperId: id };
    const result = await updateTeachersSubjectMapping(teacherSubjectMappingId, entryData); 
    results.push(result);
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