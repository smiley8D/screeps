Task = require("task");
utils = require("utils");

class Recycle extends Task {

    constructor(kill=false) {
        super("Recycle");
        this.tgt = kill;
    }

    static getTasks(room) {
        return [];
    }

    static doTask(creep) {
        creep.say("♻️");
        // Cleanup trash
        utils.fill(creep, false, true);
        if (!creep.memory.curFill) {

            // Depo
            utils.depo(creep);
            if (!creep.memory.curDepo) {

                let spawner
                if (creep.memory.task.tgt) {
                    // Find spawner if recyclable
                    spawner = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
                }

                if (spawner) {
                    // Recycle
                    if (spawner.recycleCreep(creep) == ERR_NOT_IN_RANGE) { creep.moveTo(spawner, {visualizePathStyle: {stroke: "#dc0000"}})}
                } else {
                    // Move to graveyard
                    let graveyard = creep.pos.findClosestByRange(FIND_FLAGS, { filter: (f) => f.color == COLOR_GREY });
                    if (graveyard) {
                        creep.moveTo(graveyard, {visualizePathStyle: {}});
                    }
                }
            }
        }
    }

}

module.exports = Recycle;