const express = require('express');
const redis = require('redis');
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
app.get('/logs', (req, res) => {
  const logLevel = req.query.logLevel;
  const message = req.query.message;
  const timestamp = req.query.timestamp;
  const logFileName = req.query.logFileName;
  console.log(logLevel)
  console.log(message)
  console.log(timestamp)
  console.log(logFileName)

  if (logLevel) {
    // Query by log level
    redisClient.hgetall(`${logFileName}_bylevel:${logLevel}`, (err, data) => {
      if (err) {
        return res.status(500).send('Internal Server Error');
      }
      res.json(data);
    });
  } else if (message) {
    // Query by message
    redisClient.hget(`${logFileName}_bymessage:`, message + ' ' + timestamp, (err, data) => {
      if (err) {
        return res.status(500).send('Internal Server Error');
      }
      res.json(data);
    });
  } else if (timestamp) {
    // Query by timestamp
    redisClient.hget(`${logFileName}_bytimestamp`, timestamp, (err, data) => {
      if (err) {
        return res.status(500).send('Internal Server Error');
      }
      res.json(data);
    });
  } else {
    res.status(400).send('Bad Request');
  }
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
  