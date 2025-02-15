Body = require("body");

class Miner extends Body {

    constructor() {
        super();
        this.base = [WORK,WORK,CARRY,MOVE];
        this.add = [WORK];
        this.limit = 4;
    
        this.name = "Miner";
    }

}

module.exports = Miner;