Body = require("body");

class Claimer extends Body {

    constructor() {
        super([CLAIM,MOVE], [CLAIM,MOVE]);
    
        this.name = "Claimer";
    }

}

module.exports = Claimer;