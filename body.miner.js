Body = require("body");

class Miner extends Body {

    constructor() {
        super();
        this.base = [WORK,CARRY,MOVE];
        this.add = [WORK,WORK];
    
        this.name = "Miner";
    }

}

module.exports = Miner;