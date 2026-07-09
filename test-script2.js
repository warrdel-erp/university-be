import { getTimeTableStructures } from './repository/timeTableRepository.js';

async function run() {
  try {
    const res = await getTimeTableStructures({ courseId: 34 });
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
