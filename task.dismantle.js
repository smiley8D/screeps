Task = require("task");
utils = require("utils");

class Dismantle extends Task {

    constructor(flag, wanted) {
        super("Dismantle", flag.name, flag.pos.roomName, wanted);
    }

    static getTasks() {
        let tasks = []

        // Iterate through dismantle flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];
            if (flag.color != COLOR_ORANGE) {continue}
            if (flag.room) {
                // Can get detailed information
                let structures = flag.pos.lookFor(LOOK_STRUCTURES);
                if (structures.length == 0) {
                    // Site no longer exists, remove flag
                    flag.remove();
                } else {
                    // Create task
                    tasks.push(new Dismantle(flag, structures[0].hits))
                }
            } else {
                // Send a basic worker
                tasks.push(new Dismantle(flag, 1))
            }
        }

        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            let result = creep.moveTo(new RoomPosition(25,25,creep.memory.task.room), {visualizePathStyle: {}})
            if (result != OK) {
                creep.say("💣" + result);
            } else {
                creep.say("💣");
            }
            return;
        }

        let flag = Game.flags[creep.memory.task.tgt];
        let structures = flag.pos.lookFor(LOOK_STRUCTURES);
        let structure = null;
        if (structures.length > 0) {structure = structures[0]}

        let result = ERR_NOT_FOUND;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            creep.memory.curSrc = null;
            result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
        } else if (creep.store.getFreeCapacity()) {
            // Space in inventory, dismantle
            creep.memory.curDst = null;

            // Attempt dismantle
            result = creep.dismantle(structure);
            if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(structure, {visualizePathStyle: {}}) }
        } else {
            // Full inventory, depo
            result = utils.doDst(creep, utils.findSrc(creep, RESOURCE_ENERGY), RESOURCE_ENERGY);
        }

        if (result != OK) {
            creep.say("💣" + result);
        } else {
            creep.say("💣");
        };
    }

}

module.exports = Dismantle;