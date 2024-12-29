// Matter.js Aliases
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Events = Matter.Events;

let engine, world;
let table;
let balls = [];
let cue;
let shotPredictor;

// Score tracking
let playerScores = { 'Player 1': 0, 'Player 2': 0 };
let currentTurn = 'Player 1';

// Audio
let audioCollision = [];
let audioPocket;

// Game modes
let gameMode = 1;

// For power bar
let cuePower = 50;
let powerBarWidth = 50;
let powerBarHeight = 300;
let powerBarX = 50;  
let powerBarY = 150; 

let showRules = true;
let shotInProgress = false;

// We'll instantiate AIDebugger & AIEngine
let aiDebugger; 
let aiEngine;

// Optionally, if you use advanced snooker rules:
let snookerRules;

function preload() {
  try {
    for (let i = 1; i <= 3; i++) {
      let s = loadSound(`assets/collision${i}.mp3`);
      audioCollision.push(s);
    }
    audioPocket = loadSound('assets/pocket.mp3');
  } catch (err) {
    console.error("Preload error:", err);
  }
}

function setup() {
  createCanvas(1400, 600);

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;

  // Table setup
  let tableX = 200;  
  let tableY = 50;
  let tableW = 1000; 
  let tableH = 500;

  let ballDiameter = tableH / 36;
  let pocketSize = ballDiameter * 1.5;

  table = new Table(tableX, tableY, tableW, tableH, pocketSize, engine);
  initializeBalls(gameMode, ballDiameter);

  // Create the cue with our updated "Cue" class
  cue = new Cue(getCueBall(), engine, table);
  shotPredictor = new ShotPredictor(cue, table, balls);

  // Collision events
  Events.on(engine, 'collisionStart', handleCollision);

  // Create the debugger + AI engine (if you have them)
  aiDebugger = new AIDebugger();
  aiEngine = new AIEngine(aiDebugger, cue, balls, table);

  updateScoreboard();
  toggleRulesOverlay(true);

  const closeBtn = document.getElementById('closeRulesBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toggleRulesOverlay(false);
    });
  }
}

function draw() {
  background(0, 100, 0);

  let moving = areBallsMoving();
  // if balls are moving => hide the cue
  if (moving && !shotInProgress) {
    shotInProgress = true;
    aiDebugger.log("Balls started moving => shotInProgress = true");
    if (cue) cue.isVisible = false;
  } else if (!moving && shotInProgress) {
    shotInProgress = false;
    aiDebugger.log("Balls all stopped => shotInProgress = false. Next shot can happen.");
    if (cue) cue.isVisible = true;
  }

  Engine.update(engine);

  // update the cue's offset animation
  if (cue) {
    cue.update();
  }

  drawPowerBar();
  table.draw();

  for (let b of balls) {
    b.draw();
  }

  if (shotPredictor) shotPredictor.drawPrediction();
  
  // draw the cue (only if isVisible)
  if (cue) {
    cue.draw();
  }

  updateScoreboard();

  // (Optional) AI or rule checks
  // aiDebugger.checkGameState(balls, snookerRules);
}

/**
 * If we have an AI player, we can let it shoot automatically 
 * once the previous shot is done, or when it's "AI's turn."
 */
function maybeTakeAIShot() {
  if (currentTurn === 'Player 2' && !areBallsMoving()) {
    let bestShot = aiEngine.getBestShot();
    // set cue to that angle/power
    cue.angle = bestShot.angle;
    cue.power = bestShot.power;
    // Instead of direct strike, do:
    cue.triggerStrike();
    aiDebugger.log("AI took its shot!");
  }
}

function areBallsMoving() {
  let threshold = 0.2;
  for (let b of balls) {
    let vx = b.body.velocity.x;
    let vy = b.body.velocity.y;
    if (sqrt(vx*vx + vy*vy) > threshold) {
      return true;
    }
  }
  return false;
}

function drawPowerBar() {
  push();
  fill(50);
  stroke(255);
  strokeWeight(1);
  rect(powerBarX, powerBarY, powerBarWidth, powerBarHeight, 5);

  let filledHeight = map(cuePower, 0, 100, 0, powerBarHeight);
  fill(255, 0, 0);
  rect(powerBarX, powerBarY + (powerBarHeight - filledHeight), powerBarWidth, filledHeight, 5);

  stroke(0);
  noFill();
  rect(powerBarX, powerBarY, powerBarWidth, powerBarHeight, 5);

  fill(255);
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text(`Power: ${floor(cuePower)}`, powerBarX + powerBarWidth/2, powerBarY - 20);
  pop();
}

function initializeBalls(mode, ballDiameter) {
  for (let b of balls) {
    World.remove(world, b.body);
  }
  balls = [];
  playerScores['Player 1'] = 0;
  playerScores['Player 2'] = 0;
  currentTurn = 'Player 1';

  createCueBall(ballDiameter);

  if (mode === 1) {
    setupStandardPositions(ballDiameter);
  } else if (mode === 2) {
    setupRandomReds(ballDiameter);
  } else {
    setupRandomRedsAndColored(ballDiameter);
  }
  updateScoreboard();
}

function createCueBall(ballDiameter) {
  let dX = table.x + table.width * 0.25;
  let dY = table.y + table.height / 2;
  let cueBall = new Ball(dX, dY, ballDiameter, '#FFFFFF', engine, 'Cue');
  balls.push(cueBall);
}

function setupStandardPositions(ballDiameter) {
  let startX = table.x + table.width * 0.75;
  let startY = table.y + table.height / 2;
  let rows = 5;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= row; col++) {
      let x = startX + row*(ballDiameter*1.1);
      let y = startY + (col - row/2)*(ballDiameter*1.1);
      let red = new Ball(x, y, ballDiameter, '#FF0000', engine, `Red_${row}_${col}`);
      balls.push(red);
    }
  }
  let colorPositions = [
    { label: 'Yellow', color: '#FFFF00', x: table.x + table.width*0.5 + 2*ballDiameter, y: table.y + table.height*0.2 },
    { label: 'Green',  color: '#008000', x: table.x + table.width*0.5 + 2*ballDiameter, y: table.y + table.height*0.4 },
    { label: 'Brown',  color: '#8B4513', x: table.x + table.width*0.5 + 2*ballDiameter, y: table.y + table.height*0.6 },
    { label: 'Blue',   color: '#0000FF', x: table.x + table.width*0.5 + 2*ballDiameter, y: table.y + table.height*0.8 },
    { label: 'Pink',   color: '#FFC0CB', x: table.x + table.width*0.6 + 3*ballDiameter, y: table.y + table.height*0.5 },
    { label: 'Black',  color: '#000000', x: table.x + table.width*0.7 + 4*ballDiameter, y: table.y + table.height*0.5 }
  ];
  for (let c of colorPositions) {
    let colorBall = new Ball(c.x, c.y, ballDiameter, c.color, engine, c.label);
    balls.push(colorBall);
  }
}

function setupRandomReds(ballDiameter) {
  let numReds = 15;
  for (let i = 0; i < numReds; i++) {
    let pos = getRandomPosition(ballDiameter);
    let redBall = new Ball(pos.x, pos.y, ballDiameter, '#FF0000', engine, `Red_${i}`);
    balls.push(redBall);
  }
}

function setupRandomRedsAndColored(ballDiameter) {
  let numReds = 15;
  for (let i = 0; i < numReds; i++) {
    let pos = getRandomPosition(ballDiameter);
    let redBall = new Ball(pos.x, pos.y, ballDiameter, '#FF0000', engine, `Red_${i}`);
    balls.push(redBall);
  }
  let colorLabels = ['Yellow','Green','Brown','Blue','Pink','Black'];
  for (let label of colorLabels) {
    let pos = getRandomPosition(ballDiameter);
    let ballC = new Ball(pos.x, pos.y, ballDiameter, getColorByLabel(label), engine, label);
    balls.push(ballC);
  }
}

function getRandomPosition(diam) {
  let attempts = 0, maxAttempts = 100;
  while (attempts < maxAttempts) {
    let rx = random(table.x + diam, table.x + table.width - diam);
    let ry = random(table.y + diam, table.y + table.height - diam);
    if (!isOverlapping(rx, ry, diam)) {
      return { x: rx, y: ry };
    }
    attempts++;
  }
  return { x: table.x + table.width/2, y: table.y + table.height/2 };
}

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

function getColorByLabel(label) {
  const colorMap = {
    Yellow: '#FFFF00',
    Green: '#008000',
    Brown: '#8B4513',
    Blue: '#0000FF',
    Pink: '#FFC0CB',
    Black: '#000000'
  };
  return colorMap[label] || '#FFFFFF';
}

function getCueBall() {
  return balls.find(b => b.label === 'Cue');
}

function handleCollision(event) {
  let pairs = event.pairs;
  for (let pair of pairs) {
    let labels = [pair.bodyA.label, pair.bodyB.label];

    // collision sound
    if (labels.includes('Cue') && audioCollision.length > 0) {
      let s = random(audioCollision);
      if (s && s.isLoaded()) {
        s.setVolume(0.3);
        s.play();
      }
    }

    // check pockets
    for (let body of [pair.bodyA, pair.bodyB]) {
      if (body.label.startsWith('Red') ||
          ['Yellow','Green','Brown','Blue','Pink','Black','Cue'].includes(body.label)) {
        let ball = balls.find(b => b.body === body);
        if (ball && !ball.isPotted) {
          ball.checkPotted(table.pockets);
          if (ball.isPotted) {
            if (audioPocket && audioPocket.isLoaded()) {
              audioPocket.setVolume(0.5);
              audioPocket.play();
            }
            // Basic scoring:
            if (ball.label.startsWith('Red')) {
              playerScores[currentTurn] += 1;
              aiDebugger.log(`Red potted -> +1 point`);
            } else if (['Yellow','Green','Brown','Blue','Pink','Black'].includes(ball.label)) {
              let pts = getBallValue(ball.label);
              playerScores[currentTurn] += pts;
              aiDebugger.log(`${ball.label} potted -> +${pts} points`);
            } else if (ball.label === 'Cue') {
              aiDebugger.log(`Cue ball potted => re-spot in D zone`);
              respotCueBall();
            }
            updateScoreboard();
          }
        }
      }
    }
  }
}

function getBallValue(label) {
  let map = {
    Yellow: 2, Green: 3, Brown: 4, Blue: 5, Pink: 6, Black: 7
  };
  return map[label] || 0;
}

function respotCueBall() {
  let c = getCueBall();
  if (c) {
    let dX = table.x + table.width * 0.25;
    let dY = table.y + table.height / 2;
    c.respot(dX, dY);
  }
}

function updateScoreboard() {
  document.getElementById('player1Score').innerText = playerScores['Player 1'] || 0;
  document.getElementById('player2Score').innerText = playerScores['Player 2'] || 0;
  document.getElementById('currentTurn').innerText = currentTurn;
}

// Press SPACE => trigger strike animation if balls not moving
function keyPressed() {
  if (key === '1') {
    console.log("Mode 1 => Starting Positions");
    gameMode = 1;
    let ballDiameter = table.height / 36;
    initializeBalls(gameMode, ballDiameter);
    cue.ball = getCueBall();
  } else if (key === '2') {
    console.log("Mode 2 => Random Reds");
    gameMode = 2;
    let ballDiameter = table.height / 36;
    initializeBalls(gameMode, ballDiameter);
    cue.ball = getCueBall();
  } else if (key === '3') {
    console.log("Mode 3 => Random Reds & Colored");
    gameMode = 3;
    let ballDiameter = table.height / 36;
    initializeBalls(gameMode, ballDiameter);
    cue.ball = getCueBall();
  } else if (key.toLowerCase() === 'r') {
    toggleRulesOverlay();
  }

  if (key === ' ') {
    if (cue) {
      let moving = areBallsMoving();
      if (!moving) {
        // Instead of direct strike, do the new animation approach
        cue.triggerStrike();
        aiDebugger.log("Cue ball strike animation triggered!");
      } else {
        aiDebugger.log("Cannot strike - balls still moving!");
      }
    }
  }
}

function mousePressed() {
  if (mouseX > powerBarX && mouseX < (powerBarX + powerBarWidth) &&
      mouseY > powerBarY && mouseY < (powerBarY + powerBarHeight)) {
    setCuePowerFromMouse(mouseY);
  }
}

function mouseDragged() {
  if (mouseX > powerBarX && mouseX < (powerBarX + powerBarWidth) &&
      mouseY > powerBarY && mouseY < (powerBarY + powerBarHeight)) {
    setCuePowerFromMouse(mouseY);
  }
}

function mouseMoved() {
  if (cue) {
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
  // do nothing
}