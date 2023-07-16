// This script sends some raw machine code over to an Apple ][e.
// Usage: at startup, do
// ] IN#2
// on the Apple ][e side. Then run this script.

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');
const out = fs.createWriteStream('/dev/ttyUSB0');

function pause(ms) {
  return new Promise((res, rej) => {
	 setTimeout(() => res(), ms);
  });
}

async function outLine(line) {
  out.write(line + '\n', 'ascii');
  await pause(500); // this pause is a fudge factor because e.g. text page scrolling
}

async function init() {
  await exec('stty -F /dev/ttyUSB0 300 cs8 -cstopb -parenb -icanon istrip -ctlecho -echo');
  await outLine('CALL -151');

  // On the receiving side, switch to 9600 baud, 8 data 2 stop no parity
  await outLine('C0AA: 09 9E');

  // On the sending side, wwitch to 9600 baud
  await exec('stty -F /dev/ttyUSB0 9600 cs8 cstopb -parenb -icanon istrip -ctlecho -echo');
}

async function sendProgram() {
  await outLine('03FE: 00 20');

  // BUF EQU $2100
  // RDSERIAL EQU $C0A8
  // STATUS EQU $C0A9

  // .ORG $2000
  // PHA
  // TXA
  // PHA
  // JSR $FF3A
  // LDA STATUS
  // STA BUF
  // PLA
  // TAX
  // PLA
  // RTI

  // ENABLE: CLI
  // RTS

  await outLine('2000: 48 8A 48 20 3A FF AD A9');
  await outLine('2008: C0 8D 00 21 68 AA 68 40');
  await outLine('2010: 58 60');
}

async function runProgram() {
  await outLine('2010G');
  await pause(500);
}

async function go() {
  await init();
  await sendProgram();
  await runProgram();
  out.write('a');
}

go();
