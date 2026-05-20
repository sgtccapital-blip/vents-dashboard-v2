const http = require('http');

async function findPort(startPort) {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      await new Promise((resolve, reject) => {
        const s = http.createServer();
        s.on('error', (err) => reject(err));
        s.listen(port, () => {
          s.close(() => resolve(port));
        });
      });
      console.log('Available port:', port);
      return port;
    } catch (err) {
      // ignore
    }
  }
  console.log('No ports available in range');
}

findPort(10000);
