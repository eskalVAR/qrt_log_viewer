const fs = require('fs');
const readline = require('readline');
const redis = require('redis');

// Configure Redis connection
const redisClient = redis.createClient({
  host: 'localhost', // Update with your Redis server details
  port: 6379, // Update with your Redis server port
});

// File to monitor
const logFilePath = './sample.log'; // Replace with your log file path

// Create a Redis key for storing the log data
const redisKey = 'log_data';

// Function to process a log line and store it in Redis
function processLogLine(line) {
  const parts = line.split(' ');
  const timestamp = parts[0] + ' ' + parts[1];
  const logLevel = parts[2].slice(0, -1);
  const logMessage = parts.slice(3).join(' ');

  // Store the log data in Redis with a unique timestamp as the key
  redisClient.hset(redisKey, timestamp, JSON.stringify({ logLevel, logMessage }), (err) => {
    if (err) {
      console.error('Error storing log data in Redis:', err);
    }
  });
}

// Create a read stream to monitor the log file
const fileStream = fs.createReadStream(logFilePath);

// Create a readline interface to read lines from the file
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  console.log("Line");
  processLogLine(line);
});

rl.on('close', () => {
  console.log('Log file monitoring ended.');
});

// Handle errors
rl.on('error', (err) => {
  console.error('Error reading log file:', err);
});

// Handle Redis errors
redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});
