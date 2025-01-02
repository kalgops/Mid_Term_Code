class Cushion {
  constructor(x, y, width, height, angle, engine) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.angle = angle;
    this.engine = engine;
    this.world = engine.world;

    let opts = {
      isStatic: true,
      restitution: 1.0,  // high bounce
      angle: angle,
      label: 'Cushion'
    };

    this.body = Matter.Bodies.rectangle(x, y, width, height, opts);
    Matter.World.add(this.world, this.body);
  }

  draw() {
    // We'll draw a more “wood-like” cushion.
    push();
    fill(90, 44, 0);   // darker brown
    stroke(60, 30, 0);
    strokeWeight(2);

    translate(this.body.position.x, this.body.position.y);
    rotate(this.body.angle);
    rectMode(CENTER);

    rect(0, 0, this.width, this.height);
    pop();
  }
}
