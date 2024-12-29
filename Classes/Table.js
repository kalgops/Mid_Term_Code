class Table {
  /**
   * @param {Number} x          - Left coordinate of the cloth area
   * @param {Number} y          - Top coordinate of the cloth area
   * @param {Number} width      - Cloth length
   * @param {Number} height     - Cloth width
   * @param {Number} pocketSize - Diameter of the pockets
   * @param {Object} engine     - Matter.js engine
   */
  constructor(x, y, width, height, pocketSize, engine) {
    this.x = x;
    this.y = y;
    this.width = width;   
    this.height = height; 
    this.pocketSize = pocketSize;
    this.engine = engine;
    this.world = engine.world;

    this.railThickness = 40; 
    this.pockets = [];
    this.cushions = [];

    console.log("Table created with rails and pockets. Width:", width, "Height:", height);

    this.setupCushions();
    this.setupPockets();
  }

  setupCushions() {
    const rail = this.railThickness;
    const { x, y, width, height } = this;

    // Top cushion
    const top = new Cushion(
      x + width / 2,
      y - rail / 2,
      width + rail,
      rail,
      0,
      this.engine
    );

    // Bottom cushion
    const bottom = new Cushion(
      x + width / 2,
      y + height + rail / 2,
      width + rail,
      rail,
      0,
      this.engine
    );

    // Left cushion
    const left = new Cushion(
      x - rail / 2,
      y + height / 2,
      rail,
      height + rail,
      0,
      this.engine
    );

    // Right cushion
    const right = new Cushion(
      x + width + rail / 2,
      y + height / 2,
      rail,
      height + rail,
      0,
      this.engine
    );

    this.cushions.push(top, bottom, left, right);
    console.log("Cushions (rails) have been set up around the table.");
  }

  setupPockets() {
    const { x, y, width, height } = this;
    // 6 pockets: corners + mid-top + mid-bottom
    const pocketPositions = [
      { x: x,             y: y            },  
      { x: x + width / 2, y: y            },  
      { x: x + width,     y: y            },  
      { x: x,             y: y + height   },  
      { x: x + width / 2, y: y + height   },  
      { x: x + width,     y: y + height   }   
    ];

    for (let pos of pocketPositions) {
      let pocketBody = Matter.Bodies.circle(pos.x, pos.y, this.pocketSize / 2, {
        isStatic: true,
        isSensor: true,
        label: 'Pocket'
      });
      this.pockets.push(pocketBody);
      Matter.World.add(this.world, pocketBody);
    }
  }

  draw() {
    const rail = this.railThickness;
    const outerW = this.width + 2 * rail;
    const outerH = this.height + 2 * rail;

    // Wooden outer rectangle
    push();
    stroke(0);
    strokeWeight(1);
    fill(139, 69, 19);
    rect(this.x - rail, this.y - rail, outerW, outerH);
    pop();

    // Additional black border for aesthetics
    push();
    stroke(0);
    strokeWeight(4);
    noFill();
    rect(this.x - rail, this.y - rail, outerW, outerH);
    pop();

    // Green cloth area
    noStroke();
    fill(0, 100, 0);
    rect(this.x, this.y, this.width, this.height);

    // Draw cushions
    for (let c of this.cushions) {
      c.draw();
    }

    // Draw pockets
    fill(0);
    for (let p of this.pockets) {
      ellipse(p.position.x, p.position.y, this.pocketSize);
    }

    // Baulk line + "D"
    stroke(255);
    strokeWeight(2);
    noFill();
    let baulkX = this.x + this.width * 0.25;
    line(baulkX, this.y, baulkX, this.y + this.height);

    let dRadius = this.pocketSize * 4;
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
