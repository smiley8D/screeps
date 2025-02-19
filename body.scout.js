Body = require("body");

class Scout extends Body {

    constructor() {
        super();
        this.base = [MOVE];
        this.add = [MOVE];

        this.name = "Scout";
    }

}

module.exports = Scout;