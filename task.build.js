Task = require("task");
utils = require("utils");

class Build extends Task {

    constructor(room, wanted) {
        super("Build", room, wanted);
    }

    static getTasks(room) {
        let total_build = 0;
        for (let structure of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            total_build += 1 + structure.progressTotal - structure.progress;
        }
        if (total_build > 0) {
            let task = new Build(room.name, Math.max(1, Math.ceil(Math.log(total_dmg / 10000))));
            return [task];
        }
        return [];
    }

    static doTask(creep) {
        creep.say("🔨");

        // Move to room
        if (creep.room.name != creep.memory.task.tgt) {
            creep.moveTo(Game.rooms[creep.memory.task.tgt], {visualizePathStyle: {}});
            return;
        }

        // Fill
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || creep.memory.curFill) {
            utils.fill(creep);
            creep.memory.curRepair = null;
        } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0 && !creep.memory.curFill) {
            // Cannot fill, finish task
            creep.memory.task = null;
            return;
        }

        // Stock spawner
        if (!creep.memory.curFill) {
            // Get closest construction site
            let structure = Game.getObjectById(creep.memory.curStructure);
            if (!structure) {
                structure = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
                if (structure) {
                    creep.memory.curStructure = structure.id;
                } else {
                    creep.memory.curStructure = null;
                }
            }
    
            // Attempt build
            let result = creep.build(structure);
            creep.moveTo(structure, {visualizePathStyle: {}});
            if (result == ERR_NOT_ENOUGH_ENERGY) {
                // Fill inventory
                creep.memory.curFill = true;
            } else if (result == ERR_NO_BODYPART) {
                // Cannot complete task
                creep.memory.task = null;
            } else {
                // Find new site
                creep.memory.curStructure = null;
            }
        }
    }

}

module.exports = Build;