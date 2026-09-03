const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1bml2ZXJzaXR5SWQiOjQsImRlZmF1bHRJbnN0aXR1dGVJZCI6MTIsImRlZmF1bHRSb2xlSWQiOm51bGwsImRlZmF1bHRBY2FkZW1pY1llYXJJZCI6NTksInVzZXJOYW1lIjoiUGF5YWwgTHVsbGEiLCJ1bmlxdWVJZCI6IjE0NWQ5ODU2LTYyYzctNDY4ZS1hNzYyLTI2ZTkzYjdmYzgyZiIsInBhc3N3b3JkIjoiJDJhJDEwJEVzMmlldHdab0FBNHhTRnBKbGYzRmUuQmR1eDIuanVtR3BUMmZaUEtYaHEubTVxR2dhaEJPIiwiZHVtbXlQYXNzd29yZCI6IiIsInN0YXR1cyI6ImFjdGl2ZSIsInBob25lIjoiNzYwMDc5ODMwNyIsImVtYWlsIjoicGx1QGFheW9qYW4uZWR1LmluIiwiaXNUZWFjaGVyIjpmYWxzZSwiY3JlYXRlZEF0IjoiMjAyNS0wOS0zMFQxMTo1MjowOS4wMDBaIiwidXBkYXRlZEF0IjoiMjAyNi0wOS0wMVQwNjo1MDowNS4wMDBaIiwiZGVsZXRlZEF0IjpudWxsLCJkZWZhdWx0X3JvbGVfaWQiOm51bGwsImluc3RpdHV0ZU5hbWUiOiJBYXlvamFuIFNjaG9vbCBvZiBBcmNoaXRlY3R1cmUiLCJpYXQiOjE3ODgyODQwNzQsImV4cCI6MTc5MDg3NjA3NH0.LSj1YU2A8ynSBajlqWpKq3kp-jF7EL0gCtkFRflKtYw';

async function testCopy() {
  try {
    const timeTableCellDateWiseId = 1;
    console.log("Testing POST /attendance/my/copyPeriod...");
    const postRes = await fetch('http://localhost:8080/attendance/my/copyPeriod', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeTableCellDateWiseId,
        copyToTimeTableCellDateWiseId: 2
      })
    });
    
    console.log("POST Status:", postRes.status);
    console.log(await postRes.text());

    console.log("\nTesting GET /attendance/my/copyPeriod...");
    const getRes = await fetch(`http://localhost:8080/attendance/my/copyPeriod?timeTableCellDateWiseId=${timeTableCellDateWiseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log("GET Status:", getRes.status);
    console.log(await getRes.text());
  } catch (err) {
    console.error("Fetch failed", err);
  }
}

testCopy();
