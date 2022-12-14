"use strict";
console.log("Tzolkin Solver is Running.");
//Base variables
class LocalStorageHandler {
    constructor(prefix) {
        //Build and load the current local storage
        this.prefix = prefix;
        //Load the meta-data if it already exists; otherwise create the meta data
        let metaDataString = localStorage.getItem(this.prefix + "-meta");
        if (metaDataString === null) {
            this.currentPos = -1; //Nothing has been written
            this.maxPos = -1; //Nothing has been written
            this.saveMetaData();
        }
        else {
            let metaData = JSON.parse(metaDataString);
            this.currentPos = metaData["currentPos"];
            this.maxPos = metaData["maxPos"];
        }
    }
    save(game) {
        //Iterate current position by 1 and save
        //Delete future positions if required
        this.currentPos += 1;
        localStorage.setItem(`${this.prefix}-${this.currentPos}`, game.stringify()); //Save
        console.log(`${this.prefix}-${this.currentPos} saved`);
        //Check if future items need to be saved over
        if (this.maxPos <= this.currentPos) {
            this.maxPos = this.currentPos;
        }
        else {
            //Something needs to be deleted, iterate through the max-saves and delete
            while (this.maxPos > this.currentPos) {
                localStorage.removeItem(`${this.prefix}-${this.maxPos}`);
                console.log(`${this.prefix}-${this.maxPos} removed`);
                this.maxPos -= 1;
            }
        }
        //Save the meta-data
        this.saveMetaData();
    }
    saveMetaData() {
        //Save self meta data
        localStorage.setItem(this.prefix + "-meta", JSON.stringify(this));
    }
    undo(game) {
        //Step current position back by 1 then load into the game provided
        if (this.currentPos < 0) {
            console.log("Cannot undo, no positions have been saved.");
        }
        else if (this.currentPos === 0) {
            console.log("Cannot undo, currently in the 1st position.");
        }
        else {
            this.currentPos -= 1;
            this.load(game);
        }
    }
    redo(game) {
        //Iterate the current position by 1 (if possible) and load
        if (this.currentPos >= this.maxPos) {
            console.log("Cannot redo, no future positions have been saved.");
        }
        else {
            this.currentPos += 1;
            this.load(game);
        }
    }
    load(game) {
        //Pull the current game from the localStorage
        //Override the game data with the new data
        if (this.currentPos < 0) {
            console.log("Cannot load, no positions have been saved.");
            //Save the current position
            this.save(game);
            return;
        }
        let gameString = localStorage.getItem(`${this.prefix}-${this.currentPos}`);
        console.log(`${this.prefix}-${this.currentPos} loaded`);
        if (gameString === null) {
            throw "Expected to load game string, got nothing.";
        }
        let gameObject = JSON.parse(gameString);
        //Unpack the gameObject onto the game
        game.unpack(gameObject);
        //Save the meta-data
        this.saveMetaData();
    }
    deleteAll() {
        //Remove all data saved in local storage & reset self
    }
}
class Player {
    constructor(id, color) {
        this.id = id;
        this.color = color;
        this.religion = [1, 1, 1];
        this.technology = [0, 0, 0, 0];
        this.buildings = [];
        this.score = 0;
        this.workersTotal = 3;
        this.workersFree = 3;
        this.corn = 0;
        this.skulls = 0;
        this.wood = 0;
        this.stone = 0;
        this.gold = 0;
        this.doubleAdvance = true;
    }
    hasArchitectureSavingsTech() {
        return this.technology[2] > 3;
    }
}
class Return {
    constructor(f, string = "", object = {}) {
        this.f = f;
        this.string = string;
        this.object = object;
    }
}
class Building {
    constructor(costs, rewards, color, buildingNumber) {
        this.costs = costs;
        this.rewards = rewards;
        this.color = color;
        this.id = buildingNumber;
    }
    pairs(game) {
        let player = game.players[game.turn];
        return [
            [this.costs.corn, player.corn, "corn"],
            [this.costs.wood, player.wood, "wood"],
            [this.costs.stone, player.stone, "stone"],
            [this.costs.gold, player.gold, "gold"]
        ];
    }
    testBuildResources(game, architecture) {
        let player = game.players[game.turn];
        let resourceDeficit = 0;
        for (let [cost, inventory, resourceName] of this.pairs(game)) {
            if (cost !== undefined && cost > inventory) {
                resourceDeficit += cost - player.corn;
            }
        }
        //Check if the player has architecture
        if (resourceDeficit > 1) {
            return false;
        }
        else if (resourceDeficit === 0) {
            return true;
        }
        else if (player.hasArchitectureSavingsTech() && architecture === true) {
            return true;
        }
        else {
            return false;
        }
    }
    performBuildResources(game, architecture, savedResource) {
        let player = game.players[game.turn];
        //Actually spend the resources to build something
        //testBuildResources must be run first otherwise something might be built without having the required resources
        //See if architecture should be offered
        if (architecture && player.hasArchitectureSavingsTech()) {
        }
    }
    testBuildCorn(game, architecture) {
        let player = game.players[game.turn];
        let cornCost = 0;
        for (let [cost, inventory, resourceName] of this.pairs(game)) {
            if (cost !== undefined) {
                cornCost += cost * 2; //Spend 2 corn per resource
            }
        }
        //Calculate final cost
        if (architecture && player.technology[2] > 3)
            [
                cornCost -= 2
            ];
        if (cornCost < 0) {
            cornCost = 0;
        }
        //See if the player has enough corn
        if (player.corn >= cornCost) {
            return true;
        }
        else {
            return false;
        }
    }
    rewardFreeWorkers() {
        //Returns the number of free workers that are awarded by this building
        if (this.rewards.freeWorkers !== undefined) {
            return this.rewards.freeWorkers;
        }
        else {
            return 0;
        }
    }
    rewardDiscountWorkers() {
        //Returns the number of discounts on workers that are awarded by this building
        if (this.rewards.workerDiscount !== undefined) {
            return this.rewards.workerDiscount;
        }
        else {
            return 0;
        }
    }
}
let allBuildings = [
    new Building({ wood: 1 }, { freeWorkers: 1 }, "yellow", 0),
    new Building({ wood: 4 }, { workerDiscount: 1 }, "yellow", 3),
    new Building({ wood: 2 }, { technology: [0] }, "green", 5),
    new Building({ wood: 1, stone: 1 }, { technology: [2], corn: 1 }, "green", 7),
    new Building({ stone: 1, gold: 1 }, { technology: [3], religion: [2] }, "blue", 10),
    new Building({ wood: 1, stone: 2, gold: 1 }, { religion: [0, 1, 2], points: 3 }, "brown", 100)
];
class TzolkinGame {
    constructor(ui, storage) {
        //Create a game (assume two player)
        //If ui is null, the game will not display
        //If storage is null, the game will not save
        this.P = new Array(10).fill(-1);
        this.PCorn = new Array(10).fill(0);
        this.PWood = new Array(10).fill(0);
        for (let i = 2; i <= 5; i++) {
            this.PWood[i] = 2;
        }
        this.Y = new Array(10).fill(-1);
        this.T = new Array(10).fill(-1);
        this.U = new Array(10).fill(-1);
        this.C = new Array(13).fill(-1);
        this.CSkull = new Array(11).fill(false);
        this.skulls = 13;
        this.monuments = [];
        this.buildings = [0, 1, 2, 3, 4, 5];
        this.bribe = 0;
        this.round = 1; //Round is indexed from one!
        this.turn = 0;
        this.firstPlayer = 0;
        this.firstPlayerSpace = -1;
        this.resourceDay = false;
        this.pointsDay = false;
        this.players = [
            new Player(0, "pink"),
            new Player(1, "SteelBlue")
        ];
        //Display and calculate
        this.calculationStack = [];
        this.helpText = "";
        this.godMode = false;
        //Non-saved data
        this.ui = ui;
        this.storage = storage;
        this.actions = {};
        //Caculate the starting turn
        this.calculationStack.push({ name: "turnStart" });
        this.calculate();
    }
    stringify() {
        let replacer = (key, value) => {
            if (key === "ui") {
                //Don't save the ui data
                return undefined;
            }
            else if (key === "actions") {
                //Don't save the actions data, will need to be re-calculated
                return undefined;
            }
            else if (key === "storage") {
                //Do not save the storage in the storage it messes everything up
                return undefined;
            }
            else {
                return value;
            }
        };
        return JSON.stringify(this, replacer);
    }
    unpack(gameObject) {
        //Enforce type on gameObject
        let gameObjectTyped = gameObject;
        //Assign the un-stringified gameObject to the game
        Object.assign(this, gameObjectTyped);
        //Assign the players
        if (gameObjectTyped.players === undefined) {
            throw "gameObject loaded does not have players defined";
        }
        this.players = [];
        let i = 0;
        for (let playerObject of gameObjectTyped.players) {
            let newPlayer = new Player(i, "grey");
            //Actually assign the player to the game
            this.players.push(Object.assign(newPlayer, playerObject));
            i += 1;
        }
        //Run the calculation to determine the actions avaliable
        this.calculate();
        //Refresh the visuals as if the previous action was just taken
        this.refresh();
    }
    getWheels() {
        //Return [wheel name, wheel, lengthOccupiable]
        return [
            ["P", this.P, 8],
            ["Y", this.Y, 8],
            ["T", this.T, 8],
            ["U", this.U, 8],
            ["C", this.C, 11]
        ];
    }
    calculate() {
        //Look at the calculation stack and perform the last calculation on the stack
        //Calculations should be removed from the stack when the next action is perfomred
        //Each action performed should add another calculation to the calculationStack
        if (this.calculationStack.length === 0) {
            throw "No calculations left to perform";
        }
        //Clear the avaliable action, they will be re-calculated
        this.actions = {};
        //get the next calculation
        let calculationIndex = this.calculationStack.length - 1;
        let currentCalculation = this.calculationStack[calculationIndex];
        //Switch through the calculation types
        if (currentCalculation.name === "turnStart") {
            let calc = currentCalculation;
            this.calcTurnStart();
        }
        else if (currentCalculation.name === "pickup") {
            let calc = currentCalculation;
            this.calcPickup2(calc.workersPickedup);
        }
        else if (currentCalculation.name === "place") {
            let calc = currentCalculation;
            this.calcPlace2(calc.workersPlaced);
        }
        else if (currentCalculation.name === "chooseAction") {
            let calc = currentCalculation;
            this.calcChooseAction(calc.wheel, calc.position);
        }
        else if (currentCalculation.name === "begReligion") {
            let calc = currentCalculation;
            this.calcBegReligion();
        }
        else {
            throw "Calculation not recognized";
        }
    }
    calcTurnStart() {
        this.helpText = "Choose starting action.";
        let player = this.players[this.turn];
        this.calcPickup2(0);
        this.calcPlace2(0);
        //Calculate begging for corn option
        if (player.corn < 3 && player.religion[0] > 0 && player.religion[1] > 0 && player.religion[2] > 0) {
            this.actions["beg"] = () => {
                //Beg for corn
                player.corn = 3;
                //Add the startover action
                this.calculationStack.push({ name: "turnStart" });
                //Add the beg religion calculation
                this.calculationStack.push({ name: "begReligion" });
            };
        }
        //Calculate the pitty option
        if (Object.keys(this.actions).length === 0) {
            this.calcPity();
        }
    }
    calcPickup2(workersPickedup) {
        //Iterate through all the wheels to decide which worker to pick up
        if (workersPickedup === 0) {
            //First worker to be picked up - must be picked up
        }
        else {
            this.helpText = "Choose another worker to pick up.";
            this.actions["end"] = () => {
                //End turn action is now avaliable
                this.performEndTurn();
            };
        }
        let player = this.players[this.turn];
        //Iterate through all the wheels and positions
        for (let [wheelName, wheel, lengthOccupiable] of this.getWheels()) {
            for (let pos = 0; pos < this.C.length; pos++) {
                if (pos < lengthOccupiable) {
                    //Check if player has a piece there
                    if (wheel[pos] === this.turn) {
                        //Player can pickup from this location
                        this.actions[`${wheelName}${pos}`] = () => {
                            //Perform the pickup actions
                            player.workersFree += 1; //Return a worker to the player
                            wheel[pos] = -1; //Set the wheel positon to -1
                            //Add the next pickup to the stack
                            this.calculationStack.push({
                                name: "pickup",
                                workersPickedup: workersPickedup + 1
                            });
                            //Add the chooseAction calculation to the stack
                            this.calculationStack.push({
                                name: "chooseAction",
                                wheel: wheelName,
                                position: pos,
                            });
                        };
                    }
                }
            }
        }
        //Check if end turn is the only option
        if (Object.keys(this.actions).length === 0 && "end" in this.actions) {
            this.helpText = "No more workers can be picked up. Please end turn.";
        }
    }
    calcPlace2(workersPlaced) {
        //Iterate through all the wheels to decide where a worker can be placed
        if (workersPlaced === 0) {
            //First worker must be placed
        }
        else {
            this.helpText = `Choose another placement for ${workersPlaced}+ corn.`;
            this.actions["end"] = () => {
                this.performEndTurn();
            };
        }
        let player = this.players[this.turn];
        //Check if ther player has free workers
        if (player.workersFree <= 0) {
            return; //Done, no new workers that can be placed
        }
        //Find the lowest numbered spot (if there are still workers free)
        for (let [wheelName, wheel, lengthOccupiable] of this.getWheels()) {
            let foundOpenPosition = false;
            for (let pos = 0; pos < this.C.length; pos++) {
                if (pos < lengthOccupiable) {
                    //Need empty spot and corn
                    if (player.corn >= pos + workersPlaced && wheel[pos] === -1) {
                        //Worker can be placed here
                        this.actions[`${wheelName}${pos}`] = () => {
                            //Place the worker
                            player.corn -= pos + workersPlaced;
                            player.workersFree -= 1;
                            wheel[pos] = player.id;
                            //Add next placement to the stack
                            this.calculationStack.push({
                                name: "place",
                                workersPlaced: workersPlaced + 1
                            });
                        };
                    }
                    //break to next wheel on finding an open position
                    if (wheel[pos] === -1) {
                        foundOpenPosition = true;
                        break;
                    }
                }
            }
            //Break on open position
            if (foundOpenPosition) {
                continue;
            }
        }
        //Check the starting spot
        if (this.firstPlayerSpace === -1 && player.corn >= workersPlaced) {
            //Worker can be placed on starting position
            this.actions[`S`] = () => {
                player.workersFree -= 1;
                this.firstPlayerSpace = this.turn;
                //Add next placement to the stack
                this.calculationStack.push({
                    name: "place",
                    workersPlaced: workersPlaced + 1
                });
            };
        }
        //Check if end turn is the only option
        if (Object.keys(this.actions).length === 0 && "end" in this.actions) {
            this.helpText = "No more workers can be placed. Please end turn.";
        }
    }
    calcPity() {
        throw "TODO calulate pity not yet programmed.";
    }
    calcBegReligion() {
        //This is a sub calculation, does not inherently add another calculation to the stack
        let player = this.players[this.turn];
        //Choose the religion track to go down on
        for (let i = 0; i < 3; i++) {
            if (player.religion[i] > 0) {
                this.actions[`p${this.turn}R${"ABC"[i]}`] = () => {
                    //Reduce on that religion
                    player.religion[i] -= 1;
                };
            }
        }
    }
    calcSpinOneTwo() {
        //This calculation gives the player the choice between sprinning the
        //wheel once or twice
        this.actions["spinOne"] = () => {
            this.performAdvanceCalendar(1);
        };
        this.actions["spinTwo"] = () => {
            this.performAdvanceCalendar(2);
        };
    }
    calcChooseAction(wheel, pos) {
        console.log("TODO Choose Action not yet implemented.");
    }
    refresh() {
        if (this.ui !== null) {
            this.ui.refresh();
        }
    }
    performAction(actionName) {
        //Perform an action
        if (actionName in this.actions) {
            //Remove the most recent calculation from the stack
            this.calculationStack.pop();
            //Clear the actions then play this action - more calculations should be added to the stack
            let f = this.actions[actionName]; //Grab the function to be called
            f(); //Call the function
            //Perform the next calculation in the stack - which clears the actions as a side effect
            this.calculate();
            //Update the ui
            this.refresh();
            //Save the state of the game
            if (this.storage !== null) {
                this.storage.save(this);
            }
        }
        else {
            console.log(`Action "${actionName}" not recognized as a legal move.`);
        }
    }
    performEndTurn() {
        //Performance of the end turn
        this.turn = (this.turn + 1) % this.players.length;
        //Check if it is the end of the year
        if (this.turn === this.firstPlayer) {
            //make a flag for auto spinning the wheel at the end of the turn
            let spinWithoutChoice;
            //Check if starting player space taken
            if (this.firstPlayerSpace >= 0) {
                //Starting player space is taken
                if (this.players[this.firstPlayerSpace].doubleAdvance === true &&
                    this.P[6] < 0 && this.Y[6] < 0 && this.T[6] &&
                    this.U[6] < 0 && this.C[9] < 0) {
                    //Player has the ability to double advance
                    //And no one would be pushed off the wheel by a double advance
                    this.calculationStack.push({ name: "spinOneTwo" });
                    spinWithoutChoice = false;
                }
                else {
                    spinWithoutChoice = true;
                }
                //Select the new starting player
                if (this.firstPlayer !== this.firstPlayerSpace) {
                    this.firstPlayer = this.firstPlayerSpace;
                }
                else {
                    this.firstPlayer = (this.firstPlayer + 1) % this.players.length;
                }
                //Award the bribe ot the firstPlayerSpace taker
                this.players[this.firstPlayerSpace].corn += this.bribe;
                this.bribe = 0;
                //Spin the wheel if the player doesn't get a choice
            }
            else {
                //No one has chosen first player, normal spin
                spinWithoutChoice = true;
            }
            //Perform end of year bonuses
            //Resource days
            if (this.resourceDay === true) {
                for (let i = 0; i < this.players.length; i++) {
                    let player = this.players[i];
                    //Income on resource days
                    if (player.religion[0] >= 2) {
                        player.stone += 1;
                    }
                    if (player.religion[0] >= 4) {
                        player.stone += 1;
                    }
                    if (player.religion[1] >= 3) {
                        player.gold += 1;
                    }
                    if (player.religion[1] >= 5) {
                        player.gold += 1;
                    }
                    if (player.religion[2] >= 2) {
                        player.wood += 1;
                    }
                    if (player.religion[2] >= 4) {
                        player.wood += 1;
                    }
                    if (player.religion[2] >= 5) {
                        player.skulls += 1;
                    }
                }
            }
            //Points days
            if (this.pointsDay === true) {
                //Points days
                let playersByReligionLevel = [
                    [[], [], [], [], [], [], [],],
                    [[], [], [], [], [], [], [], [], [],],
                    [[], [], [], [], [], [], [], [],]
                ];
                for (let i = 0; i < this.players.length; i++) {
                    //Cylce through each player
                    let player = this.players[i];
                    //Income on resource days
                    if (this.resourceDay === true) {
                    }
                    //Points on points days
                    if (this.pointsDay === true) {
                        //Points on points days
                        player.score += [-1, 0, 2, 4, 6, 7, 8][player.religion[0]]; //RA
                        player.score += [-2, 0, 1, 2, 4, 6, 9, 12, 13][player.religion[1]]; //RB
                        player.score += [-3, 0, 1, 3, 5, 7, 9, 10][player.religion[2]]; //RC
                        for (let r = 0; r < 3; r++) {
                            //Cycle throgh religions place the player in the religion track
                            playersByReligionLevel[r][player.religion[r]].push(i); //player number
                        }
                    }
                }
                //Award bonus points function
                let award = (track, points) => {
                    for (let j = track.length - 1; j >= 0; j--) {
                        //Iterate down through the track
                        if (track[j].length === 1) {
                            //Found a player in the highest spot
                            this.players[track[j][0]].score += points;
                            //Break the iteration
                            break;
                        }
                        else if (track[j].length > 1) {
                            //found multiple players in the highest spot
                            //They each get half points
                            for (let playerNumber of track[j]) {
                                this.players[playerNumber].score += points / 2;
                            }
                            //break the iteration
                            break;
                        }
                    }
                };
                //Actually award the bonus points
                if (this.round >= 27) {
                    //End of game points
                    award(playersByReligionLevel[0], 2);
                    award(playersByReligionLevel[1], 6);
                    award(playersByReligionLevel[2], 4);
                }
                else {
                    //Mid-game points
                    award(playersByReligionLevel[0], 6);
                    award(playersByReligionLevel[1], 2);
                    award(playersByReligionLevel[2], 4);
                }
            }
            //Players must feed their workers
            for (let i = 0; i < this.players.length; i++) {
                console.log("feeding player", i);
                let player = this.players[i];
                let workersToFeed = player.workersTotal;
                let costPerWorker = 2;
                //Apply building discounts
                for (let buildingNumber of player.buildings) {
                    let building = allBuildings[buildingNumber];
                    workersToFeed -= building.rewardFreeWorkers();
                    costPerWorker -= building.rewardDiscountWorkers();
                }
                //Check if workers need to be fed
                if (workersToFeed <= 0 || costPerWorker <= 0) {
                    //No feeding required
                }
                else {
                    //Feed the workers
                    while (workersToFeed > 0) {
                        if (player.corn >= costPerWorker) {
                            //Feed the worker corn
                            player.corn -= costPerWorker;
                        }
                        else {
                            //Feed the worker points
                            player.score -= 3;
                        }
                        workersToFeed -= 1;
                    }
                }
            }
            //Clear end of year bonuses
            this.resourceDay = false;
            this.pointsDay = false;
            //End the game if the game is over
            if (this.round >= 27) {
                throw ("TODO: write end of game code");
            }
            //Spin the wheel if no player has a choice
            if (spinWithoutChoice === true) {
                this.performAdvanceCalendar(1);
            }
        }
        else {
            //If the round is not over, push to the next players turn
            this.calculationStack.push({ name: "turnStart" });
        }
    }
    performAdvanceCalendar(numDays) {
        //Advances the calendar (numDays) days
        //Does NOT perform check to confirm that the num days requested is valid
        //That needs to happen elsewhere
        for (let k = 0; k < numDays; k++) {
            //Check if a workers is on the starting position and change first player
            if (this.firstPlayerSpace !== -1) {
                //Shift the first player token
                if (this.firstPlayerSpace !== this.firstPlayer) {
                    this.firstPlayer = this.firstPlayerSpace;
                }
                else {
                    this.firstPlayer = (this.firstPlayer + 1) % this.players.length;
                }
                //Give the bribe to the person who selected first player
                this.players[this.firstPlayerSpace].corn += this.bribe;
                this.bribe = 0;
                //Return the worker
                this.players[this.firstPlayerSpace].workersFree += 1;
                this.firstPlayerSpace = -1;
            }
            //Iterate through each wheel and move the workers forward
            for (let [wheelName, wheel, lengthOccupiable] of this.getWheels()) {
                let lasPositionValue = wheel[wheel.length - 1];
                //Roll the wheel forward
                for (let i = wheel.length - 1; i > 0; i--) {
                    //Iterate backwards through the wheel moving the workers
                    wheel[i] = wheel[i - 1];
                }
                //Set 0th to last position
                wheel[0] = lasPositionValue;
                //Return workers from the last spot, advance last spot to first spot
                if (wheel[lengthOccupiable] >= 0) {
                    //Player worker to be returned
                    this.players[wheel[lengthOccupiable]].workersFree += 1;
                    wheel[lengthOccupiable] = -1;
                }
            }
            //Increace the round number
            this.round += 1;
            //Check if it is a food or a points day and change the appropopriate flag
            if (this.round === 8 || this.round === 21) {
                this.resourceDay = true;
            }
            if (this.round === 14 || this.round === 27) {
                this.pointsDay = true;
            }
        }
        //After spinning set the turn to the first player
        this.turn = this.firstPlayer;
        //Once spinning the wheel is done, give control back to the player to start a turn
        this.calculationStack.push({ name: "turnStart" });
    }
    //GOD FUNCTIONS
    //Each should start with a check/throw & end with a refresh
    godModeToggle() {
        //Toggles on and off god mode; saves a copy of the modified game
        if (game.godMode) {
            //Turn god mode off
            this.godMode = false;
            //Recalculate the total workers for each player
            for (let player of game.players) {
                player.workersTotal = player.workersFree;
            }
            //Count workers that are on the wheels
            for (let [wheelName, wheel, lastSpot] of this.getWheels()) {
                for (let i = 0; i < wheel.length; i++) {
                    if (wheel[i] >= 0) {
                        this.players[wheel[i]].workersTotal += 1;
                    }
                }
            }
            //Recalculate the actions
            game.calculate();
        }
        else {
            //Turn god mode on
            this.godMode = true;
        }
        //Update UI
        this.refresh();
        //Save the state of the game
        if (this.storage !== null) {
            this.storage.save(this);
        }
    }
    godRotateWorker(wheelName, spaceNumber) {
        //Calculate the next worker type on the wheel and place
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        this[wheelName][spaceNumber] += 1;
        if (this[wheelName][spaceNumber] >= this.players.length) {
            this[wheelName][spaceNumber] = -2;
        }
        this.refresh();
    }
    godRotateFirstPlacerSpaceWorker() {
        //god mode, rotate the worker on the first player space
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        this.firstPlayerSpace += 1;
        if (this.firstPlayerSpace >= this.players.length) {
            this.firstPlayerSpace = -1;
        }
        this.refresh();
    }
    godPickupTile(spaceNumber, type) {
        //Pickup either a wood or a corn tile
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        if (type === "w") {
            if (this.PWood[spaceNumber] === 0) {
                this.PWood[spaceNumber] = this.players.length;
            }
            else {
                this.PWood[spaceNumber] -= 1;
            }
        }
        else {
            if (this.PCorn[spaceNumber] === 0) {
                this.PCorn[spaceNumber] = this.players.length;
            }
            else {
                this.PCorn[spaceNumber] -= 1;
            }
        }
        this.refresh();
    }
    godSetSkull(spaceNumber) {
        //Set a skill on the C wheel
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        this.CSkull[spaceNumber] = !this.CSkull[spaceNumber];
        this.refresh();
    }
    godStepReligion(playerNumber, religionNumber, delta) {
        //Increase or decrease religion by the delta
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        let max = 7;
        switch (religionNumber) {
            case 0:
                max = 7;
                break;
            case 1:
                max = 9;
                break;
            case 2:
                max = 8;
                break;
            default:
                throw "Religion not recognized.";
                break;
        }
        let r = this.players[playerNumber].religion;
        r[religionNumber] = (r[religionNumber] + delta) % max;
        this.refresh();
    }
    godStepTechnology(playerNumber, technologyNumber) {
        //Increase technology by a step
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        let t = this.players[playerNumber].technology;
        t[technologyNumber] = (t[technologyNumber] + 1) % 4;
        this.refresh();
    }
    godSetFirstPlayer(playerNumber) {
        //Set first player (-1 is not taken)
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        this.firstPlayerSpace = playerNumber;
        this.refresh();
    }
    godSetPlayerResourceValue(playerNumber, resource, value) {
        //Set a player resource value
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        this.players[playerNumber][resource] = value;
        this.refresh();
    }
    godSetInformationValue(informationName, value) {
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        this[informationName] = value;
        this.refresh();
    }
    godTogglePlayerDoubleAdvance(playerNumber) {
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        this.players[playerNumber].doubleAdvance = !this.players[playerNumber].doubleAdvance;
        this.refresh();
    }
    godToggleProperty(property) {
        if (this.godMode === false) {
            throw "godMode not enabled";
        }
        this[property] = !this[property]; //Toggle the property
        this.refresh();
    }
}
class Refreshable {
    constructor(game) {
        this.game = game;
        if (game.ui === null) {
            throw "game has not been assigned a ui. ui must be assigned to the game before creating elements";
        }
        else {
            this.ui = game.ui;
        }
        this.ui.addRefreshable(this);
    }
    refresh() {
        //Refresh must be implemented by sub-class
        throw "refresh must be impemented by sub-class.";
    }
    setGame(game) {
        this.game = game;
    }
}
class TileBase extends Refreshable {
    constructor(game, parentDom, topText = "", bottomText = "") {
        super(game);
        let templateArea = document.getElementById("TEMPLATES");
        let template = templateArea.getElementsByClassName("TILE")[0];
        this.dom = template.cloneNode(true);
        this.setTopText(topText);
        this.setBottomText(bottomText);
        //Add the dom to the tree
        parentDom.appendChild(this.dom);
        //action name should be defined in sub-classes
        this.actionName = "NONE";
    }
    setTopText(text) {
        let topDom = this.dom.getElementsByClassName("TOP-TEXT")[0];
        topDom.textContent = text;
    }
    setBottomText(text) {
        let bottomDom = this.dom.getElementsByClassName("BOTTOM-TEXT")[0];
        bottomDom.textContent = text;
    }
    //super.refresh must be called from all subclasses for highlighting to work
    refresh() {
        if (this.actionName in game.actions || game.godMode) {
            this.dom.classList.add("highlight");
        }
        else {
            this.dom.classList.remove("highlight");
        }
    }
}
class TileBaseBottomText extends TileBase {
    //A tile that only has text on the bottom (used for wwod/corn tiles & Chichen Itza skull indication)
    constructor(game, parentDom, bottomText = "") {
        super(game, parentDom, "", bottomText);
        this.dom.getElementsByClassName("tile-top-text")[0].remove();
        this.dom.getElementsByTagName("br")[0].remove();
    }
}
class WheelSpace extends TileBase {
    constructor(game, parentDom, wheel, spaceNumber, bottomText = "") {
        let topText = wheel + spaceNumber.toString();
        super(game, parentDom, wheel + spaceNumber.toString(), bottomText);
        this.actionName = topText;
        this.wheel = wheel;
        this.spaceNumber = spaceNumber;
        //Onclick cycle to the next player for this space, -1 after all players;
        //In god mode so that resource values are not changed
        this.dom.onclick = x => {
            if (game.godMode) {
                this.game.godRotateWorker(wheel, spaceNumber);
            }
            else {
                this.game.performAction(this.actionName);
            }
        };
    }
    refresh() {
        super.refresh();
        //Update the visuals to reflect the game
        //Change the background color
        let player = this.game[this.wheel][this.spaceNumber];
        if (player === -1) {
            this.dom.style.backgroundColor = "white";
        }
        else if (player === -2) {
            this.dom.style.backgroundColor = "lightgrey";
        }
        else {
            this.dom.style.backgroundColor = this.game.players[player].color;
        }
    }
}
class WheelSpaceEnd extends WheelSpace {
    //End wheel space that only carries workers, cannot be placed there
    constructor(game, parentDom, wheel, spaceNumber) {
        super(game, parentDom, wheel, spaceNumber, "");
        this.setTopText("-");
    }
}
class ResourceTile extends TileBaseBottomText {
    constructor(game, parentDom, spaceNumber, type, visible) {
        //Create resource tiles at spacenumber of type wood or corn; make tile visible with true
        super(game, parentDom, "");
        this.actionName = `T${spaceNumber}${type}`;
        this.type = type;
        this.spaceNumber = spaceNumber;
        //Define onClick
        this.dom.onclick = x => {
            if (game.godMode) {
                this.game.godPickupTile(this.spaceNumber, this.type);
            }
            else {
                this.game.performAction(this.actionName);
            }
        };
        //Set the background color
        if (this.type === "w") {
            this.dom.classList.add("wood-color");
        }
        else {
            this.dom.classList.add("corn-color");
        }
        //Make invisible and space taking in appropriate
        if (visible === false) {
            this.dom.style.visibility = "hidden";
        }
    }
    refresh() {
        super.refresh();
        let remaining;
        if (this.type === "w") {
            remaining = this.game.PWood[this.spaceNumber];
        }
        else {
            remaining = this.game.PCorn[this.spaceNumber];
        }
        this.setBottomText(remaining + this.type);
    }
}
class SkullSpace extends TileBaseBottomText {
    constructor(game, parentDom, spaceNumber, visible) {
        //Shows if the spot has been taken by the skull already
        super(game, parentDom, "");
        this.actionName = "NONE";
        this.spaceNumber = spaceNumber;
        //Set onclick action
        this.dom.onclick = x => {
            if (game.godMode) {
                this.game.godSetSkull(this.spaceNumber);
            }
        };
        //Set the background color
        this.dom.classList.add("skull-color");
        //Make invisible and space taking in appropriate
        if (visible === false) {
            this.dom.style.visibility = "hidden";
        }
    }
    refresh() {
        super.refresh();
        if (this.game.CSkull[this.spaceNumber] === true) {
            this.setBottomText("k");
        }
        else {
            this.setBottomText("-");
        }
    }
}
class ResourcesSpace extends TileBase {
    constructor(game, parentDom, playerNumber, resource, promptString, bottomText, className) {
        //Show all the resources owned by a player
        //Inputs: bottomText-resource type, resouce:string of resource type, className:CSS class name, promptString: resource name as presented to player
        super(game, parentDom, "", bottomText);
        this.actionName = "NONE";
        this.playerNumber = playerNumber;
        this.resource = resource;
        //Change appearance
        this.dom.classList.add(className);
        //onclick
        this.dom.onclick = x => {
            if (this.game.godMode) {
                let input = prompt(`Player ${this.playerNumber} ${promptString}:`, this.resouceCount().toString());
                if (input === null) {
                    //If user does not input, don't change anything
                    return;
                }
                let ret = this.validateCount(input);
                if (ret.f === true) {
                    this.setCount(parseInt(input));
                }
                this.refresh();
            }
        };
    }
    refresh() {
        super.refresh();
        //Show updated text
        this.setTopText(this.resouceCount().toString());
    }
    resouceCount() {
        return this.game.players[this.playerNumber][this.resource];
    }
    validateCount(input) {
        let valid = /^\d+$/.test(input);
        if (valid) {
            return new Return(true, "");
        }
        else {
            return new Return(false, "Invalid user input. Input must be a non-negative integer.");
        }
    }
    setCount(value) {
        this.game.godSetPlayerResourceValue(this.playerNumber, this.resource, value);
    }
}
class BooleanSpace extends TileBase {
    constructor(game, parentDom, bottomText, property) {
        //Spacce for showing a boolean value
        super(game, parentDom, "", bottomText);
        this.property = property;
        this.dom.onclick = () => {
            if (game.godMode) {
                this.game.godToggleProperty(property);
            }
        };
    }
    refresh() {
        super.refresh();
        if (this.game[this.property] === true) {
            this.setTopText("yes");
        }
        else {
            this.setTopText("no");
        }
    }
}
class DoubleAdvanceSpace extends TileBase {
    constructor(game, parentDom, playerNumber) {
        //Space for showing if the player can advance the wheel twice
        super(game, parentDom, "", "x2 Avaliable");
        this.playerNumber = playerNumber;
        this.dom.onclick = () => {
            if (game.godMode) {
                this.game.godTogglePlayerDoubleAdvance(this.playerNumber);
            }
        };
    }
    refresh() {
        super.refresh();
        if (this.game.players[this.playerNumber].doubleAdvance === true) {
            this.setTopText("yes");
        }
        else {
            this.setTopText("no");
        }
    }
}
class TrackSpace extends TileBase {
    constructor(game, parentDom, playerNumber, type, subType, bottomTextArray, className) {
        //Space for showing religion and technology progress
        let topText;
        if (type === "religion") {
            topText = "R" + "ABCD"[subType];
        }
        else {
            topText = "T" + "ABCD"[subType];
        }
        //Call super for the function
        super(game, parentDom, topText, "");
        this.actionName = `p${playerNumber}${topText}`;
        this.playerNumber = playerNumber;
        this.type = type;
        this.subType = subType;
        this.bottomTextArray = bottomTextArray;
        //Make the color
        this.dom.classList.add(className);
        //Set click function
        this.dom.onclick = x => {
            if (this.game.godMode) {
                if (this.type === "religion") {
                    this.game.godStepReligion(this.playerNumber, this.subType, 1);
                }
                else {
                    this.game.godStepTechnology(this.playerNumber, this.subType);
                }
            }
            else {
                this.game.performAction(this.actionName);
            }
        };
    }
    refresh() {
        super.refresh();
        if (this.type === "religion") {
            this.setBottomText(this.bottomTextArray[this.game.players[this.playerNumber].religion[this.subType]]);
        }
        else {
            this.setBottomText(this.bottomTextArray[this.game.players[this.playerNumber].technology[this.subType]]);
        }
    }
}
class InfoSpace extends TileBase {
    constructor(game, parentDom, type, bottomText = "") {
        super(game, parentDom, "", bottomText);
        this.actionName = "NONE";
        this.type = type;
        //Set onclick
        this.dom.onclick = x => {
            if (this.game.godMode) {
                let input = window.prompt(`Set ${bottomText}:`, this.value().toString());
                if (input === null) {
                    return;
                }
                let ret = this.validateValue(input);
                if (ret.f === true) {
                    this.setValue(parseInt(input));
                }
            }
        };
    }
    value() {
        return this.game[this.type];
    }
    validateValue(input) {
        let valid = /^\d+$/.test(input);
        if (valid) {
            return new Return(true, "");
        }
        else {
            return new Return(false, "Invalid user input. Input must be a non-negative integer.");
        }
    }
    setValue(value) {
        this.game.godSetInformationValue(this.type, value);
    }
    refresh() {
        super.refresh();
        this.setTopText(this.value().toString());
    }
}
class FirstPlayerSpace extends TileBase {
    constructor(game, parentDom, bottomText = "") {
        super(game, parentDom, "S", bottomText);
        this.actionName = "S";
        //onclick
        this.dom.onclick = x => {
            if (this.game.godMode) {
                let newFirstPlayerSpace = this.game.firstPlayerSpace + 1;
                if (newFirstPlayerSpace === this.game.players.length) {
                    newFirstPlayerSpace = -1;
                }
                this.game.godRotateFirstPlacerSpaceWorker();
            }
            else {
                this.game.performAction(this.actionName);
            }
        };
    }
    refresh() {
        super.refresh();
        if (this.game.firstPlayerSpace === -1) {
            this.dom.style.backgroundColor = "white";
        }
        else {
            this.dom.style.backgroundColor = this.game.players[this.game.firstPlayerSpace].color;
        }
    }
}
class SpecialAction extends TileBase {
    //Special actions that will pop up at the top
    constructor(game, parentDom, topText, actionName) {
        super(game, parentDom, topText, "");
        this.actionName = actionName;
        this.dom.classList.add("special");
        this.dom.onclick = x => {
            this.game.performAction(this.actionName);
        };
    }
    //Hide if not an avaliable action
    refresh() {
        super.refresh();
        if (this.actionName in this.game.actions) {
            this.dom.style.display = "inline";
        }
        else {
            this.dom.style.display = "none";
        }
    }
}
class HelpText extends Refreshable {
    //Text that is shown at the top of the window
    constructor(game, selfDom) {
        super(game);
        this.dom = selfDom;
    }
    refresh() {
        this.dom.textContent = this.game.helpText;
    }
}
class BuildingTile extends TileBase {
    constructor(game, parentDom, pos) {
        super(game, parentDom, "", "");
        this.actionName = `B${pos}`;
        this.pos = pos;
        //Show the bottom text as large
    }
    numSim(n, symbol) {
        //Function for simplifying numbers
        //Retunrs "" for undefined values
        if (n === 0 || n === undefined) {
            return "";
        }
        else if (n === 1 && symbol !== "c" && symbol !== "p") {
            //Corn and points should always have a number
            return symbol + " ";
        }
        else {
            return n.toString() + symbol + " ";
        }
    }
    getBaseText(base) {
        let text = "";
        text += this.numSim(base.corn, "c");
        text += this.numSim(base.skulls, "k");
        text += this.numSim(base.wood, "w");
        text += this.numSim(base.stone, "s");
        text += this.numSim(base.gold, "g");
        text += this.numSim(base.points, "p");
        return text.slice(0, text.length - 1);
    }
    refresh() {
        super.refresh();
        //Ensure that there is a building to display
        if (this.pos >= game.buildings.length) {
            this.setTopText("");
            this.setBottomText("");
            return;
        }
        let building = allBuildings[this.game.buildings[this.pos]];
        //Show the toptext
        this.setTopText(this.getBaseText(building.costs));
        //Calculate and show the bottom text
        let bottomText = "";
        //bottom text technology
        if (building.rewards.technology !== undefined) {
            for (let techNum of building.rewards.technology) {
                if (techNum === -1) {
                    bottomText += "TX ";
                }
                else {
                    bottomText += `T${"ABCD"[techNum]} `;
                }
            }
        }
        //Bottom text religion
        if (building.rewards.religion !== undefined) {
            for (let religionNum of building.rewards.religion) {
                if (religionNum === -1) {
                    bottomText += "RX ";
                }
                else {
                    bottomText += `R${"ABC"[religionNum]} `;
                }
            }
        }
        //Build
        if (building.rewards.build === true) {
            bottomText += "B ";
        }
        //Free workers
        if (building.rewards.freeWorkers !== undefined) {
            bottomText += "W".repeat(building.rewards.freeWorkers) + " ";
        }
        //worker discount
        if (building.rewards.workerDiscount !== undefined) {
            bottomText += `W:-${building.rewards.workerDiscount}c `;
        }
        //Normal reqards
        bottomText += this.getBaseText(building.rewards);
        //Set the bottom text
        this.setBottomText(bottomText);
    }
}
class PlayerDOM extends Refreshable {
    constructor(game, parentDom, playerNumber) {
        //Set up a player area for the given player number
        super(game);
        this.playerNumber = playerNumber;
        let templates = document.getElementById("TEMPLATES");
        let playerTemplate = templates.getElementsByClassName("PLAYER-X-AREA")[0];
        this.dom = playerTemplate.cloneNode(true);
        this.dom.style.display = "block";
        parentDom.appendChild(this.dom);
        //Declare some re-used variables
        let area;
        //Set the player name
        area = this.dom.getElementsByClassName("PLAYER-NAME")[0];
        area.textContent = `Player ${this.playerNumber}`;
        //Setup player areas
        area = this.dom.getElementsByClassName("RESOURCES")[0];
        new ResourcesSpace(game, area, playerNumber, "score", "score", "points", "score-color");
        new ResourcesSpace(game, area, playerNumber, "workersFree", "free workers", "workers", "worker-color");
        new ResourcesSpace(game, area, playerNumber, "corn", "corn", "corn", "corn-color");
        new ResourcesSpace(game, area, playerNumber, "skulls", "skulls", "skulls", "skull-color");
        new ResourcesSpace(game, area, playerNumber, "wood", "wood", "wood", "wood-color");
        new ResourcesSpace(game, area, playerNumber, "stone", "stone", "stone", "stone-color");
        new ResourcesSpace(game, area, playerNumber, "gold", "gold", "gold", "gold-color");
        new DoubleAdvanceSpace(game, area, playerNumber);
        new ResourcesSpace(game, area, playerNumber, "workersTotal", "total workers", "Total W", "NONE");
        //Setup religion and technology area
        area = this.dom.getElementsByClassName("TECHNOLOGY")[0];
        new TrackSpace(game, area, playerNumber, "religion", 0, ["-1p", "0p", "2p s", "4p", "6p s", "7p", "8p *"], "religion-0-color");
        new TrackSpace(game, area, playerNumber, "religion", 1, ["-2p", "0p", "1p", "2p g", "4p", "6p g", "9p", "12p", "13p *"], "religion-1-color");
        new TrackSpace(game, area, playerNumber, "religion", 2, ["-1p", "0p", "1p w", "3p", "5p w", "7p k", "9p", "10p *"], "religion-2-color");
        new TrackSpace(game, area, playerNumber, "technology", 0, ["", "+1/0c", "+1/1c tile", "+3/1c tile", "R"], "none");
        new TrackSpace(game, area, playerNumber, "technology", 1, ["", "+w", "+w/s", "+w/s/g", "2x"], "none");
        new TrackSpace(game, area, playerNumber, "technology", 2, ["", "B: 1c", "B: 1c 2p", "B: 1c 2p -x", "3p"], "none");
        new TrackSpace(game, area, playerNumber, "technology", 3, ["", ">C", ">C x:R", ">C x:R +k", "k"], "none");
    }
    refresh() { }
}
class UIHandler {
    constructor(parentDom) {
        //Create a UI for a Tzolkin Game
        //Create the list of refreshables
        this.refreshables = [];
        //Setup my Dom element
        let templates = document.getElementById("TEMPLATES");
        let gameTemplate = templates === null || templates === void 0 ? void 0 : templates.getElementsByClassName("TZOLKIN-GAME")[0];
        this.dom = gameTemplate.cloneNode(true);
        parentDom.appendChild(this.dom);
    }
    create(game) {
        //Actually make the UI
        let templates = document.getElementById("TEMPLATES");
        //Setup needed variables
        let area;
        let rewards;
        let i;
        //Help Text area
        area = this.dom.getElementsByClassName("HELP-TEXT")[0];
        new HelpText(game, area);
        //Build special actoins
        area = this.dom.getElementsByClassName("SPECIAL-ACTIONS")[0];
        new SpecialAction(game, area, "Place Workers", "place");
        new SpecialAction(game, area, "Pickup Workers", "pickup");
        new SpecialAction(game, area, "Beg for Corn", "beg");
        new SpecialAction(game, area, "End Turn", "end");
        new SpecialAction(game, area, "Spin Once", "spinOne");
        new SpecialAction(game, area, "Spin Twice", "spinTwo");
        let placeHolder = new SpecialAction(game, area, "!", "!"); //Place holder
        placeHolder.dom.style.visibility = "hidden";
        placeHolder.refresh = () => { }; //Should not refresh (aka stay hidden)
        //Build general information 
        area = this.dom.getElementsByClassName("GENERAL-AREA")[0];
        new InfoSpace(game, area, "round", "of 8/14/21/27");
        new InfoSpace(game, area, "firstPlayer", "first player");
        new InfoSpace(game, area, "turn", "player's turn");
        new InfoSpace(game, area, "skulls", "skulls").dom.classList.add("skull-color");
        new BooleanSpace(game, area, "Res. Day", "resourceDay");
        new BooleanSpace(game, area, "Pts Day", "pointsDay");
        let firstPlayerSpace = templates.getElementsByClassName("FIRST-PLAYER-NAME")[0];
        area.appendChild(firstPlayerSpace);
        new FirstPlayerSpace(game, area, "first player");
        new InfoSpace(game, area, "bribe", "bribe").dom.classList.add("corn-color");
        //Build wheel P
        area = this.dom.getElementsByClassName("P-WHEEL-INPUT")[0];
        rewards = ["", "3c", "4c", "5c/2w", "7c/3w", "9c/4w", "~", "~"];
        let PWoodVisibility = [false, false, false, true, true, true, false, false, false, false];
        let PCornVisibility = [false, false, true, true, true, true, false, false, false, false];
        for (i = 0; i <= 9; i++) {
            if (i <= 7) {
                new WheelSpace(game, area, "P", i, rewards[i]);
            }
            else {
                new WheelSpaceEnd(game, area, "P", i);
            }
            new ResourceTile(game, area, i, "c", PCornVisibility[i]);
            new ResourceTile(game, area, i, "w", PWoodVisibility[i]);
        }
        //Build wheel Y
        area = this.dom.getElementsByClassName("Y-WHEEL-INPUT")[0];
        rewards = ["", "w", "s 1c", "g 2c", "k", "g s 2c", "~", "~"];
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "Y", i, rewards[i]);
        }
        new WheelSpaceEnd(game, area, "Y", 8);
        new WheelSpaceEnd(game, area, "Y", 9);
        //Build Wheel T
        area = this.dom.getElementsByClassName("T-WHEEL-INPUT")[0];
        rewards = ["", ">", "B", ">>", "2B/M", "x:2R", "~", "~"];
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "T", i, rewards[i]);
        }
        new WheelSpaceEnd(game, area, "T", 8);
        new WheelSpaceEnd(game, area, "T", 9);
        //Build Wheel U
        area = this.dom.getElementsByClassName("U-WHEEL-INPUT")[0];
        rewards = ["", "3c:R", "trade", "wkr", "2c:x B", "1c:any", "~", "~"];
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "U", i, rewards[i]);
        }
        new WheelSpaceEnd(game, area, "U", 8);
        new WheelSpaceEnd(game, area, "U", 9);
        //Build Wheel C
        area = this.dom.getElementsByClassName("C-WHEEL-INPUT")[0];
        rewards = ["", "4p R0", "5p R0", "6p R0", "7p R1", "8p R1", "8p R1 x", "9p R2", "11p R2 x", "13p R2 x", "~"];
        let CSkullVisible = [false, true, true, true, true, true, true, true, true, true, false, false, false];
        for (i = 0; i <= 12; i++) {
            if (i <= 10) {
                new WheelSpace(game, area, "C", i, rewards[i]);
            }
            else {
                new WheelSpaceEnd(game, area, "C", i);
            }
            new SkullSpace(game, area, i, CSkullVisible[i]);
        }
        //Build the Building area
        area = this.dom.getElementsByClassName("BUILDINGS")[0];
        for (i = 0; i < 6; i++) {
            new BuildingTile(game, area, i);
        }
        //Add the players
        area = this.dom.getElementsByClassName("PLAYER-AREA")[0];
        new PlayerDOM(game, area, 0);
        new PlayerDOM(game, area, 1);
        //Update the visuals
        this.refresh();
    }
    setGame(game) {
        for (let r of this.refreshables) {
            r.setGame(game);
        }
    }
    addRefreshable(refreshable) {
        //Add a refreshable to the refereshables list
        this.refreshables.push(refreshable);
    }
    refresh() {
        //Refresh all the items on the refreshables list
        for (let r of this.refreshables) {
            r.refresh();
        }
    }
}
let inputArea = document.getElementById("input-area");
let ui = new UIHandler(inputArea);
let storage = new LocalStorageHandler("game");
let game = new TzolkinGame(ui, storage);
ui.create(game); //Create the ui based on the game
storage.load(game); //Load the storage based on the game
//Programm added buttons
let godButton = document.getElementById("god-mode-button");
godButton.onclick = () => {
    game.godModeToggle();
};
//Undo one move
let undoButton = document.getElementById("undo-button");
undoButton.onclick = () => {
    storage.undo(game);
};
//Redo one move
let redoButton = document.getElementById("redo-button");
redoButton.onclick = () => {
    storage.redo(game);
};
//Clear the local storage and load a new game
let clearAllButton = document.getElementById("clear-all-button");
clearAllButton.onclick = () => {
    //Clear the local storage and load a new game
    localStorage.clear();
    storage = new LocalStorageHandler("game");
    game = new TzolkinGame(ui, storage);
    ui.setGame(game);
    console.log("Local storage cleared and new game started.");
    game.refresh();
};
//Force the calendar to advance
let advanceCalendarButton = document.getElementById("advance-calendar-button");
advanceCalendarButton.onclick = () => {
    game.calculationStack = []; //Clear the calcultion stack
    game.performAdvanceCalendar(1);
    console.log("Calendar advanced.");
    game.refresh();
};
//# sourceMappingURL=tzolkin.js.map