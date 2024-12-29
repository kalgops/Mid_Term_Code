class Cue {
  constructor(ball, engine, table) {
    this.ball = ball;
    this.engine = engine;
    this.table = table;

    // Angle & power
    this.angle = 0;
    this.power = 50;  
    this.maxPower = 100;

    // Animation offsets for the cue strike
    this.offsetFromBall = 75;   // start fully "pulled back" at 75 px
    this.minOffset = 0;         // offset at which the strike happens
    this.maxOffset = 75;        // how far we can pull back
    this.pullbackSpeed = 5;     // how quickly we move back to maxOffset when idle
    this.strikeForwardSpeed = 12; // how fast the strike happens
    this.isStriking = false;

    // If false, cue doesn't draw at all
    this.isVisible = true;

    // Gradient colors for the cue
    this.gradientStart = color(160, 82, 45);  // "sienna"
    this.gradientEnd   = color(205, 133, 63); // "peru"

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

  /**
   * Continuously aim the cue toward the mouse
   */
  setAngleFromMouse(mx, my) {
    if (!this.ball || this.ball.isPotted) return;
    let dx = mx - this.ball.body.position.x;
    let dy = my - this.ball.body.position.y;
    this.angle = atan2(dy, dx);
  }

  /**
   * Called every frame in draw() to handle the offset animations
   */
  update() {
    if (!this.ball || this.ball.isPotted) return;

    if (this.isStriking) {
      // Move offsetFromBall from current to minOffset (0) quickly
      if (this.offsetFromBall > this.minOffset) {
        this.offsetFromBall -= this.strikeForwardSpeed;
        if (this.offsetFromBall <= this.minOffset) {
          // We reached or passed the minOffset => apply strike
          this.offsetFromBall = this.minOffset;
          this.applyStrikeForce();

          // Return to pulled-back state
          this.offsetFromBall = this.maxOffset;
          this.isStriking = false;
        }
      }
    } else {
      // If not striking, gently ensure we're pulled back to maxOffset
      if (this.offsetFromBall < this.maxOffset) {
        this.offsetFromBall += this.pullbackSpeed;
        if (this.offsetFromBall > this.maxOffset) {
          this.offsetFromBall = this.maxOffset;
        }
      }
    }
  }

  /**
   * Called once we pass offset=0 during the strike
   */
  applyStrikeForce() {
    if (!this.ball || this.ball.isPotted) return;

    let forceMag = (this.power / 100) * 0.02;
    let force = {
      x: forceMag * cos(this.angle),
      y: forceMag * sin(this.angle)
    };
    Matter.Body.applyForce(this.ball.body, this.ball.body.position, force);

    // optional small torque
    let torque = random(-0.00005, 0.00005);
    Matter.Body.setAngularVelocity(this.ball.body, torque);

    // Sound
    if (this.audioCueHit && this.audioCueHit.isLoaded()) {
      let vol = map(forceMag, 0, 0.02, 0.2, 1);
      this.audioCueHit.setVolume(vol);
      this.audioCueHit.play();
    }
  }

  /**
   * Trigger the strike animation
   */
  triggerStrike() {
    if (!this.ball || this.ball.isPotted) return;
    this.isStriking = true;
  }

  /**
   * Draw the cue with a gradient rectangle
   */
  draw() {
    if (!this.isVisible || !this.ball || this.ball.isPotted) return;

    push();
    let bx = this.ball.body.position.x;
    let by = this.ball.body.position.y;

    // The "front" of the cue near the ball
    let x1 = bx - (this.ball.diameter / 2 + this.offsetFromBall) * cos(this.angle);
    let y1 = by - (this.ball.diameter / 2 + this.offsetFromBall) * sin(this.angle);

    let cueLength = 150;
    let x2 = x1 - cueLength * cos(this.angle);
    let y2 = y1 - cueLength * sin(this.angle);

    // We'll create a shape from x1,y1 to x2,y2 with thickness
    let halfW = 4; // half thickness
    let perpAngle = this.angle + HALF_PI;

    // corners near x1,y1
    let cx1 = x1 + halfW*cos(perpAngle);
    let cy1 = y1 + halfW*sin(perpAngle);
    let cx2 = x1 - halfW*cos(perpAngle);
    let cy2 = y1 - halfW*sin(perpAngle);

    // corners near x2,y2
    let cx3 = x2 - halfW*cos(perpAngle);
    let cy3 = y2 - halfW*sin(perpAngle);
    let cx4 = x2 + halfW*cos(perpAngle);
    let cy4 = y2 + halfW*sin(perpAngle);

    // We'll do a simple "trianglestrip" style gradient
    let steps = 20; 
    beginShape(TRIANGLE_STRIP);
    for (let i = 0; i <= steps; i++) {
      let t = i / steps;
      // Lerp corners
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

    // Outline
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
