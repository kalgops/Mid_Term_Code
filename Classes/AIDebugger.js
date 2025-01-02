class AIDebugger {
  constructor() {
    this.logHistory = [];
    this.maxLogSize = 100;
  }
  log(msg) {
    console.log(`[AI-DEBUG] ${msg}`);
    this.logHistory.push(msg);
    if (this.logHistory.length > this.maxLogSize) {
      this.logHistory.shift();
    }
  }
}
