const redis = require('redis');

// Configure Redis connection
const redisClient = redis.createClient({
  host: 'localhost', // Update with your Redis server details
  port: 6379, // Update with your Redis server port
});

// Create a Redis key for storing the log data (should match the key used for storing)
const redisKey = 'log_data';

// Function to search log entries by log level
function searchLogByLevel(logLevel) {
  return new Promise((resolve, reject) => {
    redisClient.hgetall(redisKey, (err, logData) => {
      if (err) {
        reject(err);
        return;
      }

      const filteredLogEntries = [];
      for (const timestamp in logData) {
        const logEntry = JSON.parse(logData[timestamp]);
        if (logEntry.logLevel === logLevel) {
          filteredLogEntries.push({ timestamp, logEntry });
        }
      }

      resolve(filteredLogEntries);
    });
  });
}

// Example: Search for log entries with log level "INFO"
searchLogByLevel('INFO')
  .then((logEntries) => {
    console.log('Log entries with log level "INFO":');
    logEntries.forEach((entry) => {
      console.log(entry.timestamp, entry.logEntry.logLevel, entry.logEntry.logMessage);
    });
  })
  .catch((err) => {
    console.error('Error searching log data:', err);
  });

// Handle Redis errors
redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});
