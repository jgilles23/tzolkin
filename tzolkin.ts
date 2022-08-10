console.log("Tzolkin Solver is Running.")

//Base array type for filling an array with a value type
interface Array<T> {
    fill(value: T): Array<T>;
}
//Type for returning if an action was sucessful
//boolean - sucess or not; string - tell me what happened; Object for additional data
type ReturnString = [boolean, string, Object]
//Type for the wheels
type Wheel = "P" | "Y" | "T" | "U" | "C"
type PlayerValueDirect = "score" | "workersTotal" | "workersFree" | "corn" | "skulls" | "wood" | "stone" | "gold"
type PlayerValueIndexed = "religion" | "technology"
type InformationValue = "skulls" | "bribe" | "round" | "turn" | "firstPlayer"
//Action types
type Actions = { [index: string]: () => void }
//Building costs & reqards
interface BuildingCost {
    corn?: number;
    wood?: number;
    stone?: number;
    gold?: number;
    skulls?: number;
}
interface BuildingReward extends BuildingCost {
    points?: number
    technology?: Array<number>; //Technology boosts, -1 is technology of users choice
    religion?: Array<number>; //Religion boost, -1 is religion of users choice
    build?: boolean; //Allows user to perform an extra build action
    freeWorkers?: number //Number of free workers
    workerDiscount?: number //Discount applied to each worker
}

type BuildingColor = "brown" | "yellow" | "green" | "blue"
type BuildingResourceName = "corn" | "wood" | "stone" | "gold"
type Pairs = Array<[number | undefined, number, BuildingResourceName]>

//Random Tupe type that I can't remember where it is used
type Tuple = [Wheel, Array<number>]
//The calculation types that can be added to the calculation stack
type CalculationTypes = CalculationTurnStart | CalculationPickup | CalculationChooseAction | CalculationPlace |
    CalculateBegReligion
interface Calculation {
    name: string;
}
interface CalculationTurnStart extends Calculation {
    name: "turnStart"
}
interface CalculationPickup extends Calculation {
    name: "pickup"
    workersPickedup: number;
}
interface CalculationPlace extends Calculation {
    name: "place"
    workersPlaced: number;
}
interface CalculationChooseAction extends Calculation {
    name: "chooseAction"
    wheel: Wheel;
    position: number
}
interface CalculateBegReligion extends Calculation {
    name: "begReligion"
}

//Base variables

class LocalStorageHandler {
    //Class for handling reading and writing to the local storage
    prefix: string
    currentPos: number
    maxPos: number
    constructor(prefix: string) {
        //Build and load the current local storage
        this.prefix = prefix
        //Load the meta-data if it already exists; otherwise create the meta data
        let metaDataString = localStorage.getItem(this.prefix + "-meta")
        if (metaDataString === null) {
            this.currentPos = -1 //Nothing has been written
            this.maxPos = -1 //Nothing has been written
            this.saveMetaData()
        } else {
            let metaData = JSON.parse(metaDataString)
            this.currentPos = metaData["currentPos"]
            this.maxPos = metaData["maxPos"]
        }
    }
    save(game: TzolkinGame) {
        //Iterate current position by 1 and save
        //Delete future positions if required
        this.currentPos += 1
        localStorage.setItem(`${this.prefix}-${this.currentPos}`, game.stringify()) //Save
        console.log(`${this.prefix}-${this.currentPos} saved`)
        //Check if future items need to be saved over
        if (this.maxPos <= this.currentPos) {
            this.maxPos = this.currentPos
        } else {
            //Something needs to be deleted, iterate through the max-saves and delete
            while (this.maxPos > this.currentPos) {
                localStorage.removeItem(`${this.prefix}-${this.maxPos}`)
                console.log(`${this.prefix}-${this.maxPos} removed`)
                this.maxPos -= 1
            }
        }
        //Save the meta-data
        this.saveMetaData()
    }
    saveMetaData() {
        //Save self meta data
        localStorage.setItem(this.prefix + "-meta", JSON.stringify(this))
    }
    undo(game: TzolkinGame) {
        //Step current position back by 1 then load into the game provided
        if (this.currentPos < 0) {
            console.log("Cannot undo, no positions have been saved.")
        } else if (this.currentPos === 0) {
            console.log("Cannot undo, currently in the 1st position.")
        } else {
            this.currentPos -= 1
            this.load(game)
        }
    }
    redo(game: TzolkinGame) {
        //Iterate the current position by 1 (if possible) and load
        if (this.currentPos >= this.maxPos) {
            console.log("Cannot redo, no future positions have been saved.")
        } else {
            this.currentPos += 1
            this.load(game)
        }
    }
    load(game: TzolkinGame) {
        //Pull the current game from the localStorage
        //Override the game data with the new data
        if (this.currentPos < 0) {
            console.log("Cannot load, no positions have been saved.")
            //Save the current position
            this.save(game)
            return
        }
        let gameString = localStorage.getItem(`${this.prefix}-${this.currentPos}`)
        console.log(`${this.prefix}-${this.currentPos} loaded`)
        if (gameString === null) {
            throw "Expected to load game string, got nothing."
        }
        let gameObject = JSON.parse(gameString)
        //Unpack the gameObject onto the game
        game.unpack(gameObject)
        //Save the meta-data
        this.saveMetaData()
    }
    deleteAll() {
        //Remove all data saved in local storage & reset self
    }

}

class Player {
    //Store all the info about a single player
    //except where they are on the wheels
    id: number //Player id starting at 0
    color: string //Some way to represent the color of the player
    religion: Array<number> //By track, 0 is the negative space, 1 is starting
    technology: Array<number> //By track, 0 is starting position
    buildings: Array<unknown> //Array of buildings
    score: number
    workersTotal: number
    workersFree: number
    corn: number
    skulls: number
    wood: number
    stone: number
    gold: number

    constructor(id: number, color: string) {
        this.id = id
        this.color = color
        this.religion = [1, 1, 1]
        this.technology = [0, 0, 0, 0]
        this.buildings = []
        this.score = 0
        this.workersTotal = 3
        this.workersFree = 3
        this.corn = 0
        this.skulls = 0
        this.wood = 0
        this.stone = 0
        this.gold = 0
    }

    hasArchitectureSavingsTech() {
        return this.technology[2] > 3
    }
}



class Return {
    //Class for returning more data from a function
    f: boolean
    string: string
    object: Object

    constructor(f: boolean, string: string = "", object: Object = {}) {
        this.f = f
        this.string = string
        this.object = object
    }
}



class Building {
    //Class for holding and working with buildings
    //Integral to the TzolkinGame class and allowed to directly modify that class
    costs: BuildingCost
    rewards: BuildingReward
    color: BuildingColor
    id: number

    constructor(costs: BuildingCost, rewards: BuildingReward, color: BuildingColor, buildingNumber: number) {
        this.costs = costs
        this.rewards = rewards
        this.color = color
        this.id = buildingNumber
    }
    pairs(game: TzolkinGame): Pairs {
        let player = game.players[game.turn]
        return [
            [this.costs.corn, player.corn, "corn"],
            [this.costs.wood, player.wood, "wood"],
            [this.costs.stone, player.stone, "stone"],
            [this.costs.gold, player.gold, "gold"]
        ]
    }
    testBuildResources(game: TzolkinGame, architecture: boolean): boolean {
        let player: Player = game.players[game.turn]
        let resourceDeficit: number = 0
        for (let [cost, inventory, resourceName] of this.pairs(game)) {
            if (cost !== undefined && cost > inventory) {
                resourceDeficit += cost - player.corn
            }
        }
        //Check if the player has architecture
        if (resourceDeficit > 1) {
            return false
        } else if (resourceDeficit === 0) {
            return true
        } else if (player.hasArchitectureSavingsTech() && architecture === true) {
            return true
        } else {
            return false
        }
    }

    performBuildResources(game: TzolkinGame, architecture: boolean, savedResource: BuildingCost | "none") {
        let player: Player = game.players[game.turn]
        //Actually spend the resources to build something
        //testBuildResources must be run first otherwise something might be built without having the required resources
        //See if architecture should be offered
        if (architecture && player.hasArchitectureSavingsTech()) {

        }
    }

    testBuildCorn(game: TzolkinGame, architecture: boolean): boolean {
        let player: Player = game.players[game.turn]
        let cornCost: number = 0
        for (let [cost, inventory, resourceName] of this.pairs(game)) {
            if (cost !== undefined) {
                cornCost += cost * 2 //Spend 2 corn per resource
            }
        }
        //Calculate final cost
        if (architecture && player.technology[2] > 3) [
            cornCost -= 2
        ]
        if (cornCost < 0) {
            cornCost = 0
        }
        //See if the player has enough corn
        if (player.corn >= cornCost) {
            return true
        } else {
            return false
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
]

class TzolkinGame {
    //Shared game items: -1 generally means space is empty, 0+ space with player, -2 space with non-player
    P: Array<number> //Palenque by Space
    PCorn: Array<number> //Corn tiles showing
    PWood: Array<number> //Wood tiles showing
    Y: Array<number> //Yaxchilan by space
    T: Array<number> //Tikal by space
    U: Array<number> //Uxmal by space
    C: Array<number> //Chichen Itza by space
    CSkull: Array<boolean> //boolean if skull space is taken
    skulls: number //number of skulls remaining in supply
    monuments: Array<number> //Of monumnets
    buildings: Array<number> //Of buildings
    bribe: number //Number of corn on the central wheel
    round: number //Turn number remaining of 27 (index from 1)
    turn: number //Player number who is active
    firstPlayer: number //Which is the first player
    firstPlayerSpace: number //Who is in the first player space (-1 if no one)
    //Player specific items
    players: Array<Player>
    //UI & storage - not saved in LocalStorage
    ui: UIHandler | null//Not saved in local storage
    storage: LocalStorageHandler | null //Local storage not required
    //Actions that can be taken
    calculationStack: Array<CalculationTypes>
    actions: Actions //Not saved in local storage
    helpText: string
    godMode: boolean //Allow direct user input

    constructor(ui: UIHandler | null, storage: LocalStorageHandler | null) {
        //Create a game (assume two player)
        //If ui is null, the game will not display
        //If storage is null, the game will not save
        this.P = new Array<number>(8).fill(-1)
        this.PCorn = new Array<number>(8).fill(0)
        this.PWood = new Array<number>(8).fill(0)
        for (let i = 2; i <= 5; i++) {
            this.PWood[i] = 2
        }
        this.Y = new Array<number>(8).fill(-1)
        this.T = new Array<number>(8).fill(-1)

        this.U = new Array<number>(8).fill(-1)
        this.C = new Array<number>(11).fill(-1)
        this.CSkull = new Array<boolean>(11).fill(false)
        this.skulls = 13
        this.monuments = []
        this.buildings = [0, 1, 2, 3, 4, 5]
        this.bribe = 0
        this.round = 1
        this.turn = 0
        this.firstPlayer = 0
        this.firstPlayerSpace = -1
        this.players = [
            new Player(0, "IndianRed"),
            new Player(1, "SteelBlue")
        ]
        //Display and calculate
        this.calculationStack = []
        this.helpText = ""
        this.godMode = false
        //Non-saved data
        this.ui = ui
        this.storage = storage
        this.actions = {}
        //Caculate the starting turn
        this.calculationStack.push({ name: "turnStart" })
        this.calculate()
    }

    stringify() {
        let replacer = (key: string, value: any): any => {
            if (key === "ui") {
                //Don't save the ui data
                return undefined
            } else if (key === "actions") {
                //Don't save the actions data, will need to be re-calculated
                return undefined
            } else if (key === "storage") {
                //Do not save the storage in the storage it messes everything up
                return undefined
            } else {
                return value
            }
        }
        return JSON.stringify(this, replacer)
    }

    unpack(gameObject: Object) {
        //Enforce type on gameObject
        let gameObjectTyped: TzolkinGame = gameObject as TzolkinGame
        //Assign the un-stringified gameObject to the game
        Object.assign(this, gameObjectTyped)
        //Assign the players
        if (gameObjectTyped.players === undefined) {
            throw "gameObject loaded does not have players defined"
        }
        this.players = []
        let i = 0
        for (let playerObject of gameObjectTyped.players) {
            let newPlayer = new Player(i, "grey")
            //Actually assign the player to the game
            this.players.push(Object.assign(newPlayer, playerObject))
            i += 1
        }
        //Run the calculation to determine the actions avaliable
        this.calculate()
        //Refresh the visuals as if the previous action was just taken
        this.refresh()
    }

    getWheels(): Array<Tuple> {
        return [["P", this.P], ["Y", this.Y], ["T", this.T], ["U", this.U], ["C", this.C]]
    }

    calculate() {
        //Look at the calculation stack and perform the last calculation on the stack
        //Calculations should be removed from the stack when the next action is perfomred
        //Each action performed should add another calculation to the calculationStack
        if (this.calculationStack.length === 0) {
            throw "No calculations left to perform"
        }
        //Clear the avaliable action, they will be re-calculated
        this.actions = {}
        //get the next calculation
        let calculationIndex: number = this.calculationStack.length - 1
        let currentCalculation: Calculation = this.calculationStack[calculationIndex]
        //Switch through the calculation types
        if (currentCalculation.name === "turnStart") {
            let calc = currentCalculation as CalculationTurnStart
            this.calcTurnStart()
        } else if (currentCalculation.name === "pickup") {
            let calc = currentCalculation as CalculationPickup
            this.calcPickup2(calc.workersPickedup)
        } else if (currentCalculation.name === "place") {
            let calc = currentCalculation as CalculationPlace
            this.calcPlace2(calc.workersPlaced)
        } else if (currentCalculation.name === "chooseAction") {
            let calc = currentCalculation as CalculationChooseAction
            this.calcChooseAction(calc.wheel, calc.position)
        } else if (currentCalculation.name === "begReligion") {
            let calc = currentCalculation as CalculateBegReligion
            this.calcBegReligion()
        } else {
            throw "Calculation not recognized"
        }
    }

    calcTurnStart() {
        this.helpText = "Choose starting action."
        let player: Player = this.players[this.turn]
        this.calcPickup2(0)
        this.calcPlace2(0)
        //Calculate begging for corn option
        if (player.corn < 3 && player.religion[0] > 0 && player.religion[1] > 0 && player.religion[2] > 0) {
            this.actions["beg"] = () => {
                //Beg for corn
                player.corn = 3
                //Add the startover action
                this.calculationStack.push({ name: "turnStart" })
                //Add the beg religion calculation
                this.calculationStack.push({ name: "begReligion" })
            }
        }
        //Calculate the pitty option
        if (Object.keys(this.actions).length === 0) {
            this.calcPity()
        }

    }

    calcPickup2(workersPickedup: number) {
        //Iterate through all the wheels to decide which worker to pick up
        if (workersPickedup === 0) {
            //First worker to be picked up - must be picked up
        }
        else {
            this.helpText = "Choose another worker to pick up."
            this.actions["end"] = () => {
                //End turn action is now avaliable
                this.performEndTurn()
            }
        }
        let player = this.players[this.turn]
        //Iterate through all the wheels and positions
        for (let [wheelName, wheel] of this.getWheels()) {
            for (let pos = 0; pos < this.C.length; pos++) {
                if (pos < wheel.length) {
                    //Check if player has a piece there
                    if (wheel[pos] === this.turn) {
                        //Player can pickup from this location
                        this.actions[`${wheelName}${pos}`] = () => {
                            //Perform the pickup actions
                            player.workersFree += 1 //Return a worker to the player
                            wheel[pos] = -1 //Set the wheel positon to -1
                            //Add the next pickup to the stack
                            this.calculationStack.push({
                                name: "pickup",
                                workersPickedup: workersPickedup + 1
                            })
                            //Add the chooseAction calculation to the stack
                            this.calculationStack.push({
                                name: "chooseAction",
                                wheel: wheelName,
                                position: pos,
                            })
                        }
                    }
                }
            }
        }
        //Check if end turn is the only option
        if (Object.keys(this.actions).length === 0 && "end" in this.actions) {
            this.helpText = "No more workers can be picked up. Please end turn."
        }
    }

    calcPlace2(workersPlaced: number) {
        //Iterate through all the wheels to decide where a worker can be placed
        if (workersPlaced === 0) {
            //First worker must be placed
        } else {
            this.helpText = `Choose another placement for ${workersPlaced}+ corn.`
            this.actions["end"] = () => {
                this.performEndTurn()
            }
        }
        let player: Player = this.players[this.turn]
        //Check if ther player has free workers
        if (player.workersFree <= 0) {
            return //Done, no new workers that can be placed
        }
        //Find the lowest numbered spot (if there are still workers free)
        for (let [wheelName, wheel] of this.getWheels()) {
            let foundOpenPosition: boolean = false
            for (let pos = 0; pos < this.C.length; pos++) {
                if (pos < wheel.length) {
                    //Need empty spot and corn
                    if (player.corn >= pos + workersPlaced && wheel[pos] === -1) {
                        //Worker can be placed here
                        this.actions[`${wheelName}${pos}`] = () => {
                            //Place the worker
                            player.corn -= pos + workersPlaced
                            player.workersFree -= 1
                            wheel[pos] = player.id
                            //Add next placement to the stack
                            this.calculationStack.push({
                                name: "place",
                                workersPlaced: workersPlaced + 1
                            })
                        }
                    }
                    //break to next wheel on finding an open position
                    if (wheel[pos] === -1) {
                        foundOpenPosition = true
                        break
                    }
                }
            }
            //Break on open position
            if (foundOpenPosition) {
                continue
            }
        }
        //Check the starting spot
        if (this.firstPlayerSpace === -1 && player.corn >= workersPlaced) {
            //Worker can be placed on starting position
            this.actions[`S`] = () => {
                player.workersFree -= 1
                this.firstPlayerSpace = this.turn
                //Add next placement to the stack
                this.calculationStack.push({
                    name: "place",
                    workersPlaced: workersPlaced + 1
                })
            }
        }
        //Check if end turn is the only option
        if (Object.keys(this.actions).length === 0 && "end" in this.actions) {
            this.helpText = "No more workers can be placed. Please end turn."
        }
    }

    calcPity() {
        throw "TODO calulate pity not yet programmed."
    }

    calcBegReligion() {
        //This is a sub calculation, does not inherently add another calculation to the stack
        let player = this.players[this.turn]
        //Choose the religion track to go down on
        for (let i = 0; i < 3; i++) {
            if (player.religion[i] > 0) {
                this.actions[`p${this.turn}R${"ABC"[i]}`] = () => {
                    //Reduce on that religion
                    player.religion[i] -= 1
                }
            }
        }
    }

    calcChooseAction(wheel: Wheel, pos: number) {
        console.log("TODO Choose Action not yet implemented.")
    }

    refresh() {
        if (this.ui !== null) {
            this.ui.refresh()
        }
    }

    performAction(actionName: string) {
        //Perform an action
        if (actionName in this.actions) {
            //Remove the most recent calculation from the stack
            this.calculationStack.pop()
            //Clear the actions then play this action - more calculations should be added to the stack
            let f = this.actions[actionName] //Grab the function to be called
            f() //Call the function
            //Perform the next calculation in the stack - which clears the actions as a side effect
            this.calculate()
            //Update the ui
            this.refresh()
            //Save the state of the game
            if (this.storage !== null) {
                this.storage.save(this)
            }
        } else {
            console.log(`Action "${actionName}" not recognized as a legal move.`)
        }
        //No refresh here, each action performed should refresh on its own
    }

    performEndTurn() {
        console.log("performEndTurn TO BE BUILT")
    }


    placeWorker(playerNumber: number, wheel: Wheel, spaceNumber: number, godMode: boolean): Return {
        //Place the worker that is requested by the user
        //Perform differently in god and not god modee
        //Place the worker
        if (godMode) {
            this[wheel][spaceNumber] = playerNumber
            return new Return(true)
        }
        return new Return(false)
    }

    nextWorkerOnSpace(wheel: Wheel, spaceNumber: number): number {
        //Calculate the next worker to go on a space
        let x = this[wheel][spaceNumber] + 1
        if (x === this.players.length) {
            return -2
        } else {
            return x
        }
    }

    pickupTile(spaceNumber: number, type: "w" | "c", godMode: boolean) {
        //Pickup either a wood or a corn tile
        if (godMode) {
            if (type === "w") {
                if (this.PWood[spaceNumber] === 0) {
                    this.PWood[spaceNumber] = this.players.length
                } else {
                    this.PWood[spaceNumber] -= 1
                }
            } else {
                if (this.PCorn[spaceNumber] === 0) {
                    this.PCorn[spaceNumber] = this.players.length
                } else {
                    this.PCorn[spaceNumber] -= 1
                }
            }
        }
    }

    setSkull(spaceNumber: number, godMode: boolean) {
        //Set a skill on the C wheel
        if (godMode) {
            this.CSkull[spaceNumber] = !this.CSkull[spaceNumber]
        }
    }

    stepReligion(playerNumber: number, religionNumber: number, delta: number, godMode: boolean) {
        //Increase or decrease religion by the delta
        if (godMode) {
            let max: number = 7
            switch (religionNumber) {
                case 0: max = 7; break;
                case 1: max = 9; break;
                case 2: max = 8; break;
                default: throw "Religion not recognized."; break;
            }
            let r = this.players[playerNumber].religion
            r[religionNumber] = (r[religionNumber] + delta) % max
        }
    }

    stepTechnology(playerNumber: number, technologyNumber: number, godMode: boolean) {
        //Increase technology by a step
        if (godMode) {
            let t = this.players[playerNumber].technology
            t[technologyNumber] = (t[technologyNumber] + 1) % 4
        }
    }

    setFirstPlayer(playerNumber: number, godMode: boolean) {
        //Set first player (-1 is not taken)
        if (godMode) {
            this.firstPlayerSpace = playerNumber
        }
    }


}

class Refreshable {
    //Base class for items that the game can refresh on the screen
    game: TzolkinGame
    ui: UIHandler
    constructor(game: TzolkinGame) {
        this.game = game
        if (game.ui === null) {
            throw "game has not been assigned a ui. ui must be assigned to the game before creating elements"
        } else {
            this.ui = game.ui
        }
        this.ui.addRefreshable(this)
    }
    refresh() {
        //Refresh must be implemented by sub-class
        throw "refresh must be impemented by sub-class."
    }
}

class TileBase extends Refreshable {
    //Base class for tiles that can be clicked on the screen
    dom: HTMLSpanElement
    actionName: string
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, topText: string = "", bottomText: string = "") {
        super(game)
        let templateArea = document.getElementById("TEMPLATES") as HTMLSpanElement
        let template = templateArea.getElementsByClassName("TILE")[0] as HTMLSpanElement
        this.dom = template.cloneNode(true) as HTMLSpanElement
        this.setTopText(topText)
        this.setBottomText(bottomText)
        //Add the dom to the tree
        parentDom.appendChild(this.dom)
        //action name should be defined in sub-classes
        this.actionName = "NONE"
    }
    setTopText(text: string) {
        let topDom = this.dom.getElementsByClassName("TOP-TEXT")[0] as HTMLSpanElement
        topDom.textContent = text
    }
    setBottomText(text: string) {
        let bottomDom = this.dom.getElementsByClassName("BOTTOM-TEXT")[0] as HTMLSpanElement
        bottomDom.textContent = text
    }
    //super.refresh must be called from all subclasses for highlighting to work
    refresh() {
        if (this.actionName in game.actions || game.godMode) {
            this.dom.classList.add("highlight")
        } else {
            this.dom.classList.remove("highlight")
        }
    }
}

class TileBaseBottomText extends TileBase {
    //A tile that only has text on the bottom (used for wwod/corn tiles & Chichen Itza skull indication)
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, bottomText: string = "") {
        super(game, parentDom, "", bottomText)
        this.dom.getElementsByClassName("tile-top-text")[0].remove()
        this.dom.getElementsByTagName("br")[0].remove()
    }
}

class WheelSpace extends TileBase {
    //Space on the 5 main wheels
    wheel: Wheel
    spaceNumber: number

    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, wheel: Wheel, spaceNumber: number, bottomText: string = "") {
        let topText = wheel + spaceNumber.toString()
        super(game, parentDom, wheel + spaceNumber.toString(), bottomText)
        this.actionName = topText
        this.wheel = wheel
        this.spaceNumber = spaceNumber
        //Onclick cycle to the next player for this space, -1 after all players;
        //In god mode so that resource values are not changed
        this.dom.onclick = x => {
            if (game.godMode) {
                let nextPlayerNumber = this.game.nextWorkerOnSpace(this.wheel, this.spaceNumber)
                this.game.placeWorker(nextPlayerNumber, this.wheel, this.spaceNumber, true)
                this.refresh()
            } else {
                this.game.performAction(this.actionName)
            }
        }
    }

    refresh() {
        super.refresh()
        //Update the visuals to reflect the game
        //Change the background color
        let player = this.game[this.wheel][this.spaceNumber]
        if (player === -1) {
            this.dom.style.backgroundColor = "white"
        } else if (player === -2) {
            this.dom.style.backgroundColor = "lightgrey"
        } else {
            this.dom.style.backgroundColor = this.game.players[player].color
        }
    }
}

class ResourceTile extends TileBaseBottomText {
    //wood and corn resource tiles on Palanque
    type: "w" | "c" //wood or corn resource tiles
    spaceNumber: number
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, spaceNumber: number, type: "w" | "c", visible: boolean) {
        //Create resource tiles at spacenumber of type wood or corn; make tile visible with true
        super(game, parentDom, "")
        this.actionName = `T${spaceNumber}${type}`
        this.type = type
        this.spaceNumber = spaceNumber
        //Define onClick
        this.dom.onclick = x => {
            if (game.godMode) {
                this.game.pickupTile(this.spaceNumber, this.type, true)
                this.refresh()
            } else {
                this.game.performAction(this.actionName)
            }
        }
        //Set the background color
        if (this.type === "w") {
            this.dom.classList.add("wood-color")
        } else {
            this.dom.classList.add("corn-color")
        }
        //Make invisible and space taking in appropriate
        if (visible === false) {
            this.dom.style.visibility = "hidden"
        }
    }
    refresh() {
        super.refresh()
        let remaining: number
        if (this.type === "w") {
            remaining = this.game.PWood[this.spaceNumber]
        } else {
            remaining = this.game.PCorn[this.spaceNumber]
        }
        this.setBottomText(remaining + this.type)
    }
}

class SkullSpace extends TileBaseBottomText {
    //Skull indication spaces on Chichen Itza
    spaceNumber: number
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, spaceNumber: number, visible: boolean) {
        //Shows if the spot has been taken by the skull already
        super(game, parentDom, "")
        this.actionName = "NONE"
        this.spaceNumber = spaceNumber
        //Set onclick action
        this.dom.onclick = x => {
            if (game.godMode) {
                this.game.setSkull(this.spaceNumber, true)
                this.refresh()
            }
        }
        //Set the background color
        this.dom.classList.add("skull-color")
        //Make invisible and space taking in appropriate
        if (visible === false) {
            this.dom.style.visibility = "hidden"
        }
    }
    refresh() {
        super.refresh()
        if (this.game.CSkull[this.spaceNumber] === true) {
            this.setBottomText("k")
        } else {
            this.setBottomText("-")
        }
    }
}

class ResourcesSpace extends TileBase {
    //Space that shows how many resources of a type a player has
    playerNumber: number
    resource: PlayerValueDirect

    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, playerNumber: number,
        resource: PlayerValueDirect, promptString: string, bottomText: string, className: string) {
        //Show all the resources owned by a player
        //Inputs: bottomText-resource type, resouce:string of resource type, className:CSS class name, promptString: resource name as presented to player
        super(game, parentDom, "", bottomText)
        this.actionName = "NONE"
        this.playerNumber = playerNumber
        this.resource = resource
        //Change appearance
        this.dom.classList.add(className)
        //onclick
        this.dom.onclick = x => {
            if (this.game.godMode) {
                let input = prompt(`Player ${this.playerNumber} ${promptString}:`, this.resouceCount().toString())
                if (input === null) {
                    //If user does not input, don't change anything
                    return
                }
                let ret = this.validateCount(input)
                if (ret.f === true) {
                    this.setCount(parseInt(input))
                }
                this.refresh()
            }
        }
    }
    refresh() {
        super.refresh()
        //Show updated text
        this.setTopText(this.resouceCount().toString())
    }
    resouceCount(): number {
        return this.game.players[this.playerNumber][this.resource]
    }
    validateCount(input: string): Return {
        let valid = /^\d+$/.test(input)
        if (valid) {
            return new Return(true, "")
        } else {
            return new Return(false, "Invalid user input. Input must be a non-negative integer.")
        }
    }
    setCount(value: number) {
        this.game.players[this.playerNumber][this.resource] = value
    }
}

class TrackSpace extends TileBase {
    //Religion and Technology Tracks
    playerNumber: number
    type: PlayerValueIndexed
    subType: number
    bottomTextArray: Array<string>
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, playerNumber: number,
        type: PlayerValueIndexed, subType: number, bottomTextArray: Array<string>,
        className: string) {
        //Space for showing religion and technology progress
        let topText: string
        if (type === "religion") {
            topText = "R" + "ABCD"[subType]
        } else {
            topText = "T" + "ABCD"[subType]
        }
        //Call super for the function
        super(game, parentDom, topText, "")
        this.actionName = `p${playerNumber}${topText}`
        this.playerNumber = playerNumber
        this.type = type
        this.subType = subType
        this.bottomTextArray = bottomTextArray
        //Make the color
        this.dom.classList.add(className)
        //Set click function
        this.dom.onclick = x => {
            if (this.game.godMode) {
                if (this.type === "religion") {
                    this.game.stepReligion(this.playerNumber, this.subType, 1, true)
                } else {
                    this.game.stepTechnology(this.playerNumber, this.subType, true)
                }
                this.refresh()
            } else {
                this.game.performAction(this.actionName)
            }
        }
    }
    refresh() {
        super.refresh()
        if (this.type === "religion") {
            this.setBottomText(this.bottomTextArray[this.game.players[this.playerNumber].religion[this.subType]])
        } else {
            this.setBottomText(this.bottomTextArray[this.game.players[this.playerNumber].technology[this.subType]])
        }
    }
}

class InfoSpace extends TileBase {
    //Show some base game information
    type: InformationValue
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, type: InformationValue, bottomText: string = "") {
        super(game, parentDom, "", bottomText)
        this.actionName = "NONE"
        this.type = type
        //Set onclick
        this.dom.onclick = x => {
            if (this.game.godMode) {
                let input = window.prompt(`Set ${bottomText}:`, this.value().toString())
                if (input === null) {
                    return
                }
                let ret = this.validateValue(input)
                if (ret.f === true) {
                    this.setValue(parseInt(input))
                }
                this.refresh()
            }
        }
    }
    value() {
        return this.game[this.type]
    }
    validateValue(input: string): Return {
        let valid = /^\d+$/.test(input)
        if (valid) {
            return new Return(true, "")
        } else {
            return new Return(false, "Invalid user input. Input must be a non-negative integer.")
        }
    }
    setValue(value: number) {
        this.game[this.type] = value
    }
    refresh() {
        super.refresh()
        this.setTopText(this.value().toString())
    }
}

class FirstPlayerSpace extends TileBase {
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, bottomText: string = "") {
        super(game, parentDom, "S", bottomText)
        this.actionName = "S"
        //onclick
        this.dom.onclick = x => {
            if (this.game.godMode) {
                let newFirstPlayerSpace: number = this.game.firstPlayerSpace + 1
                if (newFirstPlayerSpace === this.game.players.length) {
                    newFirstPlayerSpace = -1
                }
                this.game.setFirstPlayer(newFirstPlayerSpace, true)
                this.refresh()
            } else {
                this.game.performAction(this.actionName)
            }
        }
    }
    refresh() {
        super.refresh()
        if (this.game.firstPlayerSpace === -1) {
            this.dom.style.backgroundColor = "white"
        } else {
            this.dom.style.backgroundColor = this.game.players[this.game.firstPlayerSpace].color
        }
    }
}

class SpecialAction extends TileBase {
    //Special actions that will pop up at the top
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, topText: string, actionName: string) {
        super(game, parentDom, topText, "")
        this.actionName = actionName
        this.dom.classList.add("special")
        this.dom.onclick = x => {
            this.game.performAction(this.actionName)
            this.refresh()
        }
    }
    //Hide if not an avaliable action
    refresh(): void {
        super.refresh()
        if (this.actionName in this.game.actions) {
            this.dom.style.display = "inline"
        } else {
            this.dom.style.display = "none"
        }
    }
}

class HelpText extends Refreshable {
    dom: HTMLSpanElement
    //Text that is shown at the top of the window
    constructor(game: TzolkinGame, selfDom: HTMLSpanElement) {
        super(game)
        this.dom = selfDom
    }
    refresh(): void {
        this.dom.textContent = this.game.helpText
    }
}

class BuildingTile extends TileBase {
    pos: number
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, pos: number) {
        super(game, parentDom, "", "")
        this.actionName = `B${pos}`
        this.pos = pos
        //Show the bottom text as large
    }
    numSim(n: number | undefined, symbol: string) {
        //Function for simplifying numbers
        //Retunrs "" for undefined values
        if (n === 0 || n === undefined) {
            return ""
        }
        else if (n === 1 && symbol !== "c" && symbol !== "p") {
            //Corn and points should always have a number
            return symbol + " "
        }
        else {
            return n.toString() + symbol + " "
        }
    }
    getBaseText(base: BuildingReward) {
        let text: string = ""
        text += this.numSim(base.corn, "c")
        text += this.numSim(base.skulls, "k")
        text += this.numSim(base.wood, "w")
        text += this.numSim(base.stone, "s")
        text += this.numSim(base.gold, "g")
        text += this.numSim(base.points, "p")
        return text.slice(0, text.length - 1)
    }
    refresh(): void {
        super.refresh()
        //Ensure that there is a building to display
        if (this.pos >= game.buildings.length) {
            this.setTopText("")
            this.setBottomText("")
            return
        }
        let building: Building = allBuildings[this.game.buildings[this.pos]]
        //Show the toptext
        this.setTopText(this.getBaseText(building.costs))
        //Calculate and show the bottom text
        let bottomText = ""
        //bottom text technology
        if (building.rewards.technology !== undefined) {
            for (let techNum of building.rewards.technology) {
                if (techNum === -1) {
                    bottomText += "TX "
                } else {
                    bottomText += `T${"ABCD"[techNum]} `
                }
            }
        }
        //Bottom text religion
        if (building.rewards.religion !== undefined) {
            for (let religionNum of building.rewards.religion) {
                if (religionNum === -1) {
                    bottomText += "RX "
                } else {
                    bottomText += `R${"ABC"[religionNum]} `
                }
            }
        }
        //Build
        if (building.rewards.build === true) {
            bottomText += "B "
        }
        //Free workers
        if (building.rewards.freeWorkers !== undefined) {
            bottomText += "W".repeat(building.rewards.freeWorkers) + " "
        }
        //worker discount
        if (building.rewards.workerDiscount !== undefined) {
            bottomText += `W:-${building.rewards.workerDiscount}c `
        }
        //Normal reqards
        bottomText += this.getBaseText(building.rewards)
        //Set the bottom text
        this.setBottomText(bottomText)
    }
}

class PlayerDOM extends Refreshable {
    dom: HTMLSpanElement
    playerNumber: number
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, playerNumber: number) {
        //Set up a player area for the given player number
        super(game)
        this.playerNumber = playerNumber
        let templates = document.getElementById("TEMPLATES") as HTMLDivElement
        let playerTemplate = templates.getElementsByClassName("PLAYER-X-AREA")[0] as HTMLSpanElement
        this.dom = playerTemplate.cloneNode(true) as HTMLSpanElement
        this.dom.style.display = "block"
        parentDom.appendChild(this.dom)
        //Declare some re-used variables
        let area
        //Set the player name
        area = this.dom.getElementsByClassName("PLAYER-NAME")[0] as HTMLElement
        area.textContent = `Player ${this.playerNumber}`
        //Setup player areas
        area = this.dom.getElementsByClassName("RESOURCES")[0] as HTMLSpanElement
        new ResourcesSpace(game, area, playerNumber, "score", "score", "points", "score-color")
        new ResourcesSpace(game, area, playerNumber, "workersFree", "free workers", "workers", "worker-color")
        new ResourcesSpace(game, area, playerNumber, "corn", "corn", "corn", "corn-color")
        new ResourcesSpace(game, area, playerNumber, "skulls", "skulls", "skulls", "skull-color")
        new ResourcesSpace(game, area, playerNumber, "wood", "wood", "wood", "wood-color")
        new ResourcesSpace(game, area, playerNumber, "stone", "stone", "stone", "stone-color")
        new ResourcesSpace(game, area, playerNumber, "gold", "gold", "gold", "gold-color")
        //Setup religion and technology area
        area = this.dom.getElementsByClassName("TECHNOLOGY")[0] as HTMLSpanElement
        new TrackSpace(game, area, playerNumber, "religion", 0,
            ["-1p", "0p", "2p s", "4p", "6p s", "7p", "8p *"], "religion-0-color")
        new TrackSpace(game, area, playerNumber, "religion", 1,
            ["-2p", "0p", "1p", "2p g", "4p", "6p g", "9p", "12p", "13p *"], "religion-1-color")
        new TrackSpace(game, area, playerNumber, "religion", 2,
            ["-1p", "0p", "1p w", "3p", "5p w", "7p k", "9p", "10p *"], "religion-2-color")
        new TrackSpace(game, area, playerNumber, "technology", 0,
            ["", "+1/0c", "+1/1c tile", "+3/1c tile", "R"], "none")
        new TrackSpace(game, area, playerNumber, "technology", 1,
            ["", "+w", "+w/s", "+w/s/g", "2x"], "none")
        new TrackSpace(game, area, playerNumber, "technology", 2,
            ["", "B: 1c", "B: 1c 2p", "B: 1c 2p -x", "3p"], "none")
        new TrackSpace(game, area, playerNumber, "technology", 3,
            ["", ">C", ">C x:R", ">C x:R +k", "k"], "none")
    }
    refresh() { }
}

class UIHandler {
    dom: HTMLSpanElement
    refreshables: Array<Refreshable>
    constructor(parentDom: HTMLDivElement) {
        //Create a UI for a Tzolkin Game
        //Create the list of refreshables
        this.refreshables = []
        //Setup my Dom element
        let templates = document.getElementById("TEMPLATES") as HTMLDivElement
        let gameTemplate = templates?.getElementsByClassName("TZOLKIN-GAME")[0] as HTMLSpanElement
        this.dom = gameTemplate.cloneNode(true) as HTMLSpanElement
        parentDom.appendChild(this.dom)
    }
    create(game: TzolkinGame) {
        //Actually make the UI
        let templates = document.getElementById("TEMPLATES") as HTMLDivElement
        //Setup needed variables
        let area
        let rewards
        let i
        //Help Text area
        area = this.dom.getElementsByClassName("HELP-TEXT")[0] as HTMLSpanElement
        new HelpText(game, area)
        //Build special actoins
        area = this.dom.getElementsByClassName("SPECIAL-ACTIONS")[0] as HTMLSpanElement
        new SpecialAction(game, area, "Place Workers", "place")
        new SpecialAction(game, area, "Pickup Workers", "pickup")
        new SpecialAction(game, area, "Beg for Corn", "beg")
        new SpecialAction(game, area, "End Turn", "end")
        let placeHolder = new SpecialAction(game, area, "!", "!") //Place holder
        placeHolder.dom.style.visibility = "hidden"
        placeHolder.refresh = () => { } //Should not refresh (aka stay hidden)
        //Build general information 
        area = this.dom.getElementsByClassName("GENERAL-AREA")[0] as HTMLSpanElement
        new InfoSpace(game, area, "round", "of 27 rounds")
        new InfoSpace(game, area, "firstPlayer", "first player")
        new InfoSpace(game, area, "turn", "player's turn")
        new InfoSpace(game, area, "skulls", "skulls").dom.classList.add("skull-color")
        let firstPlayerSpace = templates.getElementsByClassName("FIRST-PLAYER-NAME")[0] as HTMLDivElement
        area.appendChild(firstPlayerSpace)
        new FirstPlayerSpace(game, area, "first player")
        new InfoSpace(game, area, "bribe", "bribe").dom.classList.add("corn-color")
        //Build wheel P
        area = this.dom.getElementsByClassName("P-WHEEL-INPUT")[0] as HTMLSpanElement
        rewards = ["", "3c", "4c", "5c/2w", "7c/3w", "9c/4w", "~", "~"]
        let PWoodVisibility = [false, false, false, true, true, true, false, false]
        let PCornVisibility = [false, false, true, true, true, true, false, false]
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "P", i, rewards[i])
            new ResourceTile(game, area, i, "c", PCornVisibility[i])
            new ResourceTile(game, area, i, "w", PWoodVisibility[i])
        }
        //Build wheel Y
        area = this.dom.getElementsByClassName("Y-WHEEL-INPUT")[0] as HTMLSpanElement
        rewards = ["", "w", "s 1c", "g 2c", "k", "g s 2c", "~", "~"]
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "Y", i, rewards[i])
        }
        //Build Wheel T
        area = this.dom.getElementsByClassName("T-WHEEL-INPUT")[0] as HTMLSpanElement
        rewards = ["", ">", "B", ">>", "2B/M", "x:2R", "~", "~"]
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "T", i, rewards[i])
        }
        //Build Wheel U
        area = this.dom.getElementsByClassName("U-WHEEL-INPUT")[0] as HTMLSpanElement
        rewards = ["", "3c:R", "trade", "wkr", "2c:x B", "1c:any", "~", "~"]
        for (i = 0; i <= 7; i++) {
            new WheelSpace(game, area, "U", i, rewards[i])
        }
        //Build Wheel C
        area = this.dom.getElementsByClassName("C-WHEEL-INPUT")[0] as HTMLSpanElement
        rewards = ["", "4p R0", "5p R0", "6p R0", "7p R1", "8p R1", "8p R1 x", "9p R2", "11p R2 x", "13p R2 x", "~"]
        let CSkullVisible = [false, true, true, true, true, true, true, true, true, true, false]
        for (i = 0; i <= 10; i++) {
            new WheelSpace(game, area, "C", i, rewards[i])
            new SkullSpace(game, area, i, CSkullVisible[i])
        }
        //Build the Building area
        area = this.dom.getElementsByClassName("BUILDINGS")[0] as HTMLSpanElement
        for (i = 0; i < 6; i++) {
            new BuildingTile(game, area, i)
        }
        //Add the players
        area = this.dom.getElementsByClassName("PLAYER-AREA")[0] as HTMLSpanElement
        new PlayerDOM(game, area, 0)
        new PlayerDOM(game, area, 1)
        //Update the visuals
        this.refresh()

    }
    addRefreshable(refreshable: Refreshable) {
        //Add a refreshable to the refereshables list
        this.refreshables.push(refreshable)
    }
    refresh() {
        //Refresh all the items on the refreshables list
        for (let r of this.refreshables) {
            r.refresh()
        }
    }
}

let inputArea = document.getElementById("input-area") as HTMLDivElement
let ui = new UIHandler(inputArea)
let storage = new LocalStorageHandler("game")
let game = new TzolkinGame(ui, storage)
ui.create(game) //Create the ui based on the game
storage.load(game) //Load the storage based on the game

//Programm added buttons
let godButton = document.getElementById("god-mode") as HTMLSpanElement
godButton.onclick = () => {
    if (game.godMode) {
        game.calculate() //re-calc what you can do
    }
    //Switch to god mode
    game.godMode = !game.godMode
    game.refresh() //refresh the visuals
}
//Undo one move
let undoButton = document.getElementById("undo-button") as HTMLSpanElement
undoButton.onclick = () => {
    storage.undo(game)
}
//Redo one move
let redoButton = document.getElementById("redo-button") as HTMLSpanElement
redoButton.onclick = () => {
    storage.redo(game)
}
