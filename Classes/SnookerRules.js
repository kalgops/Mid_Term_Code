/********************************************************************
 * SnookerRulesAdvanced.js
 * 
 * An advanced version of snooker logic with:
 *  - Turn switching
 *  - Fouls (with correct penalty points, e.g. 7 if black is "on")
 *  - Free ball detection (simplified approach)
 *  - Continuing a break if you keep potting correct balls
 *
 * Key attributes:
 *   - this.state: can be 'RED_REQUIRED', 'COLOR_REQUIRED', or 'FINAL_COLORS'
 *   - this.currentPlayerIndex
 *   - this.players[] (2 players in this example)
 *   - this.points[] to store each player's points
 *   - this.freeBallActive: boolean indicating if the current shot is a free ball
 *   - etc.
 *
 * Implementation details:
 *   - We assume each "shot" we get a collision or pockets from your main code.
 *   - We'll define handleShotOutcome(...) to figure out if it was a pot, foul, or miss.
 *   - We track if multiple balls are potted in a single shot. 
 ********************************************************************/

class SnookerRulesAdvanced {
    constructor(players, onScoreUpdate, onFrameEnd, onStateChange) {
      this.players = players; // e.g. ["Player 1", "Player 2"]
      this.currentPlayerIndex = 0;
      this.onScoreUpdate = onScoreUpdate; // callback
      this.onFrameEnd = onFrameEnd;       // callback on final black potted
      this.onStateChange = onStateChange; // callback if you want to reflect state changes in UI, etc.
  
      // scoreboard
      this.points = {};
      for (let p of players) {
        this.points[p] = 0;
      }
  
      // typical snooker: 15 reds
      this.redsRemaining = 15;
  
      // color order for final sequence
      this.colorOrder = ["Yellow", "Green", "Brown", "Blue", "Pink", "Black"];
      this.nextColorIndex = 0;
  
      // states: 'RED_REQUIRED', 'COLOR_REQUIRED', 'FINAL_COLORS'
      this.state = 'RED_REQUIRED';
  
      // track the "ball on" => which ball(s) is the correct ball to pot at a time
      this.ballOn = 'Red'; // might be 'Red' or a color name or 'AnyColor' if free ball
      this.freeBallActive = false; // set true if a free ball is declared
  
      // whether the current player is continuing a break 
      this.currentBreakPoints = 0;
    }
  
    get currentPlayer() {
      return this.players[this.currentPlayerIndex];
    }
  
    /*****************************************************
     * Switch to next player
     *****************************************************/
    switchPlayer() {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      this.currentBreakPoints = 0; // reset break points
    }
  
    /*****************************************************
     * Called when a shot finishes (no more collisions/pots).
     * We'll interpret the result (pots, fouls, etc.)
     * shotOutcome = {
     *   pottedBalls: [ { label: string }, ... ],
     *   foul: bool,
     *   foulInfo: { reason: string, ballValue: number } (optional),
     *   missed: bool  (if no pot, no foul => it's a "miss")
     * }
     *****************************************************/
    handleShotOutcome(shotOutcome) {
      const player = this.currentPlayer;
  
      // 1) handle fouls first
      if (shotOutcome.foul) {
        let foulPoints = this.getFoulPoints(shotOutcome.foulInfo);
        console.log(`FOUL committed by ${player}! +${foulPoints} to opponent`);
  
        // Opponent gets foul points
        let opponentIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let opponent = this.players[opponentIndex];
        this.addPoints(opponent, foulPoints);
  
        // Now we must see if a free ball condition arises:
        // i.e., the incoming player (opponent) is "snookered" on the ball on 
        // (cannot see any part of the ball on).
        // For simplicity, let's call a function you can fill in to check snooker:
        if (this.isFreeBallSituation()) {
          console.log("Free Ball declared!");
          this.freeBallActive = true;
        } else {
          this.freeBallActive = false;
        }
  
        // after a foul, the incoming player can choose:
        //  - "play next"  => switch turn 
        //  - or "force the fouling player to continue" 
        // For simplicity, let's always do a normal turn switch:
        this.switchPlayer();
        return;
      }
  
      // 2) handle pots
      let pottedLabels = shotOutcome.pottedBalls.map(b => b.label);
  
      if (pottedLabels.length === 0) {
        // No pot => It's a MISS, turn ends (unless free ball re-taken).
        console.log(`MISS by ${player}`);
        this.switchPlayer();
        return;
      }
  
      // If at least one pot happened, let's see if any are correct or incorrect
      let allBallsCorrect = true;
      let anyBallWrong = false;
      let totalPointsThisShot = 0;
  
      // In real snooker, if you pot multiple reds + colors in a single shot, 
      // you get all the points, unless there's a foul. 
      // We'll do a simplified approach: pot one "ball on" at a time.
  
      for (let label of pottedLabels) {
        let val = this.getBallValue(label);
  
        // Check if label is correct to pot
        if (!this.isCorrectBall(label)) {
          // If it's a free ball scenario, potting the free ball is allowed 
          //  if it has same or lower value than the real "ball on"
          if (this.freeBallActive && this.isLegalFreeBall(label)) {
            // allowed
            console.log(`Potted free ball as a correct ball: ${label}`);
            val = this.getBallValue(this.ballOn); // free ball points = value of "ball on"
          } else {
            console.log(`Foul: potted the wrong ball => ${label}`);
            // Foul => next shot. 
            let foulPoints = Math.max(4, val);
            // If the ball on is black, a foul can be 7
            if (this.ballOn === 'Black') {
              foulPoints = 7;
            }
            // Opponent gets foulPoints
            let oppIndex = (this.currentPlayerIndex + 1) % this.players.length;
            let opp = this.players[oppIndex];
            this.addPoints(opp, foulPoints);
  
            // Switch player
            this.switchPlayer();
            return;
          }
        }
  
        // If we got here => it's the correct ball
        console.log(`Good pot by ${player}: ${label}, +${val} points`);
        totalPointsThisShot += val;
        // Now handle re-spot or remove the ball
        if (label.startsWith('Red')) {
          // remove the red from the table
          this.redsRemaining--;
        } else if (this.state === 'RED_REQUIRED') {
          // Actually, you can't normally pot a color if we needed a red,
          // unless it's a free ball. 
          // But let's assume we handle that above with fouls.
        }
  
        // If we are in "COLOR_REQUIRED" and it's a color, typically we re-spot if reds remain
        // If we are in "FINAL_COLORS", we do not re-spot 
        // etc. We'll handle that in handleStateAfterPot below
      }
  
      // add total points to current player
      this.addPoints(player, totalPointsThisShot);
      this.currentBreakPoints += totalPointsThisShot;
  
      // Now update state
      this.handleStateAfterPot(pottedLabels);
    }
  
    /*****************************************************
     * Called after potting one or more correct balls
     * Figures out next state: still need color? or back to red?
     *****************************************************/
    handleStateAfterPot(pottedLabels) {
      // if any red is potted
      const pottedRed = pottedLabels.some(l => l.startsWith('Red'));
  
      // if a color is potted
      const pottedColor = pottedLabels.some(l => !l.startsWith('Red') && l !== 'Cue');
  
      if (this.state === 'RED_REQUIRED') {
        if (pottedRed) {
          // we remain at the table, now a color is required
          this.state = 'COLOR_REQUIRED';
          this.ballOn = 'AnyColor';
          if (this.redsRemaining <= 0) {
            // if no reds left, transition to final colors
            this.state = 'FINAL_COLORS';
            this.nextColorIndex = 0;
            this.ballOn = this.colorOrder[this.nextColorIndex]; 
          }
          this.freeBallActive = false;
        } else {
          // we didn't pot a red => foul or miss handled outside
        }
      } else if (this.state === 'COLOR_REQUIRED') {
        if (pottedColor) {
          // if reds remain, we go back to 'RED_REQUIRED'
          if (this.redsRemaining > 0) {
            this.state = 'RED_REQUIRED';
            this.ballOn = 'Red';
            this.freeBallActive = false;
          } else {
            // no reds => final colors
            this.state = 'FINAL_COLORS';
            this.nextColorIndex = 0;
            this.ballOn = this.colorOrder[this.nextColorIndex];
            this.freeBallActive = false;
          }
        }
      } else if (this.state === 'FINAL_COLORS') {
        // we must pot them in order
        let c = this.ballOn;
        if (pottedLabels.includes(c)) {
          // move to next color
          this.nextColorIndex++;
          if (this.nextColorIndex >= this.colorOrder.length) {
            // black was potted => frame ends
            if (this.onFrameEnd) this.onFrameEnd();
          } else {
            this.ballOn = this.colorOrder[this.nextColorIndex];
          }
        }
      }
  
      // If onStateChange is provided, you can notify the UI
      if (this.onStateChange) {
        this.onStateChange(this.state, this.ballOn);
      }
    }
  
    /*****************************************************
     * Return whether the given label is the "correct" ball 
     * for the current state (ignoring free ball).
     *****************************************************/
    isCorrectBall(label) {
      if (this.freeBallActive) {
        // we allow potting the nominated free ball or the actual ball on
        // logic handled in handleShotOutcome
        return false; // we'll handle in handleShotOutcome
      }
  
      if (this.state === 'RED_REQUIRED') {
        return label.startsWith('Red');
      }
      if (this.state === 'COLOR_REQUIRED') {
        return (!label.startsWith('Red') && label !== 'Cue');
      }
      if (this.state === 'FINAL_COLORS') {
        return (label === this.ballOn);
      }
      return false;
    }
  
    /*****************************************************
     * True if "label" is a legal free ball 
     * => any ball that is not the correct ball on, 
     *    but has "value" <= ballOn's value.
     *****************************************************/
    isLegalFreeBall(label) {
      let ballVal = this.getBallValue(label);
      let onVal = this.getBallValue(this.ballOn);
      return ballVal <= onVal;
    }
  
    /*****************************************************
     * Return numeric value of a ball label
     *****************************************************/
    getBallValue(ballLabel) {
      if (ballLabel.startsWith('Red')) return 1;
      const map = {
        Yellow: 2,
        Green: 3,
        Brown: 4,
        Blue: 5,
        Pink: 6,
        Black: 7
      };
      return map[ballLabel] || 0;
    }
  
    /*****************************************************
     * Return foul penalty for a shot:
     *   - min 4 points
     *   - if the ball on is black => can be up to 7
     *   - if the foul involves black, e.g. potted black incorrectly => 7
     *****************************************************/
    getFoulPoints(foulInfo) {
      // Example: { reason: "CueBallPotted", ballValue: 7 }
      let ballVal = foulInfo && foulInfo.ballValue ? foulInfo.ballValue : 0;
      let baseFoul = Math.max(4, ballVal);
      if (this.ballOn === 'Black') {
        baseFoul = 7; 
      }
      return baseFoul;
    }
  
    addPoints(player, pts) {
      this.points[player] += pts;
      if (this.onScoreUpdate) {
        this.onScoreUpdate(player, pts);
      }
    }
  
    /*****************************************************
     * Check if a free ball situation is declared 
     * if the incoming player is "snookered" on the ball on.
     * 
     * In real snooker, you need geometry checks:
     *  - If the next player has no direct line to any portion 
     *    of the "ball on," it's a free ball.
     * 
     * For demonstration, we do a simple placeholder returning false.
     *****************************************************/
    isFreeBallSituation() {
      // TODO: implement geometry to see if the next player 
      // can see the ball on. 
      // We'll do a dummy returning false for now:
      return false;
    }
  }
  