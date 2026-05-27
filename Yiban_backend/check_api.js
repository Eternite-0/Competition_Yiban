const http = require('http');

http.get('http://localhost:8080/v3/api-docs', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('Endpoints:');
      console.log(Object.keys(j.paths).join('\n'));
    } catch (e) {
      console.log('Failed to parse API docs');
    }
  });
}).on('error', err => {
  console.log('Failed to fetch API docs:', err.message);
});
