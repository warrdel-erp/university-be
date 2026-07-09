import { gettimeTableCreateDetails } from './services/timeTableCreateServices.js';

async function run() {
  try {
    const res = await gettimeTableCreateDetails({
        courseId: 34,
        user: { userId: 46, universityId: 4, instituteId: 12 }
    });
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
