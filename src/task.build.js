Task = require("task");
utils = require("utils");

class Build extends Task {

    constructor(room, wanted) {
        super("Build", room, room, wanted);
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];
            
            // Check room owned
            if (!room.controller || !room.controller.my) {continue}

            if (!room.memory.metrics) {continue}
            let total_build = room.memory.metrics.last.build_max - room.memory.metrics.last.build;
            if (total_build > 0) {
                tasks.push(new Build(room.name, Math.max(1,Math.log(total_build / 1000))));
            }
        }
        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            creep.memory.room = creep.memory.task.room;
            creep.say("🔨" + creep.memory.task.room);
            return;
        }

        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            creep.memory.curSrc = null;
            result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
        } else if (creep.store.getUsedCapacity()) {
            // Energy in inventory, build
            creep.memory.curSrc = null;

            // Get structure
            let structure = Game.getObjectById(creep.memory.curTgt);
            if (!structure) {
                structure = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
                if (structure) {
                    creep.memory.curTgt = structure.id;
                } else {
                    creep.memory.curTgt = null;
                }
            }

            // Attempt build
            result = creep.build(structure);
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(structure, {visualizePathStyle: {}}) }
        } else {
            // Empty inventory, refill
            creep.memory.curTgt = null;
            result = utils.doSrc(creep, utils.findSrc(creep, RESOURCE_ENERGY), RESOURCE_ENERGY);
        }

        if (result != OK) {
            creep.say("🔨" + result);
        } else {
            creep.say("🔨");
        };
    }

}

module.exports = Build;