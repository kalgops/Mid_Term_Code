class AIEngine {
  constructor(debuggerRef, cue, balls, table) {
    this.debugger = debuggerRef;
    this.cue = cue;
    this.balls = balls;
    this.table = table;
  }

  getBestShot() {
    this.debugger.log("AIEngine: searching for best shot...");
    let bestShot = null;
    let maxScore = -Infinity;

    for (let ball of this.balls) {
      if (ball.isPotted || ball.label === 'Cue') continue;

      let predictedScore = this.simulateShot(ball);
      if (predictedScore > maxScore) {
        maxScore = predictedScore;
        bestShot = ball;
      }
    }

    if (bestShot) {
      this.debugger.log(`AI targets ball: ${bestShot.label}`);
      let angle = this.calculateAngle(this.cue.ball.body.position, bestShot.body.position);
      let power = random(40, 80); // Adjust as needed
      return { angle, power };
    }

    this.debugger.log("AI found no valid shots.");
    return { angle: random(0, TWO_PI), power: random(10, 50) }; // Random fallback
  }

  calculateAngle(from, to) {
    let dx = to.x - from.x;
    let dy = to.y - from.y;
    return Math.atan2(dy, dx);
  }

  simulateShot(targetBall) {
    // Simulate scoring; simplistic for now
    let distance = dist(
      this.cue.ball.body.position.x,
      this.cue.ball.body.position.y,
      targetBall.body.position.x,
      targetBall.body.position.y
    );
    return 10 / distance; // Favor closer shots
  }
}
