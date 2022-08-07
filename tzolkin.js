var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
console.log("Tzolkin Solver is Running.");
//Base variables
var LocalStorageHandler = /** @class */ (function () {
    function LocalStorageHandler(prefix) {
        //Build and load the current local storage
        this.prefix = prefix;
        //Load the meta-data if it already exists; otherwise create the meta data
        var metaDataString = localStorage.getItem(this.prefix + "_meta");
        if (metaDataString === null) {
            this.currentPos = -1; //Nothing has been written
            this.maxPos = -1; //Nothing has been written
            this.saveMetaData();
        }
        else {
            var metaData = JSON.parse(metaDataString);
            this.currentPos = metaData["currentPos"];
            this.maxPos = metaData["maxPos"];
        }
    }
    LocalStorageHandler.prototype.save = function (game) {
        //Iterate current position by 1 and save
        //Delete future positions if required
    };
    LocalStorageHandler.prototype.saveMetaData = function () {
        //Save self meta data
        localStorage.setItem(this.prefix + "_meta", JSON.stringify(this));
    };
    LocalStorageHandler.prototype.undo = function (game) {
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
    };
    LocalStorageHandler.prototype.load = function (game) {
        //Pull the current game from the localStorage
        //Override the game data with the new data
        if (this.currentPos < 0) {
            console.log("Cannot load, no positions have been saved.");
            return;
        }
        var gameString = localStorage.getItem("".concat(this.prefix, "-").concat(this.currentPos));
        if (gameString === null) {
            throw "Expected to load game string, got nothing.";
        }
        var gameData = JSON.parse(gameString);
    };
    LocalStorageHandler.prototype.deleteAll = function () {
        //Remove all data saved in local storage & reset self
    };
    return LocalStorageHandler;
}());
var Player = /** @class */ (function () {
    function Player(id, color) {
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
    Player.prototype.hasArchitectureSavingsTech = function () {
        return this.technology[2] > 3;
    };
    return Player;
}());
var Return = /** @class */ (function () {
    function Return(f, string, object) {
        if (string === void 0) { string = ""; }
        if (object === void 0) { object = {}; }
        this.f = f;
        this.string = string;
        this.object = object;
    }
    return Return;
}());
var Building = /** @class */ (function () {
    function Building(game, costs, rewards, color, buildingNumber) {
        this.game = game;
        this.costs = costs;
        this.rewards = rewards;
        this.color = color;
        this.id = buildingNumber;
        var player = this.game.players[this.game.turn];
        this.pairs = [
            [this.costs.corn, player.corn, "corn"],
            [this.costs.wood, player.wood, "wood"],
            [this.costs.stone, player.stone, "stone"],
            [this.costs.gold, player.gold, "gold"]
        ];
    }
    Building.prototype.testBuildResources = function (architecture) {
        var player = this.game.players[this.game.turn];
        var resourceDeficit = 0;
        for (var _i = 0, _a = this.pairs; _i < _a.length; _i++) {
            var _b = _a[_i], cost = _b[0], inventory = _b[1], resourceName = _b[2];
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
    };
    Building.prototype.performBuildResources = function (architecture, savedResource) {
        var player = this.game.players[this.game.turn];
        //Actually spend the resources to build something
        //testBuildResources must be run first otherwise something might be built without having the required resources
        //See if architecture should be offered
        if (architecture && player.hasArchitectureSavingsTech()) {
        }
    };
    Building.prototype.testBuildCorn = function (architecture) {
        var player = this.game.players[this.game.turn];
        var cornCost = 0;
        for (var _i = 0, _a = this.pairs; _i < _a.length; _i++) {
            var _b = _a[_i], cost = _b[0], inventory = _b[1], resourceName = _b[2];
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
    };
    return Building;
}());
var allBuildings = [1, 2, 3, 4];
var TzolkinGame = /** @class */ (function () {
    function TzolkinGame(ui) {
        //Create a game (assume two player)
        this.P = new Array(8).fill(-1);
        this.PCorn = new Array(8).fill(0);
        this.PWood = new Array(8).fill(0);
        for (var i = 2; i <= 5; i++) {
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
    TzolkinGame.prototype.stringify = function () {
        var replacer = function (key, value) {
            if (key === "ui") {
                return undefined;
            }
            else {
                return value;
            }
        };
        return JSON.stringify(this, replacer);
    };
    TzolkinGame.prototype.getWheels = function () {
        return [["P", this.P], ["Y", this.Y], ["T", this.T], ["U", this.U], ["C", this.C]];
    };
    TzolkinGame.prototype.calculate = function () {
        //Look at the calculation stack and perform the last calculation on the stack
        //Calculations should be removed from the stack when the next action is perfomred
        //Each action performed should add another calculation to the calculationStack
        if (this.calculationStack.length === 0) {
            throw "No calculations left to perform";
        }
        //Clear the avaliable action, they will be re-calculated
        this.actions = {};
        //get the next calculation
        var calculationIndex = this.calculationStack.length - 1;
        var currentCalculation = this.calculationStack[calculationIndex];
        //Switch through the calculation types
        if (currentCalculation.name === "turnStart") {
            var calc = currentCalculation;
            this.calcTurnStart();
        }
        else if (currentCalculation.name === "pickup") {
            var calc = currentCalculation;
            this.calcPickup2(calc.workersPickedup);
        }
        else if (currentCalculation.name === "place") {
            var calc = currentCalculation;
            this.calcPlace2(calc.workersPlaced);
        }
        else if (currentCalculation.name === "chooseAction") {
            var calc = currentCalculation;
            this.calcChooseAction(calc.wheel, calc.position);
        }
        else if (currentCalculation.name === "begReligion") {
            var calc = currentCalculation;
            this.calcBegReligion();
        }
        else {
            throw "Calculation not recognized";
        }
    };
    TzolkinGame.prototype.calcTurnStart = function () {
        var _this = this;
        this.helpText = "Choose starting action.";
        var player = this.players[this.turn];
        this.calcPickup2(0);
        this.calcPlace2(0);
        //Calculate begging for corn option
        if (player.corn < 3 && player.religion[0] > 0 && player.religion[1] > 0 && player.religion[2] > 0) {
            this.actions["beg"] = function () {
                //Beg for corn
                player.corn = 3;
                console.log(allBuildings);
                //Add the startover action
                _this.calculationStack.push({ name: "turnStart" });
                //Add the beg religion calculation
                _this.calculationStack.push({ name: "begReligion" });
            };
        }
        //Calculate the pitty option
        if (Object.keys(this.actions).length === 0) {
            this.calcPity();
        }
    };
    TzolkinGame.prototype.calcPickup2 = function (workersPickedup) {
        var _this = this;
        //Iterate through all the wheels to decide which worker to pick up
        if (workersPickedup === 0) {
            //First worker to be picked up - must be picked up
        }
        else {
            this.helpText = "Choose another worker to pick up.";
            this.actions["end"] = function () {
                //End turn action is now avaliable
                _this.performEndTurn();
            };
        }
        var player = this.players[this.turn];
        var _loop_1 = function (wheelName, wheel) {
            var _loop_2 = function (pos) {
                if (pos < wheel.length) {
                    //Check if player has a piece there
                    if (wheel[pos] === this_1.turn) {
                        //Player can pickup from this location
                        this_1.actions["".concat(wheelName).concat(pos)] = function () {
                            //Perform the pickup actions
                            player.workersFree += 1; //Return a worker to the player
                            wheel[pos] = -1; //Set the wheel positon to -1
                            //Add the next pickup to the stack
                            _this.calculationStack.push({
                                name: "pickup",
                                workersPickedup: workersPickedup + 1
                            });
                            //Add the chooseAction calculation to the stack
                            _this.calculationStack.push({
                                name: "chooseAction",
                                wheel: wheelName,
                                position: pos
                            });
                        };
                    }
                }
            };
            for (var pos = 0; pos < this_1.C.length; pos++) {
                _loop_2(pos);
            }
        };
        var this_1 = this;
        //Iterate through all the wheels and positions
        for (var _i = 0, _a = this.getWheels(); _i < _a.length; _i++) {
            var _b = _a[_i], wheelName = _b[0], wheel = _b[1];
            _loop_1(wheelName, wheel);
        }
        //Check if end turn is the only option
        if (Object.keys(this.actions).length === 0 && "end" in this.actions) {
            this.helpText = "No more workers can be picked up. Please end turn.";
        }
    };
    TzolkinGame.prototype.calcPlace2 = function (workersPlaced) {
        var _this = this;
        //Iterate through all the wheels to decide where a worker can be placed
        if (workersPlaced === 0) {
            //First worker must be placed
        }
        else {
            this.helpText = "Choose another placement for ".concat(workersPlaced, "+ corn.");
            this.actions["end"] = function () {
                _this.performEndTurn();
            };
        }
        var player = this.players[this.turn];
        //Check if ther player has free workers
        if (player.workersFree <= 0) {
            return; //Done, no new workers that can be placed
        }
        var _loop_3 = function (wheelName, wheel) {
            var foundOpenPosition = false;
            var _loop_4 = function (pos) {
                if (pos < wheel.length) {
                    //Need empty spot and corn
                    if (player.corn >= pos + workersPlaced && wheel[pos] === -1) {
                        //Worker can be placed here
                        this_2.actions["".concat(wheelName).concat(pos)] = function () {
                            //Place the worker
                            player.corn -= pos + workersPlaced;
                            player.workersFree -= 1;
                            wheel[pos] = player.id;
                            //Add next placement to the stack
                            _this.calculationStack.push({
                                name: "place",
                                workersPlaced: workersPlaced + 1
                            });
                        };
                    }
                    //break to next wheel on finding an open position
                    if (wheel[pos] === -1) {
                        foundOpenPosition = true;
                        return "break";
                    }
                }
            };
            for (var pos = 0; pos < this_2.C.length; pos++) {
                var state_1 = _loop_4(pos);
                if (state_1 === "break")
                    break;
            }
            //Break on open position
            if (foundOpenPosition) {
                return "continue";
            }
        };
        var this_2 = this;
        //Find the lowest numbered spot (if there are still workers free)
        for (var _i = 0, _a = this.getWheels(); _i < _a.length; _i++) {
            var _b = _a[_i], wheelName = _b[0], wheel = _b[1];
            _loop_3(wheelName, wheel);
        }
        //Check the starting spot
        if (this.firstPlayerSpace === -1 && player.corn >= workersPlaced) {
            //Worker can be placed on starting position
            this.actions["S"] = function () {
                player.workersFree -= 1;
                _this.firstPlayerSpace = _this.turn;
                //Add next placement to the stack
                _this.calculationStack.push({
                    name: "place",
                    workersPlaced: workersPlaced + 1
                });
            };
        }
        //Check if end turn is the only option
        if (Object.keys(this.actions).length === 0 && "end" in this.actions) {
            this.helpText = "No more workers can be placed. Please end turn.";
        }
    };
    TzolkinGame.prototype.calcPity = function () {
        throw "TODO calulate pity not yet programmed.";
    };
    TzolkinGame.prototype.calcBegReligion = function () {
        //This is a sub calculation, does not inherently add another calculation to the stack
        var player = this.players[this.turn];
        var _loop_5 = function (i) {
            if (player.religion[i] > 0) {
                this_3.actions["p".concat(this_3.turn, "R").concat("ABC"[i])] = function () {
                    //Reduce on that religion
                    player.religion[i] -= 1;
                };
            }
        };
        var this_3 = this;
        //Choose the religion track to go down on
        for (var i = 0; i < 3; i++) {
            _loop_5(i);
        }
    };
    TzolkinGame.prototype.calcChooseAction = function (wheel, pos) {
        console.log("TODO Choose Action not yet implemented.");
    };
    TzolkinGame.prototype.refresh = function () {
        this.ui.refresh();
    };
    TzolkinGame.prototype.performAction = function (actionName) {
        //Perform an action
        if (actionName in this.actions) {
            //Remove the most recent calculation from the stack
            this.calculationStack.pop();
            //Clear the actions then play this action - more calculations should be added to the stack
            var f = this.actions[actionName]; //Grab the function to be called
            f(); //Call the function
            //Perform the next calculation in the stack - which clears the actions as a side effect
            this.calculate();
            //Update the ui
            this.refresh();
        }
        else {
            console.log("Action \"".concat(actionName, "\" not recognized as a legal move."));
        }
        //No refresh here, each action performed should refresh on its own
    };
    TzolkinGame.prototype.performEndTurn = function () {
        console.log("performEndTurn TO BE BUILT");
    };
    TzolkinGame.prototype.placeWorker = function (playerNumber, wheel, spaceNumber, godMode) {
        //Place the worker that is requested by the user
        //Perform differently in god and not god modee
        //Place the worker
        if (godMode) {
            this[wheel][spaceNumber] = playerNumber;
            return new Return(true);
        }
        return new Return(false);
    };
    TzolkinGame.prototype.nextWorkerOnSpace = function (wheel, spaceNumber) {
        //Calculate the next worker to go on a space
        var x = this[wheel][spaceNumber] + 1;
        if (x === this.players.length) {
            return -2;
        }
        else {
            return x;
        }
    };
    TzolkinGame.prototype.pickupTile = function (spaceNumber, type, godMode) {
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
    };
    TzolkinGame.prototype.setSkull = function (spaceNumber, godMode) {
        //Set a skill on the C wheel
        if (godMode) {
            this.CSkull[spaceNumber] = !this.CSkull[spaceNumber];
        }
    };
    TzolkinGame.prototype.stepReligion = function (playerNumber, religionNumber, delta, godMode) {
        //Increase or decrease religion by the delta
        if (godMode) {
            var max = 7;
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
            var r = this.players[playerNumber].religion;
            r[religionNumber] = (r[religionNumber] + delta) % max;
        }
    };
    TzolkinGame.prototype.stepTechnology = function (playerNumber, technologyNumber, godMode) {
        //Increase technology by a step
        if (godMode) {
            var t = this.players[playerNumber].technology;
            t[technologyNumber] = (t[technologyNumber] + 1) % 4;
        }
    };
    TzolkinGame.prototype.setFirstPlayer = function (playerNumber, godMode) {
        //Set first player (-1 is not taken)
        if (godMode) {
            this.firstPlayerSpace = playerNumber;
        }
    };
    return TzolkinGame;
}());
var Refreshable = /** @class */ (function () {
    function Refreshable(game) {
        this.game = game;
        this.ui = game.ui;
        this.ui.addRefreshable(this);
    }
    Refreshable.prototype.refresh = function () {
        //Refresh must be implemented by sub-class
        throw "refresh must be impemented by sub-class.";
    };
    return Refreshable;
}());
var TileBase = /** @class */ (function (_super) {
    __extends(TileBase, _super);
    function TileBase(game, parentDom, topText, bottomText) {
        if (topText === void 0) { topText = ""; }
        if (bottomText === void 0) { bottomText = ""; }
        var _this = _super.call(this, game) || this;
        var templateArea = document.getElementById("TEMPLATES");
        var template = templateArea.getElementsByClassName("TILE")[0];
        _this.dom = template.cloneNode(true);
        _this.setTopText(topText);
        _this.setBottomText(bottomText);
        //Add the dom to the tree
        parentDom.appendChild(_this.dom);
        //action name should be defined in sub-classes
        _this.actionName = "NONE";
        return _this;
    }
    TileBase.prototype.setTopText = function (text) {
        var topDom = this.dom.getElementsByClassName("tile-top-text")[0];
        topDom.textContent = text;
    };
    TileBase.prototype.setBottomText = function (text) {
        var bottomDom = this.dom.getElementsByClassName("tile-bottom-text")[0];
        bottomDom.textContent = text;
    };
    //super.refresh must be called from all subclasses for highlighting to work
    TileBase.prototype.refresh = function () {
        if (this.actionName in game.actions || game.godMode) {
            this.dom.classList.add("highlight");
        }
        else {
            this.dom.classList.remove("highlight");
        }
    };
    return TileBase;
}(Refreshable));
var TileBaseBottomText = /** @class */ (function (_super) {
    __extends(TileBaseBottomText, _super);
    //A tile that only has text on the bottom (used for wwod/corn tiles & Chichen Itza skull indication)
    function TileBaseBottomText(game, parentDom, bottomText) {
        if (bottomText === void 0) { bottomText = ""; }
        var _this = _super.call(this, game, parentDom, "", bottomText) || this;
        _this.dom.getElementsByClassName("tile-top-text")[0].remove();
        _this.dom.getElementsByTagName("br")[0].remove();
        return _this;
    }
    return TileBaseBottomText;
}(TileBase));
var WheelSpace = /** @class */ (function (_super) {
    __extends(WheelSpace, _super);
    function WheelSpace(game, parentDom, wheel, spaceNumber, bottomText) {
        if (bottomText === void 0) { bottomText = ""; }
        var _this = this;
        var topText = wheel + spaceNumber.toString();
        _this = _super.call(this, game, parentDom, wheel + spaceNumber.toString(), bottomText) || this;
        _this.actionName = topText;
        _this.wheel = wheel;
        _this.spaceNumber = spaceNumber;
        //Onclick cycle to the next player for this space, -1 after all players;
        //In god mode so that resource values are not changed
        _this.dom.onclick = function (x) {
            if (game.godMode) {
                var nextPlayerNumber = _this.game.nextWorkerOnSpace(_this.wheel, _this.spaceNumber);
                _this.game.placeWorker(nextPlayerNumber, _this.wheel, _this.spaceNumber, true);
                _this.refresh();
            }
            else {
                _this.game.performAction(_this.actionName);
            }
        };
        return _this;
    }
    WheelSpace.prototype.refresh = function () {
        _super.prototype.refresh.call(this);
        //Update the visuals to reflect the game
        //Change the background color
        var player = this.game[this.wheel][this.spaceNumber];
        if (player === -1) {
            this.dom.style.backgroundColor = "white";
        }
        else if (player === -2) {
            this.dom.style.backgroundColor = "lightgrey";
        }
        else {
            this.dom.style.backgroundColor = this.game.players[player].color;
        }
    };
    return WheelSpace;
}(TileBase));
var ResourceTile = /** @class */ (function (_super) {
    __extends(ResourceTile, _super);
    function ResourceTile(game, parentDom, spaceNumber, type, visible) {
        var _this = 
        //Create resource tiles at spacenumber of type wood or corn; make tile visible with true
        _super.call(this, game, parentDom, "") || this;
        _this.actionName = "T".concat(spaceNumber).concat(type);
        _this.type = type;
        _this.spaceNumber = spaceNumber;
        //Define onClick
        _this.dom.onclick = function (x) {
            if (game.godMode) {
                _this.game.pickupTile(_this.spaceNumber, _this.type, true);
                _this.refresh();
            }
            else {
                _this.game.performAction(_this.actionName);
            }
        };
        //Set the background color
        if (_this.type === "w") {
            _this.dom.classList.add("wood-color");
        }
        else {
            _this.dom.classList.add("corn-color");
        }
        //Make invisible and space taking in appropriate
        if (visible === false) {
            _this.dom.style.visibility = "hidden";
        }
        return _this;
    }
    ResourceTile.prototype.refresh = function () {
        _super.prototype.refresh.call(this);
        var remaining;
        if (this.type === "w") {
            remaining = this.game.PWood[this.spaceNumber];
        }
        else {
            remaining = this.game.PCorn[this.spaceNumber];
        }
        this.setBottomText(remaining + this.type);
    };
    return ResourceTile;
}(TileBaseBottomText));
var SkullSpace = /** @class */ (function (_super) {
    __extends(SkullSpace, _super);
    function SkullSpace(game, parentDom, spaceNumber, visible) {
        var _this = 
        //Shows if the spot has been taken by the skull already
        _super.call(this, game, parentDom, "") || this;
        _this.actionName = "NONE";
        _this.spaceNumber = spaceNumber;
        //Set onclick action
        _this.dom.onclick = function (x) {
            if (game.godMode) {
                _this.game.setSkull(_this.spaceNumber, true);
                _this.refresh();
            }
        };
        //Set the background color
        _this.dom.classList.add("skull-color");
        //Make invisible and space taking in appropriate
        if (visible === false) {
            _this.dom.style.visibility = "hidden";
        }
        return _this;
    }
    SkullSpace.prototype.refresh = function () {
        _super.prototype.refresh.call(this);
        if (this.game.CSkull[this.spaceNumber] === true) {
            this.setBottomText("k");
        }
        else {
            this.setBottomText("-");
        }
    };
    return SkullSpace;
}(TileBaseBottomText));
var ResourcesSpace = /** @class */ (function (_super) {
    __extends(ResourcesSpace, _super);
    function ResourcesSpace(game, parentDom, playerNumber, resource, promptString, bottomText, className) {
        var _this = 
        //Show all the resources owned by a player
        //Inputs: bottomText-resource type, resouce:string of resource type, className:CSS class name, promptString: resource name as presented to player
        _super.call(this, game, parentDom, "", bottomText) || this;
        _this.actionName = "NONE";
        _this.playerNumber = playerNumber;
        _this.resource = resource;
        //Change appearance
        _this.dom.classList.add(className);
        //onclick
        _this.dom.onclick = function (x) {
            if (_this.game.godMode) {
                var input = prompt("Player ".concat(_this.playerNumber, " ").concat(promptString, ":"), _this.resouceCount().toString());
                if (input === null) {
                    //If user does not input, don't change anything
                    return;
                }
                var ret = _this.validateCount(input);
                if (ret.f === true) {
                    _this.setCount(parseInt(input));
                }
                _this.refresh();
            }
        };
        return _this;
    }
    ResourcesSpace.prototype.refresh = function () {
        _super.prototype.refresh.call(this);
        //Show updated text
        this.setTopText(this.resouceCount().toString());
    };
    ResourcesSpace.prototype.resouceCount = function () {
        return this.game.players[this.playerNumber][this.resource];
    };
    ResourcesSpace.prototype.validateCount = function (input) {
        var valid = /^\d+$/.test(input);
        if (valid) {
            return new Return(true, "");
        }
        else {
            return new Return(false, "Invalid user input. Input must be a non-negative integer.");
        }
    };
    ResourcesSpace.prototype.setCount = function (value) {
        this.game.players[this.playerNumber][this.resource] = value;
    };
    return ResourcesSpace;
}(TileBase));
var TrackSpace = /** @class */ (function (_super) {
    __extends(TrackSpace, _super);
    function TrackSpace(game, parentDom, playerNumber, type, subType, bottomTextArray, className) {
        var _this = this;
        //Space for showing religion and technology progress
        var topText;
        if (type === "religion") {
            topText = "R" + "ABCD"[subType];
        }
        else {
            topText = "T" + "ABCD"[subType];
        }
        //Call super for the function
        _this = _super.call(this, game, parentDom, topText, "") || this;
        _this.actionName = "p".concat(playerNumber).concat(topText);
        _this.playerNumber = playerNumber;
        _this.type = type;
        _this.subType = subType;
        _this.bottomTextArray = bottomTextArray;
        //Make the color
        _this.dom.classList.add(className);
        //Set click function
        _this.dom.onclick = function (x) {
            if (_this.game.godMode) {
                if (_this.type === "religion") {
                    _this.game.stepReligion(_this.playerNumber, _this.subType, 1, true);
                }
                else {
                    _this.game.stepTechnology(_this.playerNumber, _this.subType, true);
                }
                _this.refresh();
            }
            else {
                _this.game.performAction(_this.actionName);
            }
        };
        return _this;
    }
    TrackSpace.prototype.refresh = function () {
        _super.prototype.refresh.call(this);
        if (this.type === "religion") {
            this.setBottomText(this.bottomTextArray[this.game.players[this.playerNumber].religion[this.subType]]);
        }
        else {
            this.setBottomText(this.bottomTextArray[this.game.players[this.playerNumber].technology[this.subType]]);
        }
    };
    return TrackSpace;
}(TileBase));
var InfoSpace = /** @class */ (function (_super) {
    __extends(InfoSpace, _super);
    function InfoSpace(game, parentDom, type, bottomText) {
        if (bottomText === void 0) { bottomText = ""; }
        var _this = _super.call(this, game, parentDom, "", bottomText) || this;
        _this.actionName = "NONE";
        _this.type = type;
        //Set onclick
        _this.dom.onclick = function (x) {
            if (_this.game.godMode) {
                var input = window.prompt("Set ".concat(bottomText, ":"), _this.value().toString());
                if (input === null) {
                    return;
                }
                var ret = _this.validateValue(input);
                if (ret.f === true) {
                    _this.setValue(parseInt(input));
                }
                _this.refresh();
            }
        };
        return _this;
    }
    InfoSpace.prototype.value = function () {
        return this.game[this.type];
    };
    InfoSpace.prototype.validateValue = function (input) {
        var valid = /^\d+$/.test(input);
        if (valid) {
            return new Return(true, "");
        }
        else {
            return new Return(false, "Invalid user input. Input must be a non-negative integer.");
        }
    };
    InfoSpace.prototype.setValue = function (value) {
        this.game[this.type] = value;
    };
    InfoSpace.prototype.refresh = function () {
        _super.prototype.refresh.call(this);
        this.setTopText(this.value().toString());
    };
    return InfoSpace;
}(TileBase));
var FirstPlayerSpace = /** @class */ (function (_super) {
    __extends(FirstPlayerSpace, _super);
    function FirstPlayerSpace(game, parentDom, bottomText) {
        if (bottomText === void 0) { bottomText = ""; }
        var _this = _super.call(this, game, parentDom, "S", bottomText) || this;
        _this.actionName = "S";
        //onclick
        _this.dom.onclick = function (x) {
            if (_this.game.godMode) {
                var newFirstPlayerSpace = _this.game.firstPlayerSpace + 1;
                if (newFirstPlayerSpace === _this.game.players.length) {
                    newFirstPlayerSpace = -1;
                }
                _this.game.setFirstPlayer(newFirstPlayerSpace, true);
                _this.refresh();
            }
            else {
                _this.game.performAction(_this.actionName);
            }
        };
        return _this;
    }
    FirstPlayerSpace.prototype.refresh = function () {
        _super.prototype.refresh.call(this);
        if (this.game.firstPlayerSpace === -1) {
            this.dom.style.backgroundColor = "white";
        }
        else {
            this.dom.style.backgroundColor = this.game.players[this.game.firstPlayerSpace].color;
        }
    };
    return FirstPlayerSpace;
}(TileBase));
var SpecialAction = /** @class */ (function (_super) {
    __extends(SpecialAction, _super);
    //Special actions that will pop up at the top
    function SpecialAction(game, parentDom, topText, actionName) {
        var _this = _super.call(this, game, parentDom, topText, "") || this;
        _this.actionName = actionName;
        _this.dom.classList.add("special");
        _this.dom.onclick = function (x) {
            _this.game.performAction(_this.actionName);
            _this.refresh();
        };
        return _this;
    }
    //Hide if not an avaliable action
    SpecialAction.prototype.refresh = function () {
        _super.prototype.refresh.call(this);
        if (this.actionName in this.game.actions) {
            this.dom.style.display = "inline";
        }
        else {
            this.dom.style.display = "none";
        }
    };
    return SpecialAction;
}(TileBase));
var HelpText = /** @class */ (function (_super) {
    __extends(HelpText, _super);
    //Text that is shown at the top of the window
    function HelpText(game, selfDom) {
        var _this = _super.call(this, game) || this;
        _this.dom = selfDom;
        return _this;
    }
    HelpText.prototype.refresh = function () {
        this.dom.textContent = this.game.helpText;
    };
    return HelpText;
}(Refreshable));
var BuildingTile = /** @class */ (function (_super) {
    __extends(BuildingTile, _super);
    function BuildingTile(game, parentDom, building) {
        var _this = _super.call(this, game, parentDom, "", "") || this;
        _this.actionName = "";
        _this.building = building;
        _this.id = _this.building.id;
        //Function for simplifying numbers
        var numSim = function (n, symbol) {
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
        var topText = "";
        topText += numSim(_this.building.costs.corn, "c");
        topText += numSim(_this.building.costs.skulls, "k");
        topText += numSim(_this.building.costs.wood, "w");
        topText += numSim(_this.building.costs.stone, "s");
        topText += numSim(_this.building.costs.gold, "g");
        return _this;
    }
    return BuildingTile;
}(TileBase));
var PlayerDOM = /** @class */ (function (_super) {
    __extends(PlayerDOM, _super);
    function PlayerDOM(game, parentDom, playerNumber) {
        var _this = 
        //Set up a player area for the given player number
        _super.call(this, game) || this;
        _this.playerNumber = playerNumber;
        var templates = document.getElementById("TEMPLATES");
        var playerTemplate = templates.getElementsByClassName("PLAYER-X-AREA")[0];
        _this.dom = playerTemplate.cloneNode(true);
        _this.dom.style.display = "block";
        parentDom.appendChild(_this.dom);
        //Declare some re-used variables
        var area;
        //Set the player name
        area = _this.dom.getElementsByClassName("PLAYER-NAME")[0];
        area.textContent = "Player ".concat(_this.playerNumber);
        //Setup player areas
        area = _this.dom.getElementsByClassName("RESOURCES")[0];
        new ResourcesSpace(game, area, playerNumber, "score", "score", "points", "score-color");
        new ResourcesSpace(game, area, playerNumber, "workersFree", "free workers", "workers", "worker-color");
        new ResourcesSpace(game, area, playerNumber, "corn", "corn", "corn", "corn-color");
        new ResourcesSpace(game, area, playerNumber, "skulls", "skulls", "skulls", "skull-color");
        new ResourcesSpace(game, area, playerNumber, "wood", "wood", "wood", "wood-color");
        new ResourcesSpace(game, area, playerNumber, "stone", "stone", "stone", "stone-color");
        new ResourcesSpace(game, area, playerNumber, "gold", "gold", "gold", "gold-color");
        //Setup religion and technology area
        area = _this.dom.getElementsByClassName("TECHNOLOGY")[0];
        new TrackSpace(game, area, playerNumber, "religion", 0, ["-1p", "0p", "2p s", "4p", "6p s", "7p", "8p *"], "religion-0-color");
        new TrackSpace(game, area, playerNumber, "religion", 1, ["-2p", "0p", "1p", "2p g", "4p", "6p g", "9p", "12p", "13p *"], "religion-1-color");
        new TrackSpace(game, area, playerNumber, "religion", 2, ["-1p", "0p", "1p w", "3p", "5p w", "7p k", "9p", "10p *"], "religion-2-color");
        new TrackSpace(game, area, playerNumber, "technology", 0, ["", "+1/0c", "+1/1c tile", "+3/1c tile", "R"], "none");
        new TrackSpace(game, area, playerNumber, "technology", 1, ["", "+w", "+w/s", "+w/s/g", "2x"], "none");
        new TrackSpace(game, area, playerNumber, "technology", 2, ["", "B: 1c", "B: 1c 2p", "B: 1c 2p -x", "3p"], "none");
        new TrackSpace(game, area, playerNumber, "technology", 3, ["", ">C", ">C x:R", ">C x:R +k", "k"], "none");
        return _this;
    }
    PlayerDOM.prototype.refresh = function () { };
    return PlayerDOM;
}(Refreshable));
var UIHandler = /** @class */ (function () {
    function UIHandler(parentDom) {
        //Create a UI for a Tzolkin Game
        //Create the list of refreshables
        this.refreshables = [];
        //Setup my Dom element
        var templates = document.getElementById("TEMPLATES");
        var gameTemplate = templates === null || templates === void 0 ? void 0 : templates.getElementsByClassName("TZOLKIN-GAME")[0];
        this.dom = gameTemplate.cloneNode(true);
        parentDom.appendChild(this.dom);
    }
    UIHandler.prototype.create = function (game) {
        //Actually make the UI
        var templates = document.getElementById("TEMPLATES");
        //Setup needed variables
        var area;
        var rewards;
        var i;
        //Help Text area
        area = this.dom.getElementsByClassName("HELP-TEXT")[0];
        new HelpText(game, area);
        //Build special actoins
        area = this.dom.getElementsByClassName("SPECIAL-ACTIONS")[0];
        new SpecialAction(game, area, "Place Workers", "place");
        new SpecialAction(game, area, "Pickup Workers", "pickup");
        new SpecialAction(game, area, "Beg for Corn", "beg");
        new SpecialAction(game, area, "End Turn", "end");
        var placeHolder = new SpecialAction(game, area, "!", "!"); //Place holder
        placeHolder.dom.style.visibility = "hidden";
        placeHolder.refresh = function () { }; //Should not refresh (aka stay hidden)
        //Build general information 
        area = this.dom.getElementsByClassName("GENERAL-AREA")[0];
        new InfoSpace(game, area, "round", "of 27 rounds");
        new InfoSpace(game, area, "firstPlayer", "first player");
        new InfoSpace(game, area, "turn", "player's turn");
        new InfoSpace(game, area, "skulls", "skulls").dom.classList.add("skull-color");
        var firstPlayerSpace = templates.getElementsByClassName("FIRST-PLAYER-NAME")[0];
        area.appendChild(firstPlayerSpace);
        new FirstPlayerSpace(game, area, "first player");
        new InfoSpace(game, area, "bribe", "bribe").dom.classList.add("corn-color");
        //Build wheel P
        area = this.dom.getElementsByClassName("P-WHEEL-INPUT")[0];
        rewards = ["", "3c", "4c", "5c/2w", "7c/3w", "9c/4w", "~", "~"];
        var PWoodVisibility = [false, false, false, true, true, true, false, false];
        var PCornVisibility = [false, false, true, true, true, true, false, false];
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
        var CSkullVisible = [false, true, true, true, true, true, true, true, true, true, false];
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
    };
    UIHandler.prototype.addRefreshable = function (refreshable) {
        //Add a refreshable to the refereshables list
        this.refreshables.push(refreshable);
    };
    UIHandler.prototype.refresh = function () {
        //Refresh all the items on the refreshables list
        for (var _i = 0, _a = this.refreshables; _i < _a.length; _i++) {
            var r = _a[_i];
            r.refresh();
        }
    };
    return UIHandler;
}());
var inputArea = document.getElementById("input-area");
var ui = new UIHandler(inputArea);
var game = new TzolkinGame(ui);
ui.create(game);
//Programm added buttons
var godButton = document.getElementById("god-mode");
godButton.onclick = function () {
    if (game.godMode) {
        game.calculate(); //re-calc what you can do
    }
    //Switch to god mode
    game.godMode = !game.godMode;
    game.refresh(); //refresh the visuals
};
//# sourceMappingURL=tzolkin.js.map