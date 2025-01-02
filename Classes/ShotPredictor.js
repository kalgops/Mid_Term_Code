class ShotPredictor {
  constructor(cue, table, balls) {
    this.cue = cue;
    this.table = table;
    this.balls = balls;
    this.dotSpacing = 14;
    this.maxSteps = 30;
  }

  drawPrediction() {
    if (!this.cue || !this.cue.ball || this.cue.ball.isPotted) return;

    push();
    stroke(0, 255, 0, 180);
    strokeWeight(3);
    noFill();

    let angle = this.cue.angle;
    let powerFrac = this.cue.power / 100;
    let speed = powerFrac * 20; // arbitrary

    let simX = this.cue.ball.body.position.x;
    let simY = this.cue.ball.body.position.y;
    let vx = speed * cos(angle);
    let vy = speed * sin(angle);

    for (let i = 0; i < this.maxSteps; i++) {
      simX += vx;
      simY += vy;

      // bounce from cushions
      if (simX <= this.table.x + this.cue.ball.diameter/2 ||
          simX >= this.table.x+this.table.width - this.cue.ball.diameter/2) {
        vx = -vx;
      }
      if (simY <= this.table.y + this.cue.ball.diameter/2 ||
          simY >= this.table.y+this.table.height - this.cue.ball.diameter/2) {
        vy = -vy;
      }

      point(simX, simY);

      // skip by dotSpacing
      let distStep = this.dotSpacing;
      let norm = sqrt(vx*vx + vy*vy);
      if (norm > 0) {
        let sx = (vx/norm)*distStep;
        let sy = (vy/norm)*distStep;
        simX += sx;
        simY += sy;
      }
    }
    pop();
  }
}
