Body = require("body");

class Hauler extends Body {

    constructor() {
        super();
        this.base = [CARRY,MOVE];
        this.add = [CARRY,MOVE];
    
        this.name = "Hauler";
    }

}

module.exports = Hauler;