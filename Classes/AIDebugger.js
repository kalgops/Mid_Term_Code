/************************************************************
 * AIDebugger.js
 * 
 * A simple logger and optional game-state checker 
 * for diagnosing AI or game logic issues.
 ************************************************************/

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
  
    // Example: check if redsRemaining matches actual table reds
    checkGameState(balls, snookerRules) {
      let redCountOnTable = balls.filter(b => b.label.startsWith('Red') && !b.isPotted).length;
      if (redCountOnTable < snookerRules.redsRemaining) {
        this.log(`WARNING: mismatch in red ball count => table has ${redCountOnTable}, but rules say ${snookerRules.redsRemaining}`);
      }
      // ... other checks as needed
    }
  }
  