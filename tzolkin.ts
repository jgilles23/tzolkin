console.log("Tzolkin Solver is Running.")

interface Array<T> {
    fill(value: T): Array<T>;
}
//Type for returning if an action was sucessful
//boolean - sucess or not; string - tell me what happened; Object for additional data
type ReturnString = [boolean, string, Object]
//Type for the wheels
type Wheel = "P" | "Y" | "T" | "U" | "C"
type PlayerValueDirect = "score" | "workersTotal" | "workersFree" | "corn" | "skull" | "wood" | "stone" | "gold"
type PlayerValueIndexed = "religion" | "technology"
type InformationValue = "skulls" | "bribe" | "round" | "turn" | "firstPlayer"

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
    skull: number
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
        this.skull = 0
        this.wood = 0
        this.stone = 0
        this.gold = 0
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
    monuments: Array<unknown> //Of monumnets
    buildings: Array<unknown> //Of buildings
    bribe: number //Number of corn on the central wheel
    round: number //Turn number remaining of 27 (index from 1)
    turn: number //Player number who is active
    turnType: "unknown" | "pickup" | "place" //Player turn type
    turnPlacedWorkers: number //Number of workers have have been placed this turn
    firstPlayer: number //Which is the first player
    firstPlayerSpace: boolean //Is the first player space taken
    //Player specific items
    players: Array<Player>

    constructor() {
        //Create a game (assume two player)
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
        this.buildings = []
        this.bribe = 0
        this.round = 1
        this.turn = 0
        this.turnType = "unknown"
        this.turnPlacedWorkers = 0
        this.firstPlayer = 0
        this.firstPlayerSpace = false
        this.players = [
            new Player(0, "IndianRed"),
            new Player(0, "SteelBlue")
        ]
    }

    checkPlaceWorker(playerNumber: number, wheel: Wheel, spaceNumber: number): Return {
        //Takes in a player number, wheel name, and space number
        //godMode: if true ignore resource costs of placement; if false reject on resource cost
        //Output true if placement sucessful; false if placement unsucessful

        //Check if player has enough workers avaliable
        if (playerNumber < 0 || playerNumber >= this.players.length) {
            //Player number out of range
            return new Return(false, "Player number out of range")
        }
        //Place the worker
        if (this[wheel][spaceNumber] !== -1) {
            //Space is already taken
            return new Return(false, "Space already taken")
        }
        //Check if player has free workers avaliable
        if (this.players[playerNumber].workersFree <= 0) {
            //No free workers
            return new Return(false, "Player does not have free workers")
        }
        //Check if enough corn is avaliable for worker placement
        if (this.players[playerNumber].corn < this.turnPlacedWorkers + 1) {
            return new Return(false, "Player does not have enough corn for placement.")
        }
        //Everything checks out, the move is valid
        return new Return(true)
    }

    placeWorker(playerNumber: number, wheel: Wheel, spaceNumber: number, godMode: boolean): Return {
        //Place the worker that is requested by the user
        //Perform differently in god and not god modee
        if (godMode === false) {
            let player = this.players[playerNumber]
            let check = this.checkPlaceWorker(playerNumber, wheel, spaceNumber)
            //If check fails, return the check
            if (check.f === false) {
                return check
            }
            //Deduct corn cost
            player.corn -= this.turnPlacedWorkers + 1
            //Deduct the worker cost
            player.workersFree -= 1
            //Count the placed worker
            this.turnPlacedWorkers += 1
        }
        //Place the worker
        this[wheel][spaceNumber] = playerNumber
        return new Return(true)
    }

    nextWorkerOnSpace(wheel: Wheel, spaceNumber: number): number {
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

    setFirstPlayer(playerNumber: number, godMode:boolean) {
        if (godMode) {
            this.firstPlayer = playerNumber
        }
    }
}

class TileBase {
    game: TzolkinGame
    dom: HTMLSpanElement
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, topText: string = "", bottomText: string = "") {
        this.game = game
        let template = document.getElementById("tile-template") as HTMLSpanElement
        this.dom = template.cloneNode(true) as HTMLSpanElement
        this.setTopText(topText)
        this.setBottomText(bottomText)
        //Add the dom to the tree
        parentDom.appendChild(this.dom)
    }
    setTopText(text: string) {
        let topDom = this.dom.getElementsByClassName("tile-top-text")[0] as HTMLSpanElement
        topDom.textContent = text
    }
    setBottomText(text: string) {
        let bottomDom = this.dom.getElementsByClassName("tile-bottom-text")[0] as HTMLSpanElement
        bottomDom.textContent = text
    }
}

class TileBaseBottomText extends TileBase {
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, bottomText: string = "") {
        super(game, parentDom, "", bottomText)
        this.dom.getElementsByClassName("tile-top-text")[0].remove()
        this.dom.getElementsByTagName("br")[0].remove()
    }
}

class WheelSpace extends TileBase {
    wheel: Wheel
    spaceNumber: number

    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, wheel: Wheel, spaceNumber: number, bottomText: string = "") {
        super(game, parentDom, wheel + spaceNumber.toString(), bottomText)
        this.wheel = wheel
        this.spaceNumber = spaceNumber
        //Onclick cycle to the next player for this space, -1 after all players;
        //In god mode so that resource values are not changed
        this.dom.onclick = x => {
            let nextPlayerNumber = this.game.nextWorkerOnSpace(this.wheel, this.spaceNumber)
            this.game.placeWorker(nextPlayerNumber, this.wheel, this.spaceNumber, true)
            this.refresh()
        }
    }

    refresh() {
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
    type: "w" | "c" //wood or corn resource tiles
    spaceNumber: number
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, spaceNumber: number, type: "w" | "c", visible: boolean) {
        //Create resource tiles at spacenumber of type wood or corn; make tile visible with true
        super(game, parentDom, "")
        this.type = type
        this.spaceNumber = spaceNumber
        //Define onClick
        this.dom.onclick = x => {
            this.game.pickupTile(this.spaceNumber, this.type, true)
            this.refresh()
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
        this.refresh()
    }
    refresh() {
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
    spaceNumber: number
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, spaceNumber: number, visible: boolean) {
        //Shows if the spot has been taken by the skull already
        super(game, parentDom, "")
        this.spaceNumber = spaceNumber
        //Set onclick action
        this.dom.onclick = x => {
            this.game.setSkull(this.spaceNumber, true)
            this.refresh()
        }
        //Set the background color
        this.dom.classList.add("skull-color")
        //Make invisible and space taking in appropriate
        if (visible === false) {
            this.dom.style.visibility = "hidden"
        }
        this.refresh()
    }
    refresh() {
        if (this.game.CSkull[this.spaceNumber] === true) {
            this.setBottomText("k")
        } else {
            this.setBottomText("-")
        }
    }
}

class ResourcesSpace extends TileBase {
    playerNumber: number
    resource: PlayerValueDirect

    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, playerNumber: number,
        resource: PlayerValueDirect, promptString: string, bottomText: string, className: string) {
        //Show all the resources owned by a player
        //Inputs: bottomText-resource type, resouce:string of resource type, className:CSS class name, promptString: resource name as presented to player
        super(game, parentDom, "", bottomText)
        this.playerNumber = playerNumber
        this.resource = resource
        //Change appearance
        this.dom.classList.add(className)
        //onclick
        this.dom.onclick = x => {
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
        this.refresh()
    }
    refresh() {
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
            topText = "R" + subType.toString()
        } else {
            topText = "T" + subType.toString()
        }
        //Call super for the function
        super(game, parentDom, topText, "")
        this.playerNumber = playerNumber
        this.type = type
        this.subType = subType
        this.bottomTextArray = bottomTextArray
        //Make the color
        this.dom.classList.add(className)
        //Set click function
        this.dom.onclick = x => {
            if (this.type === "religion") {
                this.game.stepReligion(this.playerNumber, this.subType, 1, true)
            } else {
                this.game.stepTechnology(this.playerNumber, this.subType, true)
            }
            this.refresh()
        }
        //Show the visuals
        this.refresh()
    }
    refresh() {
        if (this.type === "religion") {
            this.setBottomText(this.bottomTextArray[this.game.players[this.playerNumber].religion[this.subType]])
        } else {
            this.setBottomText(this.bottomTextArray[this.game.players[this.playerNumber].technology[this.subType]])
        }
    }
}

class InfoSpace extends TileBase{
    type: InformationValue
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement, type: InformationValue, bottomText: string = "") {
        super(game, parentDom, "", bottomText)
        this.type = type
        //Set onclick
        this.dom.onclick = x => {
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
        //Show visuals
        this.refresh()
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
    setValue (value: number) {
        this.game[this.type] = value
    }
    refresh() {
        this.setTopText(this.value().toString())
    }
}

class FirstPlayerSpace extends TileBase {
    constructor(game: TzolkinGame, parentDom: HTMLSpanElement) {
        super(game, parentDom, "S", "")
        //onclick
        this.dom.onclick = x => {
            let newFirstPlayerSpace: number = this.game.firstPlayerSpace + 1
            if (newFirstPlayerSpace === this.game.players.length) {
                newFirstPlayerSpace = -1
            }
            this.game.setFirstPlayer(newFirstPlayerSpace, true)
            this.refresh()
        }
        //first refresh
        this.refresh()
    }
    refresh() {
        if (this.game.firstPlayer === -1) {
            this.dom.style.backgroundColor = "white"
        } else {
            this.dom.style.backgroundColor = this.game.players[this.game.firstPlayer].color
        }
    }
}


let game = new TzolkinGame()

let area
let rewards
let i
//Build general information 
area = document.getElementById("general-area") as HTMLSpanElement
new InfoSpace(game, area, "round", "of 27 rounds")
new InfoSpace(game, area, "firstPlayer", "first player")
new InfoSpace(game, area, "turn", "turn")
new InfoSpace(game, area, "skulls", "skulls").dom.classList.add("skull-color")
new InfoSpace(game, area, "bribe", "bribe")
let firstPlayerSpace = document.getElementById("first-player-name") as HTMLDivElement
firstPlayerSpace.style.display = "block"
area.appendChild(firstPlayerSpace)
new FirstPlayerSpace(game, area)
//Build wheel P
area = document.getElementById("P-wheel-input") as HTMLSpanElement
rewards = ["", "3c", "4c", "5c/2w", "7c/3w", "9c/4w", "~", "~"]
let PWoodVisibility = [false, false, false, true, true, true, false, false]
let PCornVisibility = [false, false, true, true, true, true, false, false]
for (i = 0; i <= 7; i++) {
    new WheelSpace(game, area, "P", i, rewards[i])
    new ResourceTile(game, area, i, "c", PCornVisibility[i])
    new ResourceTile(game, area, i, "w", PWoodVisibility[i])
}
//Build wheel Y
area = document.getElementById("Y-wheel-input") as HTMLSpanElement
rewards = ["", "w", "s 1c", "g 2c", "k", "g s 2c", "~", "~"]
for (i = 0; i <= 7; i++) {
    new WheelSpace(game, area, "Y", i, rewards[i])
}
//Build Wheel T
area = document.getElementById("T-wheel-input") as HTMLSpanElement
rewards = ["", ">", "B", ">>", "2B/M", "x:2R", "~", "~"]
for (i = 0; i <= 7; i++) {
    new WheelSpace(game, area, "T", i, rewards[i])
}
//Build Wheel U
area = document.getElementById("U-wheel-input") as HTMLSpanElement
rewards = ["", "3c:R", "trade", "wkr", "2c:x B", "1c:any", "~", "~"]
for (i = 0; i <= 7; i++) {
    new WheelSpace(game, area, "U", i, rewards[i])
}
//Build Wheel C
area = document.getElementById("C-wheel-input") as HTMLSpanElement
rewards = ["", "4p R0", "5p R0", "6p R0", "7p R1", "8p R1", "8p R1 x", "9p R2", "11p R2 x", "13p R2 x", "~"]
let CSkullVisible = [false, true, true, true, true, true, true, true, true, true, false]
for (i = 0; i <= 10; i++) {
    new WheelSpace(game, area, "C", i, rewards[i])
    new SkullSpace(game, area, i, CSkullVisible[i])
}

//Setup player areas
area = document.getElementById("player-0-resources") as HTMLSpanElement
new ResourcesSpace(game, area, 0, "score", "score", "points", "score-color")
new ResourcesSpace(game, area, 0, "workersFree", "free workers", "workers", "worker-color")
new ResourcesSpace(game, area, 0, "corn", "corn", "corn", "corn-color")
new ResourcesSpace(game, area, 0, "skull", "skulls", "skulls", "skull-color")
new ResourcesSpace(game, area, 0, "wood", "wood", "wood", "wood-color")
new ResourcesSpace(game, area, 0, "stone", "stone", "stone", "stone-color")
new ResourcesSpace(game, area, 0, "gold", "gold", "gold", "gold-color")
//Setup religion and technology area
area = document.getElementById("player-0-religion-technology") as HTMLSpanElement
new TrackSpace(game, area, 0, "religion", 0, 
["-1p", "0p", "2p s", "4p", "6p s", "7p", "8p *"], "religion-0-color")
new TrackSpace(game, area, 0, "religion", 1, 
["-2p", "0p", "1p", "2p g", "4p", "6p g", "9p", "12p", "13p *"], "religion-1-color")
new TrackSpace(game, area, 0, "religion", 2, 
["-1p", "0p", "1p w", "3p", "5p w", "7p k", "9p", "10p *"], "religion-2-color")
new TrackSpace(game, area, 0, "technology", 0, 
["", "+1/0c", "+1/1c tile", "+3/1c tile","R"], "none")
new TrackSpace(game, area, 0, "technology", 1, 
["", "+w", "+w/s", "+w/s/g","2x"], "none")
new TrackSpace(game, area, 0, "technology", 2, 
["", "B: 1c", "B: 1c 2p", "B: 1c 2p -x","3p"], "none")
new TrackSpace(game, area, 0, "technology", 3, 
["", ">C", ">C x:R", ">C x:R +k","k"], "none")