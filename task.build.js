Task = require("task");
utils = require("utils");

class Build extends Task {

    constructor(room, wanted) {
        super("Build", room, wanted);
    }

    static getTasks(room) {
        if (!room.memory.metrics) {return []}
        let total_build = room.memory.metrics.last.build_max - room.memory.metrics.last.build;
        if (total_build > 0) {
            let task = new Build(room.name, Math.max(1,Math.log(total_build / 1000)));
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
            creep.memory.curSrc = null;
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource) && cur_resource != RESOURCE_ENERGY) {
                    result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
                    if (result == OK || result == ERR_NOT_IN_RANGE) { break }
                }
            }
        } else if (creep.store.getUsedCapacity()) {
            // Energy in inventory, build
            creep.memory.curSrc = null;

            // Get structure
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
            result = creep.build(structure);
            if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(structure, {visualizePathStyle: {}}) }
        } else {
            // Empty inventory, refill
            creep.memory.curStructure = null;
            result = utils.doSrc(creep, utils.findSrc(creep, RESOURCE_ENERGY));
        }

        if (result != OK) {
            creep.say("🔨" + result);
        } else {
            creep.say("🔨");
        };
    }

}

module.exports = Build;