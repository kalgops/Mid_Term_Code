class SnookerRulesAdvanced {
  constructor(players, onScoreUpdate, onFrameEnd, onStateChange) {
    this.players = players;
    this.currentPlayerIndex = 0;
    this.onScoreUpdate = onScoreUpdate;
    this.onFrameEnd = onFrameEnd;
    this.onStateChange = onStateChange;

    // Basic scoreboard
    this.points = {};
    for (let p of players) {
      this.points[p] = 0;
    }

    this.redsRemaining = 15;
    this.colorOrder = ['Yellow', 'Green', 'Brown', 'Blue', 'Pink', 'Black'];
    this.nextColorIndex = 0;
    this.state = 'RED_REQUIRED'; // Possible states: 'RED_REQUIRED', 'COLOR_REQUIRED', 'END'
    this.ballOn = 'Red';
    this.freeBallActive = false;
    this.currentBreakPoints = 0;
    this.fouls = 0;
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  switchPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.currentBreakPoints = 0;
    this.updateState();
    this.onStateChange && this.onStateChange(this.state, this.ballOn);
  }

  updateState() {
    if (this.redsRemaining > 0) {
      this.state = 'RED_REQUIRED';
      this.ballOn = 'Red';
    } else if (this.nextColorIndex < this.colorOrder.length) {
      this.state = 'COLOR_REQUIRED';
      this.ballOn = this.colorOrder[this.nextColorIndex];
    } else {
      this.state = 'END';
      this.ballOn = null;
      this.onFrameEnd && this.onFrameEnd();
    }
  }

  handleShotOutcome(shotOutcome) {
    // Example shotOutcome structure:
    // { pottedBalls: ['Red', 'Black'], fouled: false, freeBall: false }

    if (shotOutcome.fouled) {
      this.handleFoul(shotOutcome);
      this.switchPlayer();
      return;
    }

    // Handle potted balls
    if (shotOutcome.pottedBalls && shotOutcome.pottedBalls.length > 0) {
      for (let ball of shotOutcome.pottedBalls) {
        if (ball.startsWith('Red')) {
          this.points[this.currentPlayer] += 1;
          this.redsRemaining--;
          this.updateState();
        } else {
          let val = this.getBallValue(ball);
          this.points[this.currentPlayer] += val;
          // In snooker, colored balls are respotted until all reds are potted
          if (this.redsRemaining > 0) {
            // Respotted logic handled elsewhere (e.g., in collision handling)
          } else {
            // Final sequence: colors are potted in order
            if (ball === this.colorOrder[this.nextColorIndex]) {
              this.nextColorIndex++;
              this.updateState();
            }
          }
        }
      }

      this.onScoreUpdate && this.onScoreUpdate(this.currentPlayer, shotOutcome.pottedBalls.length);
      this.currentBreakPoints += shotOutcome.pottedBalls.length;
      // Continue player's turn if at least one ball potted
      if (shotOutcome.pottedBalls.length === 0) {
        this.switchPlayer();
      }
    } else {
      // No balls potted, switch player
      this.switchPlayer();
    }
  }

  handleFoul(shotOutcome) {
    // Assign foul points based on the type of foul
    // Simplified: minimum 4 points
    let foulPoints = 4;
    this.points[this.currentPlayer] += foulPoints;
    this.fouls++;
    this.onScoreUpdate && this.onScoreUpdate(this.currentPlayer, 0, foulPoints);
  }

  getBallValue(label) {
    if (label.startsWith('Red')) return 1;
    let mapColor = {
      Yellow: 2,
      Green: 3,
      Brown: 4,
      Blue: 5,
      Pink: 6,
      Black: 7
    };
    return mapColor[label] || 0;
  }
}
