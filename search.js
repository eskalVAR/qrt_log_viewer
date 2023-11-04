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
  let key;
  let query;
  let deli = 1;
  if (searchBy === 'bymessage') {
    key = `${logFileName}_bymessage`;
    query = message;
  } else if (searchBy === 'bylevel') {
    key = `${logFileName}_bylevel:${logLevel}`;
    query = "*";
    deli = 0;
  } else if (searchBy === 'bytimestamp') {
    key = `${logFileName}_bytimestamp`;
    query = timestamp;
  } else {
    res.status(400).json({ error: 'Invalid searchBy parameter' });
    return;
  }
  console.log(key);
  console.log(query);

  
  const allresults = [];

  function scan(key, query, cursor = '0') {
    return new Promise(async (resolve, reject) => {
      try {
        const [nextCursor, results] = await redisClient.hscan(key, cursor, 'MATCH', query, 'COUNT', '100');

        const filteredResults = results.filter((_, index) => index % 2 === deli);
      allresults.push(...filteredResults);
  
        if (nextCursor === '0') {
          resolve(allresults);
        } else {
          resolve(scan(key, query, nextCursor));
        }
      } catch (error) {
        reject(error);
        console.log(error);
      }
    });
  }
  
  scan(key, query)
    .then(results => {
        for(var i = 0; i < results.length; i++){
            results.splice(i+1,2);
        }
      res.json(results);
    })
    .catch(error => {
        console.log(error);
      res.status(500).json({ error: 'An error occurred' });
    });
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

app.get('/logFiles', (req, res) => {
  redisClient.keys('*_bytimestamp', (err, keys) => {
    if (err) {
      console.error('Redis Error: ' + err);
      res.status(500).send('Internal Server Error');
    } else {
      const logFileNames = keys.map((key) => key.replace('_bytimestamp', ''));
      console.log({logFileNames})
      res.json({ logFileNames }); // Send logFileNames as JSON
    }
  });
});