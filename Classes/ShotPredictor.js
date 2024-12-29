class ShotPredictor {
  constructor(cue, table, balls) {
    this.cue = cue;
    this.table = table;
    this.balls = balls;
    this.dotSpacing = 14;    // spacing between “dots” on the line
    this.maxSteps = 30;      // total dots
  }

  drawPrediction() {
    if (!this.cue || !this.cue.ball || this.cue.ball.isPotted) return;

    push();
    stroke(0, 255, 0, 180); // green, slightly transparent
    strokeWeight(3);
    noFill();

    let angle = this.cue.angle;
    // convert power (0–100%) => speed
    let powerFrac = this.cue.power / 100;
    let speed = powerFrac * 20; // base speed

    let simX = this.cue.ball.body.position.x;
    let simY = this.cue.ball.body.position.y;
    let vx = speed * cos(angle);
    let vy = speed * sin(angle);

    // We'll draw small line segments or “dots” at intervals
    for (let i = 0; i < this.maxSteps; i++) {
      // move simulation
      simX += vx;
      simY += vy;

      // check cushions
      if (simX <= this.table.x + (this.cue.ball.diameter / 2) ||
          simX >= (this.table.x + this.table.width - (this.cue.ball.diameter / 2))) {
        vx = -vx;
      }
      if (simY <= this.table.y + (this.cue.ball.diameter / 2) ||
          simY >= (this.table.y + this.table.height - (this.cue.ball.diameter / 2))) {
        vy = -vy;
      }

      // draw a short dotted segment
      point(simX, simY);

      // skip ahead by dotSpacing
      let stepDist = this.dotSpacing;
      let norm = sqrt(vx*vx + vy*vy);
      if (norm > 0) {
        let stepX = (vx / norm) * stepDist;
        let stepY = (vy / norm) * stepDist;
        simX += stepX;
        simY += stepY;
      }
    }

    pop();
  }
}
