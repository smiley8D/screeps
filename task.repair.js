utils = require("utils");
config = require("config");

Task = require("task");

class Repair extends Task {

    constructor(room, wanted) {
        super("Repair", room, wanted);
    }

    static getTasks(room) {
        let total_dmg = room.memory.metrics.last.hits_max - room.memory.metrics.last.hits;
        if (total_dmg > 0) {
            let task = new Repair(room.name, Math.max(0,Math.round(Math.log(total_dmg))));
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

        // Repair
        if (!creep.memory.curFill) {
            // Get structure
            let structure = Game.getObjectById(creep.memory.curStructure);
            if (!structure || structure.hitsMax == structure.hits) {
                // Mixed priority of damage & distance
                structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter:(o) => (o.owner == null || o.my) && o.hits / o.hitsMax < 0.1});
                structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter:(o) => (o.owner == null || o.my) && o.hits / o.hitsMax < 0.5});
                if (!structure) { structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter:(o) => (o.owner == null || o.my) && o.hits < o.hitsMax}) }
                if (structure) {
                    creep.memory.curStructure = structure.id;
                } else {
                    creep.memory.curStructure = null;
                }
            }

            // Attempt repair
            let result = creep.repair(structure);
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(structure, {visualizePathStyle: {}});
            } else if (result == ERR_NOT_ENOUGH_ENERGY) {
                // Fill inventory
                creep.memory.curFill = true;
            } else if (result == ERR_NO_BODYPART) {
                // Cannot complete task
                creep.memory.task = null;
            } else if (result != OK) {
                // Find new site
                creep.memory.curStructure = null;
            }
        }
    }

}

module.exports = Repair;