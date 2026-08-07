import * as academicRegulationRepo from '../repository/academicRegulationRepository.js';

async function testFetch() {
  try {
    const list = await academicRegulationRepo.getAcademicRegulations({ limit: 1 });
    console.log("FETCH GET ALL DATA RESULT:", JSON.stringify(list.data, null, 2));
  } catch (err) {
    console.error("ERROR FETCHING:", err);
  }
}

testFetch();
