const http = require('http');

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', e => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log("=== API Testing ===\n");
  try {
    console.log("1. Testing Login API POST /api/auth/login with valid empty credentials to see response structure");
    let res = await request('/auth/login', 'POST', { username: 'admin', password: 'password' });
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(res.data, null, 2));

    console.log("\n2. Testing Competition List GET /api/competition/list");
    res = await request('/competition/list', 'GET');
    console.log("Status:", res.status);
    if (typeof res.data === 'string') {
        console.log("Response:", res.data.substring(0, 200));
    } else {
        console.log("Response:", JSON.stringify(res.data, null, 2).substring(0, 500) + '...');
    }
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      console.error("Connection Refused. The Spring Boot backend is NOT running on localhost:8080.");
    } else {
      console.error("Error:", e.message);
    }
  }
}

run();
