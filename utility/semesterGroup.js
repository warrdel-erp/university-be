export function getSemesterGroup(name, semesterDuration) {
    
  const num = parseInt(String(name).replace(/\D/g, ''), 10);

  let type = '';
  let group = 0;

  if (semesterDuration === 6) {
    type = 'sem'; // 2 per year
    // 1,2 -> 1 | 3,4 -> 2 | 5,6 -> 3 | 7,8 -> 4 | 9,10 -> 5
    group = Math.ceil(num / 2);
  } 
  else if (semesterDuration === 4) {
    type = 'tri'; // 3 per year
    // 1,2,3 -> 1 | 4,5,6 -> 2 | 7,8,9 -> 3 | 10,11,12 -> 4 | 13,14,15 -> 5 | 16,17,18 -> 6 | 19,20 -> 7
    group = Math.ceil(num / 3);
  } 
  else if (semesterDuration === 3) {
    type = 'quart'; // 4 per year
    // 1,2,3,4 -> 1 | 5,6,7,8 -> 2 | 9,10,11,12 -> 3 | 13,14,15,16 -> 4 | 17,18,19,20 -> 5 | 21,22,23,24 -> 6 | 25,26,27,28 -> 7 | 29,30 -> 8
    group = Math.ceil(num / 4);
  } 
  else {
    type = 'unknown';
  }

  return { name: num, semesterDuration, type, group };
}
