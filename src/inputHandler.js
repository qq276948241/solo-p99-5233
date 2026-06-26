const readline = require('readline');

class InputHandler {
  constructor(stdin = process.stdin, stdout = process.stdout) {
    this.stdin = stdin;
    this.stdout = stdout;
    this.rl = null;
    this.timeoutId = null;
    this.resolved = false;
  }

  collectInput(expected, timeoutSeconds) {
    return new Promise((resolve) => {
      this._clearPending();
      this.resolved = false;

      const startTime = Date.now();
      const timeoutMs = timeoutSeconds * 1000;

      const rl = readline.createInterface({
        input: this.stdin,
        output: this.stdout,
        terminal: true
      });

      this.rl = rl;

      this.timeoutId = setTimeout(() => {
        if (this.resolved) return;
        const timeUsed = (Date.now() - startTime) / 1000;
        this.resolved = true;
        rl.close();
        resolve(this._result(false, true, '', timeUsed));
      }, timeoutMs);

      rl.setPrompt('> ');
      rl.prompt();

      rl.on('line', (line) => {
        if (this.resolved) return;
        this._clearTimeout();
        const timeUsed = (Date.now() - startTime) / 1000;
        this.resolved = true;
        rl.close();

        if (timeUsed > timeoutSeconds) {
          resolve(this._result(false, true, line, timeUsed));
        } else {
          resolve(this._result(line === expected, false, line, timeUsed));
        }
      });

      rl.on('close', () => {
        if (this.resolved) return;
        const timeUsed = (Date.now() - startTime) / 1000;
        this.resolved = true;
        if (timeUsed > timeoutSeconds) {
          resolve(this._result(false, true, '', timeUsed));
        }
      });
    });
  }

  _clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  _clearPending() {
    this._clearTimeout();
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  _result(success, timeout, input, timeUsed) {
    return { success, timeout, input, timeUsed };
  }

  cancel() {
    this._clearPending();
  }
}

module.exports = InputHandler;
