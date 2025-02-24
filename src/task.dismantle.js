Task = require("task");
utils = require("utils");

class Dismantle extends Task {

    static emoji() {
        return '💣';
    }

    constructor(flag, wanted) {
        super("Dismantle", flag.name, flag.pos.roomName, wanted);
        this.details = flag.name;
    }

    static getTasks() {
        let tasks = []

        // Iterate through dismantle flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];
            if (flag.color != COLOR_ORANGE || flag.secondaryColor != COLOR_ORANGE) {continue}
            if (flag.room) {
                // Can get detailed information
                let structures = flag.pos.lookFor(LOOK_STRUCTURES);
                if (structures.length === 0) {
                    // Site no longer exists, remove flag
                    flag.remove();
                } else {
                    // Create task
                    tasks.push(new Dismantle(flag, Math.max(1,Math.log(structures[0].hits))))
                }
            } else {
                // Send a basic worker
                tasks.push(new Dismantle(flag, 1))
            }
        }

        return tasks;
    }

    static doTask(creep) {
        let flag = Game.flags[creep.memory.task.tgt];
        if (!flag) { return ERR_NOT_FOUND }
        let structures = flag.pos.lookFor(LOOK_STRUCTURES);
        if (structures.length === 0) {
            flag.remove();
            return OK;
        }
        let structure = structures[0];

        let result = ERR_NOT_FOUND;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            delete creep.memory.curSrc;
            result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
        } else if (creep.store.getFreeCapacity()) {
            // Move to room
            if (creep.room.name != creep.memory.task.room) {
                creep.memory.room = creep.memory.task.room;
                return ERR_NOT_IN_RANGE;
            }
    
            // Space in inventory, dismantle
            delete creep.memory.curDst;

            // Attempt dismantle
            result = creep.dismantle(structure);
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(structure, { maxRooms: 1, visualizePathStyle: {}}) }
        } else {
            // Full inventory, depo
            result = utils.doDst(creep, utils.findSrc(creep, RESOURCE_ENERGY), RESOURCE_ENERGY);
        }

        return result;
    }

}

module.exports = Dismantle;