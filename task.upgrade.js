Task = require("task");
utils = require("utils");

class Upgrade extends Task {

    constructor(room, wanted) {
        super("Upgrade", room, wanted);
    }

    static getTasks(room) {
        // Find energy available in room
        let energy = 0;
        for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => o.structureType == STRUCTURE_CONTAINER || o.structuredType == STRUCTURE_STORAGE } )) {
            energy += structure.store.getUsedCapacity(RESOURCE_ENERGY);
        }

        let task = new Upgrade(room.name, Math.ceil(Math.log(energy) / Math.log(5)))
        return [task];
    }

    static doTask(creep) {
        creep.say("⬆️");
        let controller = Game.rooms[creep.memory.task.tgt].controller;

        // Fill
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || creep.memory.curFill) {
            utils.fill(creep);
        } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0 && !creep.memory.curFill) {
            // Cannot fill, finish task
            creep.memory.task = null;
            return;
        }

        // Upgrade
        if (!creep.memory.curFill) {
            // Attempt upgrade
            let result = creep.upgradeController(controller)
            creep.moveTo(controller, {visualizePathStyle: {}});
            if (result == ERR_NOT_ENOUGH_ENERGY) {
                // Fill inventory
                creep.memory.curFill = true;
            } else if (result != OK && result != ERR_NOT_IN_RANGE) {
                // Cannot complete task
                creep.memory.task = null;
            }
        }
    }

}

module.exports = Upgrade;