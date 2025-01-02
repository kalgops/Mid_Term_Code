class Cue {
  /**
   * @param {Ball} ball   (the cue ball object)
   * @param {Matter.Engine} engine
   * @param {Table} table
   */
  constructor(ball, engine, table) {
    this.ball = ball; 
    this.engine = engine;
    this.table = table;

    // Basic angle/power
    this.angle = 0;
    this.power = 50;
    this.maxPower = 100;

    // Animation offsets
    this.offsetFromBall = 75;
    this.minOffset = 0;
    this.maxOffset = 75;
    this.pullbackSpeed = 5;
    this.strikeForwardSpeed = 12;
    this.isStriking = false;

    // Visible or not
    this.isVisible = true;

    // Gradient for the cue
    this.gradientStart = color(160, 82, 45);
    this.gradientEnd   = color(205, 133, 63);

    // Optional cue hit sound
    try {
      this.audioCueHit = loadSound('assets/cue_hit.mp3',
        () => console.log("cue_hit.mp3 loaded."),
        () => console.error("Failed to load cue_hit.mp3")
      );
    } catch(err) {
      console.error("cue_hit audio load error:", err);
    }
  }

  setAngleFromMouse(mx, my) {
    if (!this.ball || this.ball.isPotted) return;
    let dx = mx - this.ball.body.position.x;
    let dy = my - this.ball.body.position.y;
    this.angle = Math.atan2(dy, dx);
  }

  update() {
    if (!this.ball || this.ball.isPotted) return;

    if (this.isStriking) {
      if (this.offsetFromBall > this.minOffset) {
        this.offsetFromBall -= this.strikeForwardSpeed;
        if (this.offsetFromBall <= this.minOffset) {
          this.offsetFromBall = this.minOffset;
          this.applyStrikeForce();
          // reset
          this.offsetFromBall = this.maxOffset;
          this.isStriking = false;
        }
      }
    } else {
      // slowly return to pulled-back
      if (this.offsetFromBall < this.maxOffset) {
        this.offsetFromBall += this.pullbackSpeed;
        if (this.offsetFromBall > this.maxOffset) {
          this.offsetFromBall = this.maxOffset;
        }
      }
    }
  }

  applyStrikeForce() {
    if (!this.ball || this.ball.isPotted) return;
    let forceMag = (this.power / 100) * 0.02; 
    let force = {
      x: forceMag * Math.cos(this.angle),
      y: forceMag * Math.sin(this.angle)
    };
    Matter.Body.applyForce(this.ball.body, this.ball.body.position, force);

    // optional small random spin
    let torque = random(-0.00005, 0.00005);
    Matter.Body.setAngularVelocity(this.ball.body, torque);

    // Sound effect
    if (this.audioCueHit && this.audioCueHit.isLoaded()) {
      let vol = map(forceMag, 0, 0.02, 0.2, 1);
      this.audioCueHit.setVolume(vol);
      this.audioCueHit.play();
    }
  }

  triggerStrike() {
    if (!this.ball || this.ball.isPotted) return;
    this.isStriking = true;
  }

  draw() {
    if (!this.isVisible || !this.ball || this.ball.isPotted) return;

    push();
    let bx = this.ball.body.position.x;
    let by = this.ball.body.position.y;

    // front near ball
    let x1 = bx - (this.ball.diameter/2 + this.offsetFromBall)*Math.cos(this.angle);
    let y1 = by - (this.ball.diameter/2 + this.offsetFromBall)*Math.sin(this.angle);

    let cueLength = 150;
    let x2 = x1 - cueLength * Math.cos(this.angle);
    let y2 = y1 - cueLength * Math.sin(this.angle);

    // thickness
    let halfW = 4;
    let perp = this.angle + HALF_PI;

    let cx1 = x1 + halfW*Math.cos(perp);
    let cy1 = y1 + halfW*Math.sin(perp);
    let cx2 = x1 - halfW*Math.cos(perp);
    let cy2 = y1 - halfW*Math.sin(perp);

    let cx3 = x2 - halfW*Math.cos(perp);
    let cy3 = y2 - halfW*Math.sin(perp);
    let cx4 = x2 + halfW*Math.cos(perp);
    let cy4 = y2 + halfW*Math.sin(perp);

    // gradient
    let steps = 20;
    beginShape(TRIANGLE_STRIP);
    for (let i = 0; i <= steps; i++) {
      let t = i / steps;
      let ix1 = lerp(cx1, cx4, t);
      let iy1 = lerp(cy1, cy4, t);
      let ix2 = lerp(cx2, cx3, t);
      let iy2 = lerp(cy2, cy3, t);
      let col = lerpColor(this.gradientStart, this.gradientEnd, t);
      fill(col);
      noStroke();
      vertex(ix1, iy1);
      vertex(ix2, iy2);
    }
    endShape();

    // outline
    stroke(0);
    strokeWeight(1);
    noFill();
    beginShape();
    vertex(cx1, cy1);
    vertex(cx2, cy2);
    vertex(cx3, cy3);
    vertex(cx4, cy4);
    endShape(CLOSE);

    pop();
  }
}
