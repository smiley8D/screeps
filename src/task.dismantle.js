Task = require("task");
utils = require("utils");

class Dismantle extends Task {

    static emoji() {
        return '💣';
    }

    constructor(room, wanted) {
        super("Dismantle", room, room, wanted);
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room not other-owned
            if (room.controller && room.controller.owner && !room.controller.my) {continue}

            if (!room.memory.metrics) {continue}
            let dismantle = room.memory.metrics.last.dismantle;
            if (dismantle > 0) {
                tasks.push(new Dismantle(room.name, Math.max(1,Math.log(dismantle / 100))));
            }
        }
        return tasks;
    }

    static doTask(creep) {
        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            delete creep.memory.curTgt;
            result = utils.doDst(creep, utils.findDst(creep));
        } else if (creep.store.getFreeCapacity()) {
            // Move to room
            if (creep.room.name != creep.memory.task.room) {
                creep.memory.room = creep.memory.task.room;
                return ERR_NOT_IN_RANGE;
            }
    
            // Space in inventory, dismantle
            delete creep.memory.curDst;

            // Get structure
            let structure = Game.getObjectById(creep.memory.curTgt);
            if (!structure || !structure.pos.lookFor(LOOK_FLAGS).some((f) => f.color === COLOR_ORANGE && f.secondaryColor === COLOR_ORANGE)) {
                structure = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter:(o) => o.pos.lookFor(LOOK_FLAGS).some((f) => f.color === COLOR_ORANGE && f.secondaryColor === COLOR_ORANGE)});
                if (structure) {
                    creep.memory.curTgt = structure.id;
                } else {
                    delete creep.memory.curTgt;
                }
            }

            // Attempt dismantle
            result = creep.dismantle(structure);
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(structure, { maxRooms: 1, visualizePathStyle: {}}) }
        } else {
            // Full inventory, depo
            delete creep.memory.curTgt;
            result = utils.doDst(creep, utils.findSrc(creep, RESOURCE_ENERGY), RESOURCE_ENERGY);
        }

        return result;
    }

}

module.exports = Dismantle;