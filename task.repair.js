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
            let task = new Repair(room.name, Math.max(1,Math.log(total_dmg / 1000)));
            return [task];
        }
        return [];
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.tgt) {
            creep.moveTo(Game.rooms[creep.memory.task.tgt], {visualizePathStyle: {}});
            return;
        }

        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            creep.memory.curStructure = null;
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource) && cur_resource != RESOURCE_ENERGY) {
                    result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
                    if (result == OK || result == ERR_NOT_IN_RANGE) { break }
                }
            }
        } else if (creep.store.getUsedCapacity()) {
            // Energy in inventory, repair
            creep.memory.curSrc = null;

            // Get structure
            let structure = Game.getObjectById(creep.memory.curStructure);
            if (!structure || structure.hitsMax == structure.hits) {
                // Mixed priority of damage & distance
                structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter:(o) => (o.owner == null || o.my) && o.hits  < 100});
                if (!structure) { structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter:(o) => (o.owner == null || o.my) && o.hits / o.hitsMax < 0.1}) }
                if (!structure) { structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter:(o) => (o.owner == null || o.my) && o.hits / o.hitsMax < 0.5}) }
                if (!structure) { structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter:(o) => (o.owner == null || o.my) && o.hits < o.hitsMax}) }
                if (structure) {
                    creep.memory.curStructure = structure.id;
                } else {
                    creep.memory.curStructure = null;
                }
            }

            // Attempt repair
            result = creep.repair(structure);
            if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(structure, {visualizePathStyle: {}}) }
        } else {
            // Empty inventory, refill
            creep.memory.curStructure = null;
            result = utils.doSrc(creep, utils.findSrc(creep, RESOURCE_ENERGY));
        }

        creep.say("🔧" + result);
    }

}

module.exports = Repair;