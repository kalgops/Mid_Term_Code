class Table {
  /**
   * @param {Number} x
   * @param {Number} y
   * @param {Number} width
   * @param {Number} height
   * @param {Number} pocketSize
   * @param {Matter.Engine} engine
   */
  constructor(x, y, width, height, pocketSize, engine) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.pocketSize = pocketSize;   // diameter
    this.engine = engine;
    this.world = engine.world;

    this.railThickness = 35; // thickness
    this.pockets = [];
    this.cushions = [];

    this.setupCushions();
    this.setupPockets();
  }

  setupCushions() {
    let rail = this.railThickness;
    let { x, y, width, height } = this;

    // We create top/bottom/left/right rails with some offset
    // Then place them in the matter world

    // top rail
    let topRail = new Cushion(
      x + width/2,      // center X
      y - rail/2,       // center Y
      width + rail,     // rail length
      rail,             // rail thickness
      0,
      this.engine
    );

    // bottom rail
    let bottomRail = new Cushion(
      x + width/2,
      y + height + rail/2,
      width + rail,
      rail,
      0,
      this.engine
    );

    // left rail
    let leftRail = new Cushion(
      x - rail/2,
      y + height/2,
      rail,
      height + rail,
      0,
      this.engine
    );

    // right rail
    let rightRail = new Cushion(
      x + width + rail/2,
      y + height/2,
      rail,
      height + rail,
      0,
      this.engine
    );

    this.cushions.push(topRail, bottomRail, leftRail, rightRail);
  }

  setupPockets() {
    // 6 pockets: corners + mid top + mid bottom
    // The “pocketSize” is the diameter, so circleRadius = pocketSize/2
    let r = this.pocketSize / 2;
    let { x, y, width, height } = this;

    let corners = [
      { x: x,         y: y         },
      { x: x+width/2, y: y         },
      { x: x+width,   y: y         },
      { x: x,         y: y+height  },
      { x: x+width/2, y: y+height  },
      { x: x+width,   y: y+height  }
    ];

    corners.forEach(pos => {
      let pocketBody = Matter.Bodies.circle(pos.x, pos.y, r, {
        isStatic: true,
        isSensor: true,
        label: 'Pocket'
      });
      this.pockets.push(pocketBody);
      Matter.World.add(this.world, pocketBody);
    });
  }

  draw() {
    let rail = this.railThickness;

    // Outer “wood” boundary
    push();
    fill(90, 30, 0); // darker wood
    stroke(40, 20, 0);
    strokeWeight(3);
    rect(this.x - rail, this.y - rail, this.width + 2*rail, this.height + 2*rail);
    pop();

    // Then the cloth in the center
    push();
    noStroke();
    fill(28, 138, 67); // a greener cloth
    rect(this.x, this.y, this.width, this.height);
    pop();

    // Draw cushions
    for (let c of this.cushions) {
      c.draw();
    }

    // Draw pockets
    fill(0);
    noStroke();
    for (let p of this.pockets) {
      ellipse(p.position.x, p.position.y, this.pocketSize);
    }

    // Baulk line + "D" half-circle
    let baulkX = this.x + this.width*0.25;
    stroke(255);
    strokeWeight(2);
    line(baulkX, this.y, baulkX, this.y + this.height);

    // The “D” has radius ~some factor, or re-use pocketSize
    // Let’s do a bigger arc
    let dRadius = this.pocketSize * 4;
    noFill();
    arc(
      baulkX,
      this.y + this.height / 2,
      dRadius,
      dRadius,
      HALF_PI,
      PI + HALF_PI
    );
  }
}
