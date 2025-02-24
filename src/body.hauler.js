Body = require("body");

class Hauler extends Body {

    constructor() {
        super([CARRY,CARRY,MOVE], [CARRY,CARRY,MOVE]);
    
        this.name = "Hauler";
    }

}

module.exports = Hauler;