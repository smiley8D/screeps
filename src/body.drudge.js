Body = require("body");

class Drudge extends Body {

    constructor() {
        super([WORK,CARRY,CARRY,MOVE], [WORK]);

        this.name = "Drudge";
        this.weight = 2;
    }

}

module.exports = Drudge;