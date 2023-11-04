const fs = require('fs');
const readline = require('readline');
const redis = require('redis');

const logFiles = ['sample1.log', 'sample2.log']
const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379,
});

function processLogEntry(logEntry, logFileName) {
  const logParts = logEntry.split(' ');
  if (logParts.length < 4) {
    return;
  }

  const timestamp = logParts[0] + ' ' + logParts[1];
  const logLevel = logParts[2].slice(0, -1);
  const message = logParts.slice(3).join(' ');
  const redisKey = `${timestamp}:${logLevel}:${logFileName}`;

  redisClient.hset(`${logFileName}_bytimestamp`, timestamp, logEntry);
  redisClient.hset(`${logFileName}_bylevel:` + logLevel, logEntry, message);
  redisClient.hset(`${logFileName}_bymessage:`, message + ' ' + timestamp, logEntry );

}
const summaryStatsMap = {};

function processSummaryStatsEntry(logEntry, logFilePath) {
  // Identify and process summary statistics entries per log file
  if (logEntry.includes('Exchange order message timing output')) {
    if (!summaryStatsMap[logFilePath]) {
      summaryStatsMap[logFilePath] = [];
    }
    const summaryStats = {};
    let isSummaryStats = true;

    for (const line of logEntry.split('\n')) {
      if (line.trim() === '') {
        isSummaryStats = false;
        summaryStatsMap[logFilePath].push(summaryStats);
      } else if (isSummaryStats) {
        const [exchange, orderType, recvNu, xUs] = line.split(/\s+/);
        summaryStats[exchange] = summaryStats[exchange] || {};
        summaryStats[exchange][orderType] = { recvNu, xUs };
      }
    }

    // Store the summary statistics in Redis
    redisClient.set(`summary_stats_${logFilePath}`, JSON.stringify(summaryStatsMap[logFilePath]), (err) => {
      if (err) {
        console.error(`Error storing summary stats in Redis: ${err}`);
      } else {
        console.log(`Stored summary stats in Redis for ${logFilePath}`);
      }
    });
  }
}


function processLogFile(logFilePath) {
  const fileStream = fs.createReadStream(logFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isSummaryStats = false;
  let summaryStats = {};

  rl.on('line', (line) => {
    if (line.includes('Exchange order message timing output')) {
      //processSummaryStatsEntry(line, logFilePath);
      isSummaryStats = true;
      summaryStats = {};
    } else if (isSummaryStats) {
      //processSummaryStatsEntry(line, logFilePath);
      if (line.trim() === '') {
        isSummaryStats = false;
        }
    } else {
      processLogEntry(line, logFilePath);
    }
  });

  rl.on('error', (err) => {
    console.error(`Error reading log file ${logFilePath}: ${err}`);
  });
}

logFiles.forEach((logFilePath) => {
  processLogFile(logFilePath);

  // Watch for changes in the log file
  fs.watch(logFilePath, (event, filename) => {
    if (event === 'change') {
      processLogFile(logFilePath);
    }
  });
});

