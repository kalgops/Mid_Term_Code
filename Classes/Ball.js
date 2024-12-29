class Ball {
  constructor(x, y, diameter, color, engine, label) {
    this.diameter = diameter;
    this.color = color;
    this.label = label;
    this.engine = engine;
    this.world = engine.world;
    this.isPotted = false;

    const { Bodies, World } = Matter;

    // Adjust physics for smoother rolling
    this.body = Bodies.circle(x, y, diameter / 2, {
      restitution: 0.9,
      friction: 0.01,
      frictionAir: 0.005,
      label: label
    });

    World.add(this.world, this.body);
  }

  draw() {
    if (!this.isPotted) {
      fill(this.color);
      stroke(255);
      strokeWeight(2);
      ellipse(this.body.position.x, this.body.position.y, this.diameter);

      // Optional spin indicator
      if (this.body.angularVelocity !== 0) {
        push();
        translate(this.body.position.x, this.body.position.y);
        rotate(this.body.angle);
        stroke(255, 255, 255, 150);
        line(0, 0, this.diameter / 4, 0);
        pop();
      }
    }
  }

  checkPotted(pockets) {
    for (let p of pockets) {
      let distance = dist(
        this.body.position.x,
        this.body.position.y,
        p.position.x,
        p.position.y
      );
      if (distance < (this.diameter / 2 + p.circleRadius)) {
        // Ball is potted
        this.isPotted = true;
        Matter.Body.setPosition(this.body, { x: -999, y: -999 });
        Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(this.body, 0);
        Matter.Body.setStatic(this.body, true);
        break;
      }
    }
  }

  respot(x, y) {
    this.isPotted = false;
    Matter.Body.setPosition(this.body, { x, y });
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(this.body, 0);
    Matter.Body.setStatic(this.body, false);
  }
}
