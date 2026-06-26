const readline = require('readline');

class InputHandler {
  constructor(stdin = process.stdin, stdout = process.stdout) {
    this.stdin = stdin;
    this.stdout = stdout;
    this.rl = null;
  }

  collectInput(expected, timeoutSeconds) {
    return new Promise((resolve) => {
      let timedOut = false;
      const startTime = Date.now();

      const rl = readline.createInterface({
        input: this.stdin,
        output: this.stdout,
        terminal: true
      });

      this.rl = rl;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        rl.close();
      }, timeoutSeconds * 1000);

      rl.setPrompt('> ');
      rl.prompt();

      rl.on('line', (line) => {
        clearTimeout(timeoutId);
        const timeUsed = (Date.now() - startTime) / 1000;
        rl.close();

        if (timedOut) {
          resolve(this._result(false, true, line, timeUsed));
        } else {
          resolve(this._result(line === expected, false, line, timeUsed));
        }
      });

      rl.on('close', () => {
        if (timedOut) {
          const timeUsed = (Date.now() - startTime) / 1000;
          resolve(this._result(false, true, '', timeUsed));
        }
      });
    });
  }

  _result(success, timeout, input, timeUsed) {
    return { success, timeout, input, timeUsed };
  }

  cancel() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

module.exports = InputHandler;
