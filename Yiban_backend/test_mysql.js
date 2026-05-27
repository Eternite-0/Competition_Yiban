const mysql = require('mysql2/promise');

async function testPasswords() {
  const passwords = ['', '123456', '12345678', 'password', 'mysql', 'admin', 'root123'];
  let found = false;

  for (const pwd of passwords) {
    try {
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: pwd
      });
      console.log(`[SUCCESS] Found password! It is: "${pwd}"`);
      await connection.end();
      found = true;
      break;
    } catch (err) {
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        // wrong password, ignore
      } else {
        console.log(`[ERROR] Connection failed with password "${pwd}": ${err.message}`);
      }
    }
  }

  if (!found) {
    console.log('[FAIL] Could not guess the MySQL root password with common patterns.');
  }
}

testPasswords();
