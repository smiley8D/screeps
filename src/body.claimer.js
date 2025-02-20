Body = require("body");

class Claimer extends Body {

    constructor() {
        super();
        this.base = [CLAIM,MOVE];
        this.add = [CLAIM,MOVE];
    
        this.name = "Claimer";
    }

}

module.exports = Claimer;