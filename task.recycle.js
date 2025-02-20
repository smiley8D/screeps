const Task = require("task");
const utils = require("utils");
const Hauler = require("body.hauler");

class Recycle extends Task {

    constructor(room=false, wanted=0) {
        super("Recycle", room, room, wanted);
        this.body = new Hauler();
    }

    static getTasks() {
        return [];
    }

    static doTask(creep) {
        let result = ERR_NOT_FOUND;

        // If space available, look for more trash
        let src;
        if (creep.store.getFreeCapacity()) {
            src = utils.findSrc(creep, undefined, {
                containers: false,
                sources: false,
                haulers: false
            });
        }

        if (src) {
            // If trash, pickup
            result = utils.doSrc(creep, src);
            if (result == ERR_NOT_FOUND) {creep.memory.curSrc = null}
        } else {
            // Depo
            result = utils.doDst(creep, utils.findDst(creep));
            if (result == ERR_NOT_FOUND) {creep.memory.curDst = null}
        }

        if (result != OK) {
            creep.say("♻️" + result);
        } else {
            creep.say("♻️");
        }
    }

}

module.exports = Recycle;