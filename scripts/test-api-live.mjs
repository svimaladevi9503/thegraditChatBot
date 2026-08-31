const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function testEndpoint(name, url, method = 'GET', body = null) {
  console.log(`\n========================================`);
  console.log(`🧪 Test: ${name}`);
  console.log(`========================================`);
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const json = await res.json();
    console.log(`HTTP Status: ${res.status}`);
    console.log('Result Preview:');
    console.log(JSON.stringify(json, null, 2).substring(0, 500) + '...');
    return json;
  } catch (err) {
    console.error('Error during test:', err.message);
  }
}

async function runAll() {
  // 1. Test Metrics Endpoint
  await testEndpoint('Dashboard Metrics from Backend', `${BASE_URL}/api/metrics`, 'GET');

  // 2. Test Live Chat: Student Attendance by Name (Rahul)
  await testEndpoint(
    'Student Attendance Lookup ("What is Rahul\'s attendance for 2025-26?")',
    `${BASE_URL}/api/chat`,
    'POST',
    { query: "What is Rahul's attendance for 2025-26?", userRole: 'ADMIN' }
  );

  // 3. Test Live Chat: Student Fee & Pending Calculation (Rahul)
  await testEndpoint(
    'Student Fee & Pending Balance ("What is Rahul\'s pending fee in pdf?")',
    `${BASE_URL}/api/chat`,
    'POST',
    { query: "What is Rahul's pending fee in pdf?", userRole: 'ADMIN' }
  );

  // 4. Test Live Chat: Aggregate Attendance
  await testEndpoint(
    'Aggregate Class Attendance ("Class wise attendance percentage report")',
    `${BASE_URL}/api/chat`,
    'POST',
    { query: "Class wise attendance percentage report", userRole: 'ADMIN' }
  );

  // 5. Test Live Chat: Aggregate Fees
  await testEndpoint(
    'Aggregate Fees ("Total fees collected this semester")',
    `${BASE_URL}/api/chat`,
    'POST',
    { query: "Total fees collected this semester", userRole: 'ADMIN' }
  );

  // 6. Test RBAC: Student Role attempting to view college-wide financial aggregates
  await testEndpoint(
    'RBAC Access Control (Student trying to view Aggregate Fees)',
    `${BASE_URL}/api/chat`,
    'POST',
    { query: "Total fees collected this semester", userRole: 'STUDENT' }
  );
}

runAll();
