const express = require('express');
const redis = require('ioredis');
const app = express();
const ejs = require('ejs');
const port = 3000; // Change this to the desired port
// Configure Redis connection
const redisClient = redis.createClient({
  host: 'localhost', // Update with your Redis server details
  port: 6379, // Update with your Redis server port
});


// Handle errors
redisClient.on('error', (err) => {
  console.error('Redis Error: ' + err);
});

// Set up routes for querying the logs
app.get('/logs', async (req, res) => {
  const { logFileName, logLevel, message, timestamp, searchBy } = req.query;
  let query;
  if (searchBy === 'bymessage') {
    query = `${logFileName}_bymessage`;
  } else if (searchBy === 'bylevel') {
    query = `${logFileName}_bylevel:${logLevel}`;
  } else if (searchBy === 'bytimestamp') {
    query = `${logFileName}_bytimestamp`;
  } else {
    res.status(400).json({ error: 'Invalid searchBy parameter' });
    return;
  }
  console.log(query)

    // Use HSCAN to iterate through the hash and retrieve log entries
  const result = {};

  const scanLogEntries = async (cursor) => {
    const [nextCursor, keys] = await new Promise((resolve, reject) => {
      redisClient.hscan(query, cursor, 'MATCH', '*', 'COUNT', '100', (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    for (let i = 0; i < keys.length; i += 2) {
      const key = keys[i];
      const logEntry = keys[i + 1];
      result[key] = logEntry;
    }

    if (nextCursor === '0') {
      res.json(result);
    } else {
      scanLogEntries(nextCursor);
    }
  };

  scanLogEntries('0');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get('/', (req, res) => {
    redisClient.keys('*_bytimestamp', (err, keys) => {
      if (err) {
        console.error('Redis Error: ' + err);
        res.status(500).send('Internal Server Error');
      } else {
        const logFileNames = keys.map((key) => key.replace('_bytimestamp', ''));
        ejs.renderFile(__dirname + '/src/static/index.ejs', { logFileNames }, (err, html) => {
          if (err) {
            console.error('EJS Error: ' + err);
            res.status(500).send('Internal Server Error');
          } else {
            res.send(html);
          }
        });
      }
    });
  });
  