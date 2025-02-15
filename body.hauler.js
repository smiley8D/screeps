Body = require("body");

class Hauler extends Body {
    base = [CARRY,CARRY,MOVE,CARRY,CARRY,MOVE];
    add = [CARRY,CARRY,MOVE];

    name = "Hauler";

    constructor() {
        super();
    }
}

module.exports = Hauler;