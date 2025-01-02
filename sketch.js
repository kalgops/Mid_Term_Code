// ----------------------------------------------------------------------
//  Main p5/Matter.js code: sets up the table, the modes, the collisions,
//  the scoreboard, the rules overlay, plus user interactions for placing
//  the cue ball in the D zone.
// ----------------------------------------------------------------------

/* Matter.js Aliases */
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Events = Matter.Events;

/* Global Variables */
let engine, world;
let table;
let balls = [];
let cue;
let shotPredictor;

// Score tracking (simple approach)
let playerScores = { 'Player 1': 0, 'Player 2': 0 };
let currentTurn = 'Player 1';

// Sound
let audioCollision = [];
let audioPocket;

// Game modes: 1,2,3,4
let gameMode = 1;

// For the power bar
let cuePower = 50;
let powerBarWidth = 50;
let powerBarHeight = 300;
let powerBarX = 50;
let powerBarY = 150;

let showRules = false;
let shotInProgress = false;

// For advanced logic (mode 4)
let snookerRules;       // instance of SnookerRulesAdvanced
let useAdvancedRules = false;  // turned on in mode 4

// Let the user place the cue ball in the D zone
let cueBallPlaced = false;   // have we placed the cue ball yet?
let noRedPottedYet = true;   // track if a red ball has ever been potted

// AI objects (optional)
let aiDebugger;
let aiEngine;

function preload() {
  // Attempt to load collision + pocket sound
  try {
    for (let i = 1; i <= 3; i++) {
      // e.g. assets/collision1.mp3, collision2.mp3, collision3.mp3
      let s = loadSound(`assets/collision${i}.mp3`);
      audioCollision.push(s);
    }
    audioPocket = loadSound('assets/pocket.mp3');
  } catch (err) {
    console.error("Preload error:", err);
  }
}

function setup() {
  let canvas = createCanvas(1400, 600);
  canvas.parent("sketch-container"); // attach to our container

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;  // top-down table => no gravity

  // Create a new table
  let tableX = 200;
  let tableY = 50;
  let tableW = 1000;
  let tableH = 500;

  // Choose a ball diameter
  let ballDiameter = tableH / 36;  
  // Pocket is 1.5 × diameter (per instructions)
  let pocketSize = ballDiameter * 1.5;

  table = new Table(tableX, tableY, tableW, tableH, pocketSize, engine);

  // Initialize in gameMode=1 by default
  initializeBalls();
  

  // Create the Cue (we'll attach the actual "cue ball" body once placed)
  cue = new Cue(null, engine, table); // ball = null until placed
  shotPredictor = new ShotPredictor(cue, table, balls);

  // Collisions
  Events.on(engine, 'collisionStart', handleCollision);

  // AI Debugger/Engine (optional)
  aiDebugger = new AIDebugger();
  aiEngine = new AIEngine(aiDebugger, cue, balls, table);

  // If user closes the rules overlay
  const closeBtn = document.getElementById('closeRulesBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toggleRulesOverlay(false);
    });
  }

  updateScoreboard();
}

function draw() {
  // Canvas background different from cloth color:
  background(30, 75, 30);

  // If advanced rules are used, they'd be tracked in snookerRules, etc.

  // If balls are moving => hide the cue
  let moving = areBallsMoving();
  if (moving && !shotInProgress) {
    shotInProgress = true;
    if (cue) cue.isVisible = false;
  } else if (!moving && shotInProgress) {
    shotInProgress = false;
    if (cue) cue.isVisible = true;
  }

  Engine.update(engine);

  // Update the cue animation
  if (cue) {
    cue.update();
  }

  // Draw the power bar
  drawPowerBar();

  // Draw the table & cushions
  table.draw();

  // Draw the balls
  for (let b of balls) {
    b.draw();
  }

  // Draw predicted line
  if (shotPredictor) shotPredictor.drawPrediction();

  // Draw the cue
  if (cue && cue.isVisible) {
    cue.draw();
  }

  // If the user hasn’t placed the cue ball in the D, show text
  if (!cueBallPlaced) {
    push();
    fill(255, 255, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("Click Inside the 'D' Zone to Place Cue Ball", width/2, 30);
    pop();
  }

  updateScoreboard();
}

// Called by the engine's event 'collisionStart'
function handleCollision(event) {
  let pairs = event.pairs;
  for (let pair of pairs) {
    let labels = [pair.bodyA.label, pair.bodyB.label];

    // Play collision sound if cue ball involved
    if (labels.includes('Cue') && audioCollision.length > 0) {
      let s = random(audioCollision);
      if (s && s.isLoaded()) {
        s.setVolume(0.3);
        s.play();
      }
    }

    // Check if any ball is potted
    for (let body of [pair.bodyA, pair.bodyB]) {
      if (body.label && (body.label.startsWith('Red') ||
        ['Yellow', 'Green', 'Brown', 'Blue', 'Pink', 'Black', 'Cue'].includes(body.label))) {
        
        let ballObj = balls.find(b => b.body === body);
        if (ballObj && !ballObj.isPotted) {
          ballObj.checkPotted(table.pockets);
          if (ballObj.isPotted) {
            // We potted this ball
            if (audioPocket && audioPocket.isLoaded()) {
              audioPocket.setVolume(0.5);
              audioPocket.play();
            }

            // Logic for red balls
            if (ballObj.label.startsWith('Red')) {
              noRedPottedYet = false; // first red potted => noRedPottedYet = false
              if (gameMode === 1) {
                // physically remove from 'balls' array
                let idx = balls.indexOf(ballObj);
                if (idx >= 0) {
                  balls.splice(idx, 1);
                }
              }
              playerScores[currentTurn] += 1;
            } 
            // Logic for colored balls
            else if (['Yellow', 'Green', 'Brown', 'Blue', 'Pink', 'Black'].includes(ballObj.label)) {
              if (gameMode === 1) {
                // Respot the ball to its original position
                if (ballObj.originalPos) {
                  ballObj.respot(ballObj.originalPos.x, ballObj.originalPos.y);
                  ballObj.isPotted = false; // mark as not potted after respot
                }
              } else {
                let val = getBallValue(ballObj.label);
                playerScores[currentTurn] += val;
              }
            } 
            // Cue ball logic
            else if (ballObj.label === 'Cue') {
              if (noRedPottedYet) {
                switchPlayer();
                cueBallPlaced = false;
              } else {
                respotCueBall();
              }
            }

            updateScoreboard();
          }
        }
      }
    }
  }
}


// For short demonstration
function getBallValue(label) {
  // standard snooker color values
  let map = {
    Yellow: 2,
    Green: 3,
    Brown: 4,
    Blue: 5,
    Pink: 6,
    Black: 7
  };
  return map[label] || 0;
}

function respotCueBall() {
  // Place cue ball again in the D
  cueBallPlaced = false;
  // Next shot => user must click in the D
}

// Switch player
function switchPlayer() {
  if (currentTurn === 'Player 1') currentTurn = 'Player 2';
  else currentTurn = 'Player 1';
}

// Called every frame to see if balls are still moving
function areBallsMoving() {
  let threshold = 0.2;
  for (let b of balls) {
    let vx = b.body.velocity.x;
    let vy = b.body.velocity.y;
    if (Math.sqrt(vx*vx + vy*vy) > threshold) {
      return true;
    }
  }
  return false;
}

// Re-draw scoreboard
function updateScoreboard() {
  let p1El = document.getElementById('player1Score');
  let p2El = document.getElementById('player2Score');
  let turnEl = document.getElementById('currentTurn');
  if (p1El) p1El.innerText = playerScores['Player 1'];
  if (p2El) p2El.innerText = playerScores['Player 2'];
  if (turnEl) turnEl.innerText = currentTurn;
}

// The main initialization for balls in each mode
function initializeBalls(mode, ballDiameter) {
  // Clear out old
  for (let b of balls) {
    World.remove(world, b.body);
  }
  balls = [];

  // Reset scores, turn, flags
  playerScores['Player 1'] = 0;
  playerScores['Player 2'] = 0;
  currentTurn = 'Player 1';
  noRedPottedYet = true;
  cueBallPlaced = false;
  useAdvancedRules = false;

  // If mode=4 => use advanced rules
  if (mode === 4) {
    useAdvancedRules = true;
    snookerRules = new SnookerRulesAdvanced(
      ['Player 1', 'Player 2'],
      (player, pts)=>{ /* onScoreUpdate callback */},
      ()=>{ /* onFrameEnd callback */},
      (state, ballOn)=>{ /* onStateChange callback */} 
    );
  } else {
    snookerRules = null;
  }

  // We do *not* place the cue ball body yet. We let the user click to place it in the D.

  // For each mode, place the red + color balls
  if (mode === 1 || mode === 4) {
    setupStandardPositions(ballDiameter);
  } 
  else if (mode === 2) {
    setupRandomReds_KeepColors(ballDiameter);
  }
  else if (mode === 3) {
    setupRandomRedsAndColored(ballDiameter);
  }

  updateScoreboard();
}

// For Mode 1 or 4: standard triangle arrangement
function setupStandardPositions(d) {
  // Based on typical snooker: “Black” near top, behind the triangle of reds,
  // “Pink” just in front of the apex of the reds, “Blue” at center of table,
  // “Brown, Green, Yellow” along baulk line, etc.

  // We'll do approximate placements for illustration:

  // A reference Y center:
  let centerY = table.y + table.height / 2;
  let centerX = table.x + table.width / 2;

  // Place the Blue in the center
  let blueX = centerX;
  let blueY = centerY;
  createColoredBall(blueX, blueY, d, '#0000FF', 'Blue');

  // Pink ~ halfway between Blue and top cushion
  let pinkX = 900;
  let pinkY = centerY;
  createColoredBall(pinkX, pinkY, d, '#FFC0CB', 'Pink');

  // Black ~ behind pink
  let blackX = pinkX + 150;
  let blackY = centerY;
  createColoredBall(blackX, blackY, d, '#000000', 'Black');

  // Baulk line at x=table.x + table.width*0.25
  let baulkX = table.x + table.width * 0.25;
  // Brown in center of baulk
  let brownY = centerY;
  createColoredBall(baulkX, brownY, d, '#8B4513', 'Brown');

  // Green on left of baulk
  let greenY = centerY - 50;
  createColoredBall(baulkX, greenY, d, '#008000', 'Green');

  // Yellow on right of baulk
  let yellowY = centerY + 50;
  createColoredBall(baulkX, yellowY, d, '#FFFF00', 'Yellow');

  // Now place 15 reds in a tight triangle near the pink
  // Approx. apex ~ 10-15px from pink
  // Corrected apex position for a right-facing triangle
let apexX = pinkX + 10; // Start to the left of the pink ball
let apexY = pinkY;           // Align vertically with the pink ball

let rows = 5; // Standard snooker setup
let index = 0;

// Adjust offsets to form a right-facing triangle
for (let row = 0; row < rows; row++) {
  for (let col = 0; col <= row; col++) {
    let xOff = row * (d + 0.9);             // Horizontal offset moves rightward
    let yOff = (col - row / 2) * (d + 1); // Vertical offset for symmetry
    let rx = apexX + xOff;
    let ry = apexY + yOff;
    createRedBall(rx, ry, d, `Red_${index++}`);
  }
}

}

// Mode 2: random reds + “default” color positions
function setupRandomReds_KeepColors(d) {
  // Place the 15 reds randomly
  let numReds = 15;
  for (let i = 0; i < numReds; i++) {
    let pos = getRandomPosition(d);
    createRedBall(pos.x, pos.y, d, `Red_${i}`);
  }

  // Then place “standard” colors at normal spots
  // This can be simpler or the same arrangement from Mode 1
  // For demonstration, let's place them like we do in standard positions, but no reds in triangle
  setupStandardColorSpots(d);
}

// Helper to place the standard 6 colors, same as above
function setupStandardColorSpots(d) {
  let centerY = table.y + table.height / 2;
  let centerX = table.x + table.width / 2;

  createColoredBall(centerX, centerY, d, '#0000FF', 'Blue');      // center
  createColoredBall(centerX + 200, centerY, d, '#FFC0CB', 'Pink');
  createColoredBall(centerX + 350, centerY, d, '#000000', 'Black');

  let baulkX = table.x + table.width * 0.25;
  createColoredBall(baulkX, centerY, d, '#8B4513', 'Brown');
  createColoredBall(baulkX, centerY - 50, d, '#008000', 'Green');
  createColoredBall(baulkX, centerY + 50, d, '#FFFF00', 'Yellow');
}

// Mode 3: random reds & random colored
function setupRandomRedsAndColored(d) {
  let numReds = 15;
  for (let i = 0; i < numReds; i++) {
    let pos = getRandomPosition(d);
    createRedBall(pos.x, pos.y, d, `Red_${i}`);
  }
  let colorLabels = ['Yellow','Green','Brown','Blue','Pink','Black'];
  for (let label of colorLabels) {
    let pos = getRandomPosition(d);
    let col = getColorByLabel(label);
    createColoredBall(pos.x, pos.y, d, col, label);
  }
}

/** Creates a red ball and adds it to the array */
function createRedBall(x, y, diam, label) {
  let b = new Ball(x, y, diam, '#FF0000', engine, label, false /* isColor */);
  balls.push(b);
}

/** Creates a color ball and stores its original position for respot */
function createColoredBall(x, y, diam, color, label) {
  let b = new Ball(x, y, diam, color, engine, label, true /* isColor */);
  // store original spot
  b.originalPos = { x, y };
  balls.push(b);
}

/** Return random valid position inside the table that doesn’t overlap pockets or other balls */
function getRandomPosition(diam) {
  let tries = 0;
  let maxTries = 100;
  while (tries < maxTries) {
    let rx = random(table.x + diam, table.x + table.width - diam);
    let ry = random(table.y + diam, table.y + table.height - diam);
    if (!isOverlapping(rx, ry, diam)) {
      return { x: rx, y: ry };
    }
    tries++;
  }
  return { x: table.x + table.width/2, y: table.y + table.height/2 };
}

/** Check overlap with existing balls or pockets */
function isOverlapping(x, y, diam) {
  for (let b of balls) {
    let distB = dist(x, y, b.body.position.x, b.body.position.y);
    if (distB < (diam/2 + b.diameter/2)) {
      return true;
    }
  }
  for (let p of table.pockets) {
    let distP = dist(x, y, p.position.x, p.position.y);
    if (distP < (diam/2 + table.pocketSize/2)) {
      return true;
    }
  }
  return false;
}

/** Maps color label to a standard color code */
function getColorByLabel(label) {
  let colorMap = {
    Yellow: '#FFFF00',
    Green: '#008000',
    Brown: '#8B4513',
    Blue: '#0000FF',
    Pink: '#FFC0CB',
    Black: '#000000'
  };
  return colorMap[label] || '#FFFFFF';
}

/* Draw a vertical power bar on the left side */
function drawPowerBar() {
  push();
  fill(50);
  stroke(255);
  strokeWeight(1);
  rect(powerBarX, powerBarY, powerBarWidth, powerBarHeight, 5);

  let filledHeight = map(cuePower, 0, 100, 0, powerBarHeight);
  fill(255, 0, 0);
  rect(powerBarX, powerBarY + (powerBarHeight - filledHeight),
       powerBarWidth, filledHeight, 5);

  noFill();
  stroke(0);
  rect(powerBarX, powerBarY, powerBarWidth, powerBarHeight, 5);

  fill(255);
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text(`Power: ${floor(cuePower)}`, powerBarX + powerBarWidth/2, powerBarY - 20);
  pop();
}

/* Key presses for mode changes, toggling rules, or striking */
function keyPressed() {
  if (key === '1') {
    console.log("Mode 1 => Standard Layout");
    gameMode = 1;
    let d = table.height / 36;
    initializeBalls(gameMode, d);
    // cue.ball is null until user places in D
  } 
  else if (key === '2') {
    console.log("Mode 2 => Random Reds, Colors in Default");
    gameMode = 2;
    let d = table.height / 36;
    initializeBalls(gameMode, d);
  }
  else if (key === '3') {
    console.log("Mode 3 => Random Reds & Random Colors");
    gameMode = 3;
    let d = table.height / 36;
    initializeBalls(gameMode, d);
  }
  else if (key === '4') {
    console.log("Mode 4 => Advanced Snooker Rules + Standard Layout");
    gameMode = 4;
    let d = table.height / 36;
    initializeBalls(gameMode, d);
  }
  else if (key.toLowerCase() === 'r') {
    toggleRulesOverlay();
  }

  // Press SPACE => strike if cue ball is placed and not moving
  if (key === ' ') {
    if (cue && cue.ball && cueBallPlaced) {
      if (!areBallsMoving()) {
        cue.triggerStrike();
      } else {
        console.log("Cannot strike - balls still moving!");
      }
    }
  }
}

/* Mouse interaction for power bar or placing the cue ball in the D zone */
function mousePressed() {
  // If user is clicking in the power bar region => adjust power
  if (mouseX > powerBarX && mouseX < (powerBarX + powerBarWidth) &&
      mouseY > powerBarY && mouseY < (powerBarY + powerBarHeight)) {
    setCuePowerFromMouse(mouseY);
    return;
  }

  // If the cue ball is not placed yet => check if the user clicked in the D zone
  if (!cueBallPlaced) {
    // The “D” zone is on the baulk line side => x <= table.x + table.width*0.25
    // We also have a half-circle. Let's check if the click is inside the semi-circle
    let baulkX = table.x + table.width * 0.25;
    let centerY = table.y + table.height/2;
    let dRadius = table.pocketSize * 4; // from table code

    let dx = mouseX - baulkX;
    let dy = mouseY - centerY;
    // Must be inside the half-circle to the left
    // i.e. if sqrt(dx^2 + dy^2) <= dRadius/2, and the mouseX <= baulkX
    let radius = dRadius / 2;
    let distFromCenter = sqrt(dx*dx + dy*dy);

    if ((distFromCenter <= radius) && (mouseX <= baulkX)) {
      placeCueBall(mouseX, mouseY);
    }
  }
}

/* If user drags in power bar region, adjust power */
function mouseDragged() {
  if (mouseX > powerBarX && mouseX < (powerBarX + powerBarWidth) &&
      mouseY > powerBarY && mouseY < (powerBarY + powerBarHeight)) {
    setCuePowerFromMouse(mouseY);
  }
}

/* Continuously rotate the cue to mouse if the cue ball is placed */
function mouseMoved() {
  if (cue && cue.ball) {
    cue.setAngleFromMouse(mouseX, mouseY);
  }
}

function setCuePowerFromMouse(my) {
  let barBottom = powerBarY + powerBarHeight;
  let barTop = powerBarY;
  let pct = map(my, barBottom, barTop, 0, 100, true);
  cuePower = constrain(pct, 0, 100);
  if (cue) {
    cue.power = cuePower;
  }
}

/* Actually place the cue ball in the chosen mouse location inside the D */
function placeCueBall(px, py) {
  let d = table.height / 36;
  // Create the new cue ball
  let cBall = new Ball(px, py, d, '#FFFFFF', engine, 'Cue', false);
  // Increase friction for the cue ball
  Matter.Body.set(cBall.body, {
    friction: 0.03,
    frictionAir: 0.01
  });
  balls.push(cBall);
  cue.ball = cBall;  // attach it to the cue
  cueBallPlaced = true;
}

/* Show/hide the rules overlay */
function toggleRulesOverlay(forceShow) {
  let overlay = document.getElementById('rulesOverlay');
  if (!overlay) return;
  if (typeof forceShow === 'boolean') {
    showRules = forceShow;
  } else {
    showRules = !showRules;
  }
  overlay.style.display = showRules ? 'flex' : 'none';
}

function windowResized() {
  // do nothing or you can handle resizing
}
