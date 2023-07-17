const { promisify } = require('util');
const fs = require('fs');
const exec = promisify(require('child_process').exec);

async function compile() {
  await exec('mkdir -p out');
  await exec('xa asm/serial.asm -o out/serial.o -l out/serial.label');
  const binary = fs.readFileSync('out/serial.o');
  const labels = fs.readFileSync('out/serial.label', 'utf8')
		  .split('\n')
		  .filter(x => x.length > 0)
		  .map(x => x.split(', '))
		  .map(x => [x[0].toLowerCase(), x[1].replace(/0x/, '').toUpperCase()]);
  const labelDict = Object.fromEntries(labels);
  return {binary: Array.from(binary), label: labelDict};
}

module.exports.compile = compile
