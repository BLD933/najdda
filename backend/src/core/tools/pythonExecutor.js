const { spawn } = require('child_process');

/**
 * Executes a python script and parses the stdout as JSON.
 * @param {string} scriptPath - The absolute or relative path to the python script.
 * @param {string[]} args - The arguments to pass to the script (e.g. ['--drugs', 'Aspirin, Warfarin'])
 * @returns {Promise<Object>} - The parsed JSON result.
 */
function executePythonSkill(scriptPath, args) {
  return new Promise((resolve, reject) => {
    // We use python3, as it's standard on macOS/Linux
    const process = spawn('python3', [scriptPath, ...args]);
    let stdoutData = '';
    let stderrData = '';
    let settled = false;

    // Without this listener, a failed launch (ENOENT: python3 missing, or the
    // script not on disk) emits an unhandled 'error' event and takes down the
    // process — the surrounding try/catch cannot catch that.
    process.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(new Error(`Failed to launch python3 for ${scriptPath}: ${err.message}`));
    });

    process.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    process.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        console.error(`Python script ${scriptPath} exited with code ${code}`);
        console.error(`Stderr: ${stderrData}`);
        return reject(new Error(`Python script failed: ${stderrData}`));
      }

      try {
        const jsonResult = JSON.parse(stdoutData);
        resolve(jsonResult);
      } catch (err) {
        console.error('Failed to parse python output as JSON', err);
        console.error('Raw output:', stdoutData);
        reject(new Error('Failed to parse JSON from python script. Check backend console.'));
      }
    });
  });
}

module.exports = { executePythonSkill };
