Task = require("task");
utils = require("utils");

class Repair extends Task {

    constructor(room, wanted) {
        super("Repair", room, wanted);
    }

    static getTasks(room) {
        let total_dmg = 0;
        for (let structure of room.find(FIND_STRUCTURES, {filter:(o) => (o.owner == null || o.my) && o.hits / o.hitsMax < 0.9 })) {
            total_dmg += structure.hitsMax - structure.hits;
        }
        if (total_dmg > 0) {
            let task = new Repair(room.name, Math.max(1, Math.ceil(Math.log(total_dmg / 10000))));
            return [task];
        }
        return [];
    }

    static doTask(creep) {
        creep.say("🔧");

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
            // Get closest damaged site
            let structure = Game.getObjectById(creep.memory.curStructure);
            if (!structure || structure.hits / structure.hitsMax > 0.95) {
                structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter:(o) => (o.owner == null || o.my) && o.hits / o.hitsMax < 0.9 });
                if (structure) {
                    creep.memory.curStructure = structure.id;
                } else {
                    creep.memory.curStructure = null;
                }
            }
    
            // Attempt repair
            let result = creep.repair(structure);
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

module.exports = Repair;