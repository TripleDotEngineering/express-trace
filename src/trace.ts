/* eslint-disable no-console */
/**
 * @module middleware/trace
 *
 * @description Used to log things and provide a request-specific logger.
 */
import chalk from 'chalk';

/**
 * This is the log function ...
 */
function traceLogger(req: any) {
  const levels = ['error', 'warn', 'info', 'verbose', 'debug'];
  let maxLen = 0;
  levels.forEach(s => {
    if (s.length > maxLen) {
      maxLen = s.length;
    }
  });

  const logFunc = (lvl: any, s: any) => {
    // Timestamp and log level
    const now = new Date();
    const ts = chalk.yellowBright(`${now.toISOString()}`);
    const level = lvl.toUpperCase();

    // File and line
    const e = new Error();
    const stackLine = e ? e.stack?.split('\n')[3] : 'Error undefined.';
    const lineStrParts = stackLine?.split('/').slice(-1)[0].split(':').slice(0, -1);
    const lineStr = [chalk.cyan(lineStrParts[0]), chalk.yellow(lineStrParts[1])].join(':');
    const f = lineStr?.replace(')', '').replace('.js', '').padEnd(16, ' ');

    // Log stuff
    const coloredLevel = chalk.bold(colorLevel(level)).padEnd(maxLen, ' ');
    const traceId = chalk.magentaBright(req.traceId);
    console.log(`${ts} [ ${coloredLevel} ] ${traceId}  ${f} :: ${s}`);
  };

  const result : any = {};
  levels.forEach(lvl => {
    result[lvl] = (s : any) => { logFunc(lvl, s); };
  });

  return result;
}


function colorLevel(level: string) {
  if (level === 'ERROR') {
    return chalk.redBright(level);
  }
  else if (level === 'WARN') {
    return chalk.yellowBright(level);
  }
  else if (level === 'INFO') {
    return chalk.blueBright(level);
  }
  else if (level === 'VERBOSE') {
    return chalk.cyanBright(level);
  }
  else if (level === 'DEBUG') {
    return chalk.greenBright(level);
  }
  else {
    return chalk.whiteBright(level);
  }
}

function getIp(req: any) {
  let ip = req.ip;

  // Return early if IP is not defined
  if (!req.ip) {
    return '';
  }

  else if (req.ip === '::1') {
    ip = '127.0.0.1';
  }
  // If IP starts with ::ffff:, remove the ::ffff:
  else if (req.ip && req.ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  // Return the IP address
  return ip;
}


export default function trace(req: any, res: any, next: any) {
  // Set a random Trace ID
  const rand = Math.random().toString().slice(2, 8) + process.hrtime.bigint().toString().slice(-8);
  req.traceId = Buffer.from(rand).toString('base64');
  req.requestTime = Date.now();

  req.log = traceLogger(req);

  // Things to be logged
  const ip = getIp(req);
  const method = req.method;
  const url = req.url;

  // Log on request
  console.log(''.padEnd(100, '-'));
  req.log.info(`START: ${ip} - ${method} ${url}`);

  // Log at end
  res.on('finish', function() {
    const elapsed = Date.now() - req.requestTime;
    const status = `${res.statusCode}`;
    const contentLength = res.get('Content-Length') || '-';
    req.log.info(`END: ${ip} - ${method} ${url} ${status} ${contentLength} ${elapsed} ms`);
  });

  // Continue request
  next();
}
