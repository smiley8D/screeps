Body = require("body");

class Drudge extends Body {

    constructor() {
        super();
        this.base = [WORK,CARRY,CARRY,MOVE];
        this.add = [WORK];

        this.name = "Drudge";
    }

}

module.exports = Drudge;