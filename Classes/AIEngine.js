/** AIEngine.js
 * Enhanced AI engine for Mode 4 that takes into account SnookerRulesAdvanced
 */
class AIEngine {
  constructor(debuggerRef, cue, balls, table, snookerRules) {
    this.debugger = debuggerRef;
    this.cue = cue;
    this.balls = balls;
    this.table = table;
    this.snookerRules = snookerRules;
  }

  // Main entry point for AI to determine its shot
  getBestShot() {
    this.debugger.log("AIEngine: searching for best shot (ADVANCED)...");

    // If there's no next legal ball (e.g. unknown state), fallback randomly
    if (!this.snookerRules || !this.snookerRules.ballOn) {
      this.debugger.log("No advanced snooker rules or ballOn unknown — fallback shot.");
      return this.getFallbackShot();
    }

    // 1) Gather a list of candidate balls that the AI is legally allowed to target
    let candidates = this.getLegalTargetsForState();
    if (candidates.length === 0) {
      this.debugger.log("No valid balls to target, going for random fallback shot.");
      return this.getFallbackShot();
    }

    // 2) Evaluate pot potential for each candidate
    let bestShot = null;
    let bestScore = -Infinity;

    for (let ball of candidates) {
      // Example: We simulate pot probability, plus a weighting for the ball value
      let potChance = this.estimatePotChance(ball);
      let ballValue = this.getBallValue(ball.label);
      let expectedScore = potChance * ballValue; 
      
      // Possibly consider “position for next color” or “safety factor”
      // For demonstration, we just compare pot chance × ballValue
      if (expectedScore > bestScore) {
        bestScore = expectedScore;
        bestShot = ball;
      }
    }

    // 3) If bestShot is still null or negative, attempt a safety
    if (!bestShot || bestScore < 0.1) {
      this.debugger.log("No good pot found. Attempting safety shot.");
      return this.getSafetyShot();
    }

    // 4) Return an angle/power to pot that bestShot
    this.debugger.log(`AI found best target: ${bestShot.label} (expected = ${bestScore.toFixed(2)})`);
    let shot = this.getOffensiveShot(bestShot);

    // For debugging, log the shot details
    this.debugger.logShot({
      shotType: 'offensive',
      targetBallLabel: bestShot.label,
      angle: shot.angle,
      power: shot.power,
      expectedScore: bestScore
    });

    return shot;
  }

  /**
   * In advanced snooker, the “ball on” might be Red or one of the colors.
   * If ballOn is 'Red', we only target reds that aren’t potted.
   * If ballOn is a color, we only target that color ball (and if none exist, fallback).
   */
  getLegalTargetsForState() {
    let targets = [];
    let currentBallOn = this.snookerRules.ballOn;
    
    // If we're in the final sequence (no reds left) and must pot a color in a certain order,
    // the snookerRules.nextColorIndex might tell us exactly which color is next.
    // For a simple example, let's rely on ballOn alone.

    // If ballOn === 'Red', get all unpotted red balls
    if (currentBallOn === 'Red') {
      targets = this.balls.filter(b => b.label.startsWith('Red') && !b.isPotted);
    } 
    // Else if ballOn is a color
    else if (['Yellow','Green','Brown','Blue','Pink','Black'].includes(currentBallOn)) {
      targets = this.balls.filter(
        b => b.label === currentBallOn && !b.isPotted
      );
    }

    return targets;
  }

  /**
   * For demonstration, we estimate pot chance by distance to pocket
   * or purely by distance to the ball. The real approach would be more sophisticated.
   * For now, let's just do an inverse distance to cue ball.
   */
  estimatePotChance(targetBall) {
    let distance = dist(
      this.cue.ball.body.position.x,
      this.cue.ball.body.position.y,
      targetBall.body.position.x,
      targetBall.body.position.y
    );
    // Arbitrary simple formula: pot chance = clamp(1 - (distance / 800), 0..1)
    let chance = 1 - (distance / 800);
    return Math.max(0, Math.min(chance, 1));
  }

  /**
   * Offensive shot: we simply aim from cue ball to the target ball,
   * with a moderate to high power (but not too high).
   */
  getOffensiveShot(targetBall) {
    // angle
    let angle = this.calculateAngle(
      this.cue.ball.body.position, 
      targetBall.body.position
    );
    // power: depends on distance or a random range
    let distance = dist(
      this.cue.ball.body.position.x,
      this.cue.ball.body.position.y,
      targetBall.body.position.x,
      targetBall.body.position.y
    );
    // For example, scale power from 30 to 90
    let scaledPower = map(distance, 50, 800, 30, 90, true);
    let power = constrain(scaledPower, 25, 90);

    return { angle, power };
  }

  /**
   * Basic fallback shot: random angle, moderate power.
   */
  getFallbackShot() {
    return {
      angle: random(0, TWO_PI),
      power: random(10, 50)
    };
  }

  /**
   * Attempt a safety: choose an angle that sends the cue ball away
   * from any easy pot for the opponent. This is extremely simplified.
   * 
   * For demonstration, let's aim at a cushion or pick a ball that is far away
   * and tap lightly so it’s left safe.
   */
  getSafetyShot() {
    // 1) Find a location on the table far from any pockets
    let safeX = this.table.x + this.table.width * 0.5;
    let safeY = this.table.y + this.table.height * 0.5;
    // 2) Some random offset
    safeX += random(-100, 100);
    safeY += random(-100, 100);

    let angle = this.calculateAngle(
      this.cue.ball.body.position,
      { x: safeX, y: safeY }
    );

    // Low power
    let power = random(20, 40);

    this.debugger.log("AI is taking a safety shot");
    this.debugger.logShot({
      shotType: 'safety',
      targetBallLabel: 'No direct pot attempt',
      angle,
      power,
      expectedScore: 0
    });

    return { angle, power };
  }

  /**
   * Compute a straightforward angle from point A to B
   */
  calculateAngle(from, to) {
    let dx = to.x - from.x;
    let dy = to.y - from.y;
    return Math.atan2(dy, dx);
  }

  /**
   * Retrieve numeric value for each color. For reds, we return 1.
   */
  getBallValue(label) {
    if (label.startsWith('Red')) return 1;
    let mapColor = {
      Yellow: 2,
      Green: 3,
      Brown: 4,
      Blue: 5,
      Pink: 6,
      Black: 7
    };
    return mapColor[label] || 0;
  }
}
