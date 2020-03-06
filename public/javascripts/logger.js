const winston = require('winston');
require('winston-daily-rotate-file');
const date = require('date-utils');

const logger = winston.createLogger({
  level: 'debug', // 최소 레벨
  // 파일저장
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'log/system.log',
      zippedArchive: false,
      format: winston.format.printf(
        info => `${new Date().toFormat('YYYY-MM-DD HH24:MILSS')} [${info.level.toUpperCase()}] - ${info.message}`)
    }),
    // 콘솔 출력
    new winston.transports.Console({
      format: winston.format.printf(
        info => `${new Date().toFormat('YYYY-MM-DD HH24:MI:SS')} [${info.level.toUpperCase()}] - ${info.message}`)
    })
  ]
});

module.exports = logger;
