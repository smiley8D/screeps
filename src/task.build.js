Task = require("task");
utils = require("utils");

class Build extends Task {

    static emoji() {
        return '🔨';
    }

    constructor(room, wanted) {
        super("Build", room, room, wanted);
        this.max_workers = 2;
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room not other-owned
            if (room.controller && room.controller.owner && !room.controller.my) {continue}

            if (!room.memory.metrics) {continue}
            if (room.memory.metrics.last.build > 0) {
                tasks.push(new Build(room.name, Math.max(1,Math.log(room.memory.metrics.last.build))));
            }
        }
        return tasks;
    }

    static doTask(creep) {
        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            delete creep.memory.curSrc;
            result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
        } else if (creep.store.getUsedCapacity()) {
            // Move to room
            if (creep.room.name != creep.memory.task.room) {
                creep.memory.room = creep.memory.task.room;
                return ERR_NOT_IN_RANGE;
            }
    
            // Energy in inventory, build
            delete creep.memory.curSrc;

            // Get structure
            let structure = Game.getObjectById(creep.memory.curTgt);
            if (!structure) {
                structure = creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES);
                if (structure) {
                    creep.memory.curTgt = structure.id;
                } else {
                    delete creep.memory.curTgt;
                }
            }

            // Attempt build
            result = creep.build(structure);
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(structure, { maxRooms: 1, visualizePathStyle: {}}) }
        } else {
            // Empty inventory, refill
            delete creep.memory.curTgt;
            result = utils.doSrc(creep, utils.findSrc(creep, RESOURCE_ENERGY), RESOURCE_ENERGY);
        }

        return result;
    }

}

module.exports = Build;