/************************************************************
 * AIEngine.js
 * 
 * A more advanced AI that tries to find direct lines 
 * from each target ball to a pocket, checks if the path 
 * is blocked, and estimates a suitable power. 
 * If no pot is feasible, it performs a safety shot.
 ************************************************************/

class AIEngine {
    constructor(debuggerRef, cue, balls, table) {
      this.debugger = debuggerRef;   // instance of AIDebugger for logs
      this.cue = cue;                // we can set angle & power on the Cue
      this.balls = balls;            // reference to all balls
      this.table = table;            // reference to Table (pockets, geometry)
    }
  
    /**
     * Decide the best shot based on a simple line-of-sight approach
     * and short heuristics. 
     * For advanced snooker logic, you'd incorporate "RED_REQUIRED"/"COLOR_REQUIRED" states, etc.
     */
    getBestShot() {
      this.debugger.log("AIEngine: searching for best shot...");
  
      // 1) Identify candidate balls (e.g., all non-potted except cue).
      let targetBalls = this.findTargetBalls();
  
      // 2) For each candidate ball, see if there's a direct line to any pocket.
      let candidateShots = [];
      for (let ball of targetBalls) {
        let lines = this.findLinesToPockets(ball);
        for (let line of lines) {
          // line has { angle, distance, etc. }
          let power = this.estimatePower(line.distance);
          let shotScore = this.simulateShot(ball, line.angle, power);
  
          candidateShots.push({
            angle: line.angle,
            power: power,
            score: shotScore,
            ballLabel: ball.label
          });
        }
      }
  
      // 3) Sort by best score
      candidateShots.sort((a, b) => b.score - a.score);
      let best = candidateShots[0];
  
      if (!best) {
        // no direct pot found => do a "safety" shot
        this.debugger.log("No direct pot found. Doing a safety shot.");
        return this.getSafetyShot();
      } else {
        this.debugger.log(
          `Selected best shot => angle=${(degrees(best.angle)).toFixed(1)}°, power=${best.power.toFixed(1)}%, score=${best.score.toFixed(1)}`
        );
        return { angle: best.angle, power: best.power };
      }
    }
  
    /**
     * For demonstration, we simply gather all non-potted balls except the Cue.
     * In real snooker logic, you'd handle the "ball on" (red or color).
     */
    findTargetBalls() {
      let result = this.balls.filter(b => !b.isPotted && b.label !== 'Cue');
      return result;
    }
  
    /**
     * For each pocket, we see if there's a direct line from the ball center to the pocket
     * that is not blocked by any other ball.
     */
    findLinesToPockets(ball) {
      let lines = [];
      let bx = ball.body.position.x;
      let by = ball.body.position.y;
  
      for (let p of this.table.pockets) {
        let px = p.position.x;
        let py = p.position.y;
  
        let angle = Math.atan2(py - by, px - bx);
        let dist = dist(bx, by, px, py);
        // Check if path is blocked
        if (!this.isPathBlocked(bx, by, px, py, ball)) {
          lines.push({
            angle: angle,
            distance: dist
          });
        }
      }
      return lines;
    }
  
    /**
     * isPathBlocked:
     *   Casts a ray from (sx,sy) to (ex,ey). If any other ball 
     *   is near that line, we say it's blocked.
     */
    isPathBlocked(sx, sy, ex, ey, ignoreBall) {
      for (let b of this.balls) {
        if (b === ignoreBall || b.label === 'Cue' || b.isPotted) continue;
        let cx = b.body.position.x;
        let cy = b.body.position.y;
        let r = b.diameter / 2;
  
        // distance from the ball center to the line segment
        let d = this.distPointToSegment(cx, cy, sx, sy, ex, ey);
        if (d < r) {
          // check if the ball is actually between these points
          let proj = this.projectionAlongSegment(sx, sy, ex, ey, cx, cy);
          let segLen = dist(sx, sy, ex, ey);
          if (proj > 0 && proj < segLen) {
            // blocked
            return true;
          }
        }
      }
      return false;
    }
  
    // distance from point (px,py) to segment (sx,sy)->(ex,ey)
    distPointToSegment(px, py, sx, sy, ex, ey) {
      let A = px - sx;
      let B = py - sy;
      let C = ex - sx;
      let D = ey - sy;
  
      let dot = A*C + B*D;
      let lenSq = C*C + D*D;
      let param = (lenSq !== 0) ? (dot / lenSq) : -1;
  
      if (param < 0) param = 0;
      else if (param > 1) param = 1;
  
      let xx = sx + param * C;
      let yy = sy + param * D;
      return dist(px, py, xx, yy);
    }
  
    // returns the scalar projection length of (px,py) onto (sx,sy)->(ex,ey)
    projectionAlongSegment(sx, sy, ex, ey, px, py) {
      let segLen = dist(sx, sy, ex, ey);
      if (segLen === 0) return 0;
  
      let ux = ex - sx;
      let uy = ey - sy;
      let vx = px - sx;
      let vy = py - sy;
  
      let dot = ux*vx + uy*vy;
      let param = dot / (segLen*segLen);
  
      return param * segLen;
    }
  
    /**
     * estimatePower:
     *   A simple function that picks a power based on distance to the pocket.
     */
    estimatePower(distance) {
      // E.g. we map 0..800 px to 20..80% power
      let p = map(distance, 0, 800, 20, 80, true);
      return p;
    }
  
    /**
     * simulateShot:
     *   In a robust approach, you'd do a mini simulation. 
     *   Here, we just create a heuristic "score."
     */
    simulateShot(ball, angle, power) {
      let baseScore = 100;
      // If power is too high or too low, penalize
      let ideal = 50;
      let penalty = Math.abs(power - ideal);
      let finalScore = baseScore - penalty + random(-10, 10);
      return finalScore;
    }
  
    /**
     * If no pot is found, we do a "safety" shot: 
     *  a gentle random strike, hoping to keep the opponent from an easy pot.
     */
    getSafetyShot() {
      let angle = random(0, TWO_PI);
      let power = random(10, 25);
      this.debugger.log(`AIEngine: safety shot => angle=${degrees(angle).toFixed(1)}°, power=${power.toFixed(1)}%`);
      return { angle, power };
    }
  }
  