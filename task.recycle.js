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
        // Cleanup trash
        let recycling = true;
        utils.fill(creep, false, true, true);
        if (!creep.memory.curFill) {

            if (creep.store.getUsedCapacity()) {
                // Depo
                utils.depo(creep);
            } else {
                // Find spawner if recyclable
                let spawner;
                recycling = false;
                if (creep.memory.task.tgt) {
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

        if (recycling) {
            creep.say("♻️");
        }
    }

}

module.exports = Recycle;