class Cushion {
  constructor(x, y, width, height, angle, engine) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.angle = angle;
    this.engine = engine;
    this.world = engine.world;

    const { Bodies, World } = Matter;

    // Tweak restitution for realistic cushion bounce
    this.body = Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      restitution: 1,  
      angle: angle,
      label: 'Cushion'
    });

    World.add(this.world, this.body);
  }

  draw() {
    fill(50, 25, 0); // Dark brown rails
    stroke(50, 25, 0);
    push();
    translate(this.body.position.x, this.body.position.y);
    rotate(this.body.angle);
    rectMode(CENTER);
    rect(0, 0, this.width, this.height);
    pop();
  }
}
