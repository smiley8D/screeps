Body = require("body");

class Hauler extends Body {

    constructor() {
        super();
        this.base = [CARRY,CARRY,MOVE];
        this.add = [CARRY,CARRY,MOVE];
    
        this.name = "Hauler";
    }

}

module.exports = Hauler;