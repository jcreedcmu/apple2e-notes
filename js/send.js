// This script sends some raw machine code over to an Apple ][e.
// Usage: at startup, do
// ] IN#2
// on the Apple ][e side. Then run this script.

const { compile } = require('./compile');
const { promisify } = require('util');
const DEBUG = false;

const exec = promisify(require('child_process').exec);
const fs = require('fs');
const out = DEBUG ? undefined : fs.createWriteStream('/dev/ttyUSB0');

function pause(ms) {
  return new Promise((res, rej) => {
	 setTimeout(() => res(), ms);
  });
}

async function outLine(line) {
  if (DEBUG) {
	 console.log(line);
  }
  else {
  out.write(line + '\n', 'ascii');
  await pause(500); // this pause is a fudge factor because e.g. text page scrolling
  }
}

async function init(env) {
  await exec('stty -F /dev/ttyUSB0 300 cs8 -cstopb -parenb -icanon istrip -ctlecho -echo');
  await outLine('CALL -151');

  // On the receiving side, switch to 9600 baud, 8 data 2 stop no parity
  await writeBytes(env.label.s_ctl, [0x09, 0x9E]);

  // On the sending side, wwitch to 9600 baud
  await exec('stty -F /dev/ttyUSB0 9600 cs8 cstopb -parenb -icanon istrip -ctlecho -echo');
}

// left-pad to `digits` hex digits
function numToHex(num, digits) {
  let rv = num.toString(16).toUpperCase();
  while (rv.length < digits) {
	 rv = '0' + rv;
  }
  return rv;
}

// expects addr to be a 2-byte hex string, data to be an array of numbers
async function writeBytes(addr, data) {
  let addrNum = parseInt(addr, 16);

  let ptr = 0;

  do {
	 const bytesToWrite = Math.min(8, data.length - ptr);
	 const addrText = numToHex(addrNum + ptr, 4);
	 const bytesText = data.slice(ptr, ptr + bytesToWrite).map(x => numToHex(x, 2)).join(' ');
	 await outLine(`${addrText}: ${bytesText}`);
	 ptr += bytesToWrite;
  } while (ptr < data.length);

}

// expects addr to be a 2-byte hex string, returns an array of numbers
function addrToBytes(addr) {
  const addrNum = parseInt(addr, 16);
  const lob = addrNum & 0xff;
  const hib = addrNum >> 8;
  return [lob, hib];
}

async function sendProgram(env) {
  // put interrupt handler in memory
  await writeBytes(env.label.irq, env.binary);

  // install handler in interrupt vector
  await writeBytes(env.label.interrupt, addrToBytes(env.label.irq));
}

async function runProgram(env) {
  await outLine(`${env.label.enable}G`);
  await pause(500);
}

async function go() {
  // const env = await compile();
  // await init(env);
  // await sendProgram(env);
  // await runProgram(env);
  out.write('A');
}

go();
