const fs = require('fs');
const readline = require('readline');
const path = require('path');
const redis = require('redis');
const logDirectory = './logs'; // Specify the directory where your log files are stored

const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379,
});
var latestTime = 0;
function processLogEntry(logEntry, logFileName) {
  const logParts = logEntry.split(' ');
  if (logParts.length < 4) {
    return;
  }

  const timestamp = logParts[0] + ' ' + logParts[1];
  latestTime = timestamp;
  const logLevel = logParts[2].slice(0, -1);
  const message = logParts.slice(3).join(' ');
  const redisKey = `${timestamp}:${logLevel}:${logFileName}`;

  redisClient.hset(`${logFileName}_bytimestamp`, timestamp, logEntry);
  redisClient.hset(`${logFileName}_bylevel:` + logLevel, logEntry, message);
  redisClient.hset(`${logFileName}_bymessage`, message + ' ' + timestamp, logEntry);
}


var summaryStats = {};
var summaryStatsMap = {};
var sumindex = 0;
function processSummaryStatsEntry(logEntry, logFilePath) {
  if (!summaryStatsMap[logFilePath]) {
    summaryStatsMap[logFilePath] = [];
  }
  let isSummaryStats = true;

  if (logEntry.trim() === '') {
    isSummaryStats = false;
    sumindex = 0;
    summaryStatsMap[logFilePath].push(summaryStats);
  } else if (isSummaryStats) {
    const [blank, exchange, orderType, recvNu, xUs] = logEntry.split(/\s+/);
    if (exchange.trim() == "Exchange") {
      return;
    }
    summaryStats[sumindex] = {
      exchange: exchange,
      order: orderType,
      recvnu: recvNu,
      xUs: xUs
    }
    redisClient.hset(`${logFilePath}_exchange_timing_output`, latestTime + '-' + sumindex, JSON.stringify(summaryStats[sumindex]));
    sumindex++;
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
      isSummaryStats = true;
      summaryStats = {};
    } else if (isSummaryStats) {
      if (line.trim() === '') {
        isSummaryStats = false;
      }
      // Process the summary stats entry
      processSummaryStatsEntry(line, logFilePath);
    } else {
      processLogEntry(line, logFilePath);
    }
  });

  rl.on('error', (err) => {
    console.error(`Error reading log file ${logFilePath}: ${err}`);
  });
}

const watchedFiles = new Set();

fs.readdir(logDirectory, (err, files) => {
  if (err) {
    console.error(`Error reading log directory: ${err}`);
    return;
  }

  const logFiles = files.filter((file) => path.extname(file) === '.log');

  logFiles.forEach((logFile) => {
    const logFilePath = path.join(logDirectory, logFile);
    setupFileWatcher(logFilePath);
  });
});

fs.watch(logDirectory, (event, filename) => {
  if (event === 'rename' && path.extname(filename) === '.log') {
    const logFilePath = path.join(logDirectory, filename);
    if (!watchedFiles.has(logFilePath)) {
      setupFileWatcher(logFilePath);
    }
  }
});

function setupFileWatcher(logFilePath) {
  watchedFiles.add(logFilePath);
  processLogFile(logFilePath);

  // Watch for changes in the log file
  fs.watch(logFilePath, (event, filename) => {
    if (event === 'change') {
      processLogFile(logFilePath);
    }
  });
}
