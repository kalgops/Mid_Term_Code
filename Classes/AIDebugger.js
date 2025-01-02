/** 
 * AIDebugger.js
 * 
 * Enhanced Debugger to assist in “Mode 4” advanced AI logging.
 */
class AIDebugger {
  constructor() {
    this.logHistory = [];
    this.maxLogSize = 100;
    this.debugEnabled = true;  // Additional flag to enable/disable debug logging
  }

  log(msg) {
    if (!this.debugEnabled) return;
    console.log(`[AI-DEBUG] ${msg}`);
    this.logHistory.push(msg);
    if (this.logHistory.length > this.maxLogSize) {
      this.logHistory.shift();
    }
  }

  /* 
   * Logs a complex shot object for advanced debugging.
   * Example usage:
   *   this.logShot({ targetBallLabel, angle, power, expectedScore, shotType });
   */
  logShot(shotInfo) {
    if (!this.debugEnabled) return;
    let details = JSON.stringify(shotInfo);
    console.log(`[AI-DEBUG:SHOT] ${details}`);
    this.logHistory.push(`SHOT: ${details}`);
    if (this.logHistory.length > this.maxLogSize) {
      this.logHistory.shift();
    }
  }

  /*
   * Optionally, you can add methods to toggle debugging on/off:
   */
  setDebug(enabled) {
    this.debugEnabled = enabled;
  }
}
