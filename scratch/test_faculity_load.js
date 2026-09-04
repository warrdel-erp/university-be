const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1bml2ZXJzaXR5SWQiOjQsImRlZmF1bHRJbnN0aXR1dGVJZCI6MTIsImRlZmF1bHRSb2xlSWQiOm51bGwsImRlZmF1bHRBY2FkZW1pY1llYXJJZCI6NTksInVzZXJOYW1lIjoiUGF5YWwgTHVsbGEiLCJ1bmlxdWVJZCI6IjE0NWQ5ODU2LTYyYzctNDY4ZS1hNzYyLTI2ZTkzYjdmYzgyZiIsInBhc3N3b3JkIjoiJDJhJDEwJEVzMmlldHdab0FBNHhTRnBKbGYzRmUuQmR1eDIuanVtR3BUMmZaUEtYaHEubTVxR2dhaEJPIiwiZHVtbXlQYXNzd29yZCI6IiIsInN0YXR1cyI6ImFjdGl2ZSIsInBob25lIjoiNzYwMDc5ODMwNyIsImVtYWlsIjoicGx1QGFheW9qYW4uZWR1LmluIiwiaXNUZWFjaGVyIjpmYWxzZSwiY3JlYXRlZEF0IjoiMjAyNS0wOS0zMFQxMTo1MjowOS4wMDBaIiwidXBkYXRlZEF0IjoiMjAyNi0wOS0wMVQwNjo1MDowNS4wMDBaIiwiZGVsZXRlZEF0IjpudWxsLCJkZWZhdWx0X3JvbGVfaWQiOm51bGwsImluc3RpdHV0ZU5hbWUiOiJBYXlvamFuIFNjaG9vbCBvZiBBcmNoaXRlY3R1cmUiLCJpYXQiOjE3ODgyODQwNzQsImV4cCI6MTc5MDg3NjA3NH0.LSj1YU2A8ynSBajlqWpKq3kp-jF7EL0gCtkFRflKtYw';

async function test() {
  const getRes = await fetch('http://localhost:8080/faculityLoad?academicYearId=59', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await getRes.json();
  console.log("GET /faculityLoad output:");
  console.log(JSON.stringify(data.data?.slice(0, 2), null, 2));
}

test();
