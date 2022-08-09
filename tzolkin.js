"use strict";
console.log("Tzolkin Solver is Running.");
//Base variables
class LocalStorageHandler {
    constructor(prefix) {
        //Build and load the current local storage
        this.prefix = prefix;
        //Load the meta-data if it already exists; otherwise create the meta data
        let metaDataString = localStorage.getItem(this.prefix + "_meta");
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
    }
    saveMetaData() {
        //Save self meta data
        localStorage.setItem(this.prefix + "_meta", JSON.stringify(this));
    }
    undo(game) {
        //Step current position back by 1 then load into the game provided
        if (this.currentPos < 0) {
            console.log("Cannot undo, no positions have been saved.");
        }
        else if (this.currentPos === 0) {
            console.log("Cannot undo, currently in the 1st position");
        }
        else {
            this.currentPos -= 1;
            this.load(game);
        }
    }
    load(game) {
        //Pull the current game from the localStorage
        //Override the game data with the new data
        if (this.currentPos < 0) {
            console.log("Cannot load, no positions have been saved.");
            return;
        }
        let gameString = localStorage.getItem(`${this.prefix}-${this.currentPos}`);
        if (gameString === null) {
            throw "Expected to load game string, got nothing.";
        }
        let gameData = JSON.parse(gameString);
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
    constructor(game, costs, rewards, color, buildingNumber) {
        this.game = game;
        this.costs = costs;
        this.rewards = rewards;
        this.color = color;
        this.id = buildingNumber;
        let player = this.game.players[this.game.turn];
        this.pairs = [
            [this.costs.corn, player.corn, "corn"],
            [this.costs.wood, player.wood, "wood"],
            [this.costs.stone, player.stone, "stone"],
            [this.costs.gold, player.gold, "gold"]
        ];
    }
    testBuildResources(architecture) {
        let player = this.game.players[this.game.turn];
        let resourceDeficit = 0;
        for (let [cost, inventory, resourceName] of this.pairs) {
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
    performBuildResources(architecture, savedResource) {
        let player = this.game.players[this.game.turn];
        //Actually spend the resources to build something
        //testBuildResources must be run first otherwise something might be built without having the required resources
        //See if architecture should be offered
        if (architecture && player.hasArchitectureSavingsTech()) {
        }
    }
    testBuildCorn(architecture) {
        let player = this.game.players[this.game.turn];
        let cornCost = 0;
        for (let [cost, inventory, resourceName] of this.pairs) {
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
}
let allBuildings = [1, 2, 3, 4];
class TzolkinGame {
    constructor(ui) {
        //Create a game (assume two player)
        this.P = new Array(8).fill(-1);
        this.PCorn = new Array(8).fill(0);
        this.PWood = new Array(8).fill(0);
        for (let i = 2; i <= 5; i++) {
            this.PWood[i] = 2;
        }
        this.Y = new Array(8).fill(-1);
        this.T = new Array(8).fill(-1);
        this.U = new Array(8).fill(-1);
        this.C = new Array(11).fill(-1);
        this.CSkull = new Array(11).fill(false);
        this.skulls = 13;
        this.monuments = [];
        this.buildings = [];
        this.bribe = 0;
        this.round = 1;
        this.turn = 0;
        this.firstPlayer = 0;
        this.firstPlayerSpace = -1;
        this.players = [
            new Player(0, "IndianRed"),
            new Player(1, "SteelBlue")
        ];
        this.ui = ui;
        this.calculationStack = [];
        this.actions = {};
        this.helpText = "";
        this.godMode = false;
        //Caculate the starting turn
        this.calculationStack.push({ name: "turnStart" });
        this.calculate();
    }
    stringify() {
        let replacer = (key, value) => {
            if (key === "ui") {
                return undefined;
            }
            else {
                return value;
            }
        };
        return JSON.stringify(this, replacer);
    }
    getWheels() {
        return [["P", this.P], ["Y", this.Y], ["T", this.T], ["U", this.U], ["C", this.C]];
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
                console.log(allBuildings);
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
        for (let [wheelName, wheel] of this.getWheels()) {
            for (let pos = 0; pos < this.C.length; pos++) {
                if (pos < wheel.length) {
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
        for (let [wheelName, wheel] of this.getWheels()) {
            let foundOpenPosition = false;
            for (let pos = 0; pos < this.C.length; pos++) {
                if (pos < wheel.length) {
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
    calcChooseAction(wheel, pos) {
        console.log("TODO Choose Action not yet implemented.");
    }
    refresh() {
        this.ui.refresh();
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
        }
        else {
            console.log(`Action "${actionName}" not recognized as a legal move.`);
        }
        //No refresh here, each action performed should refresh on its own
    }
    performEndTurn() {
        console.log("performEndTurn TO BE BUILT");
    }
    placeWorker(playerNumber, wheel, spaceNumber, godMode) {
        //Place the worker that is requested by the user
        //Perform differently in god and not god modee
        //Place the worker
        if (godMode) {
            this[wheel][spaceNumber] = playerNumber;
            return new Return(true);
        }
        return new Return(false);
    }
    nextWorkerOnSpace(wheel, spaceNumber) {
        //Calculate the next worker to go on a space
        let x = this[wheel][spaceNumber] + 1;
        if (x === this.players.length) {
            return -2;
        }
        else {
            return x;
        }
    }
    pickupTile(spaceNumber, type, godMode) {
        //Pickup either a wood or a corn tile
        if (godMode) {
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
        }
    }
    setSkull(spaceNumber, godMode) {
        //Set a skill on the C wheel
        if (godMode) {
            this.CSkull[spaceNumber] = !this.CSkull[spaceNumber];
        }
    }
    stepReligion(playerNumber, religionNumber, delta, godMode) {
        //Increase or decrease religion by the delta
        if (godMode) {
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
        }
    }
    stepTechnology(playerNumber, technologyNumber, godMode) {
        //Increase technology by a step
        if (godMode) {
            let t = this.players[playerNumber].technology;
            t[technologyNumber] = (t[technologyNumber] + 1) % 4;
        }
    }
    setFirstPlayer(playerNumber, godMode) {
        //Set first player (-1 is not taken)
        if (godMode) {
            this.firstPlayerSpace = playerNumber;
        }
    }
}
class Refreshable {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
        this.ui.addRefreshable(this);
    }
    refresh() {
        //Refresh must be implemented by sub-class
        throw "refresh must be impemented by sub-class.";
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
        let topDom = this.dom.getElementsByClassName("tile-top-text")[0];
        topDom.textContent = text;
    }
    setBottomText(text) {
        let bottomDom = this.dom.getElementsByClassName("tile-bottom-text")[0];
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
                let nextPlayerNumber = this.game.nextWorkerOnSpace(this.wheel, this.spaceNumber);
                this.game.placeWorker(nextPlayerNumber, this.wheel, this.spaceNumber, true);
                this.refresh();
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
                this.game.pickupTile(this.spaceNumber, this.type, true);
                this.refresh();
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
                this.game.setSkull(this.spaceNumber, true);
                this.refresh();
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
        this.game.players[this.playerNumber][this.resource] = value;
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
                    this.game.stepReligion(this.playerNumber, this.subType, 1, true);
                }
                else {
                    this.game.stepTechnology(this.playerNumber, this.subType, true);
                }
                this.refresh();
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
                this.refresh();
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
        this.game[this.type] = value;
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
                this.game.setFirstPlayer(newFirstPlayerSpace, true);
                this.refresh();
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
            this.refresh();
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
    constructor(game, parentDom, building) {
        super(game, parentDom, "", "");
        this.actionName = "";
        this.building = building;
        this.id = this.building.id;
        //Function for simplifying numbers
        let numSim = (n, symbol) => {
            if (n === 0 || n === undefined) {
                return "";
            }
            else if (n === 1 && symbol !== "c") {
                return symbol + " ";
            }
            else {
                return n.toString() + symbol + " ";
            }
        };
        //Fill in the costs
        let topText = "";
        topText += numSim(this.building.costs.corn, "c");
        topText += numSim(this.building.costs.skulls, "k");
        topText += numSim(this.building.costs.wood, "w");
        topText += numSim(this.building.costs.stone, "s");
        topText += numSim(this.building.costs.gold, "g");
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
        let placeHolder = new SpecialAction(game, area, "!", "!"); //Place holder
        placeHolder.dom.style.visibility = "hidden";
        placeHolder.refresh = () => { }; //Should not refresh (aka stay hidden)
        //Build general information 
        area = this.dom.getElementsByClassName("GENERAL-AREA")[0];
        new InfoSpace(game, area, "round", "of 27 rounds");
        new InfoSpace(game, area, "firstPlayer", "first player");
        new InfoSpace(game, area, "turn", "player's turn");
        new InfoSpace(game, area, "skulls", "skulls").dom.classList.add("skull-color");
        let firstPlayerSpace = templates.getElementsByClassName("FIRST-PLAYER-NAME")[0];
        area.appendChild(firstPlayerSpace);
        new FirstPlayerSpace(game, area, "first player");
        new InfoSpace(game, area, "bribe", "bribe").dom.classList.add("corn-color");
        //Build wheel P
        area = this.dom.getElementsByClassName("P-WHEEL-INPUT")[0];
        rewards = ["", "3c", "4c", "5c/2w", "7c/3w", "9c/4w", "~", "~"];
        let PWoodVisibility = [false, false, false, true, true, true, false, false];
        let PCornVisibility = [false, false, true, true, true, true, false, false];
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "P", i, rewards[i]);
            new ResourceTile(game, area, i, "c", PCornVisibility[i]);
            new ResourceTile(game, area, i, "w", PWoodVisibility[i]);
        }
        //Build wheel Y
        area = this.dom.getElementsByClassName("Y-WHEEL-INPUT")[0];
        rewards = ["", "w", "s 1c", "g 2c", "k", "g s 2c", "~", "~"];
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "Y", i, rewards[i]);
        }
        //Build Wheel T
        area = this.dom.getElementsByClassName("T-WHEEL-INPUT")[0];
        rewards = ["", ">", "B", ">>", "2B/M", "x:2R", "~", "~"];
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "T", i, rewards[i]);
        }
        //Build Wheel U
        area = this.dom.getElementsByClassName("U-WHEEL-INPUT")[0];
        rewards = ["", "3c:R", "trade", "wkr", "2c:x B", "1c:any", "~", "~"];
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "U", i, rewards[i]);
        }
        //Build Wheel C
        area = this.dom.getElementsByClassName("C-WHEEL-INPUT")[0];
        rewards = ["", "4p R0", "5p R0", "6p R0", "7p R1", "8p R1", "8p R1 x", "9p R2", "11p R2 x", "13p R2 x", "~"];
        let CSkullVisible = [false, true, true, true, true, true, true, true, true, true, false];
        for (i = 0; i <= 10; i++) {
            new WheelSpace(game, area, "C", i, rewards[i]);
            new SkullSpace(game, area, i, CSkullVisible[i]);
        }
        //Add the players
        area = this.dom.getElementsByClassName("PLAYER-AREA")[0];
        new PlayerDOM(game, area, 0);
        new PlayerDOM(game, area, 1);
        //Update the visuals
        this.refresh();
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
let game = new TzolkinGame(ui);
ui.create(game);
//Programm added buttons
let godButton = document.getElementById("god-mode");
godButton.onclick = () => {
    if (game.godMode) {
        game.calculate(); //re-calc what you can do
    }
    //Switch to god mode
    game.godMode = !game.godMode;
    game.refresh(); //refresh the visuals
};
//# sourceMappingURL=tzolkin.js.map