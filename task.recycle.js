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
        let result;
        if (creep.store.getUsedCapacity()) {
            // Resources in inventory, depo
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource)) {
                    result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
                    if (result == OK || result == ERR_NOT_IN_RANGE) { break }
                }
            }
        } else {
            // Empty inventory, find spawner if recyclable
            let spawner;
            if (creep.memory.task.tgt) {
                spawner = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            }

            if (spawner) {
                // Recycle
                result = spawner.recycleCreep(creep);
                if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(spawner, {visualizePathStyle: {stroke: "#dc0000"}})}
            } else {
                // Move to graveyard
                let graveyard = creep.pos.findClosestByRange(FIND_FLAGS, { filter: (f) => f.color == COLOR_GREY && f.pos.lookFor(LOOK_STRUCTURES).length == 0});
                if (graveyard) {
                    result = creep.moveTo(graveyard, {visualizePathStyle: {}});
                }
            }
        }

        if (creep.memory.task.tgt) {
            creep.say("♻️" + result);
        }
    }

}

module.exports = Recycle;