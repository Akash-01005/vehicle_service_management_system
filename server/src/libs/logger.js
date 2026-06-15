import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(),'logs');
fs.mkdirSync(logsDir,{recursive:true});

const logFile = path.join(logsDir,'server.log');
const stream = fs.createWriteStream(logFile,{flags:'a'});
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
const origInfo = console.info;

const formatTimestamp = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const stringify = (arg) => {
  try {
    if (typeof arg === 'string') return arg;
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
};

const formatArgs = (args) => args.map(stringify).join(' ');
console.log = (...args) => { origLog(...args); stream.write(`[${formatTimestamp()}] INFO: ${formatArgs(args)}\n`); };
console.info = (...args) => { origInfo(...args); stream.write(`[${formatTimestamp()}] INFO: ${formatArgs(args)}\n`); };
console.warn = (...args) => { origWarn(...args); stream.write(`[${formatTimestamp()}] WARN: ${formatArgs(args)}\n`); };
console.error = (...args) => { origError(...args); stream.write(`[${formatTimestamp()}] ERROR: ${formatArgs(args)}\n`); };
process.on('uncaughtException', (err) => { origError(err); stream.write(`[${formatTimestamp()}] UNCAUGHT_EXCEPTION: ${err && err.stack ? err.stack : String(err)}\n`); stream.end(() => process.exit(1)); });
process.on('unhandledRejection', (reason) => { origError('Unhandled Rejection:', reason); stream.write(`[${formatTimestamp()}] UNHANDLED_REJECTION: ${reason && reason.stack ? reason.stack : String(reason)}\n`); });
