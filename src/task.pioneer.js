Task = require("task");
utils = require("utils");

const Build = require("task.build");
const Repair = require("task.repair");
const Stock = require("task.stock");
const Garbage = require("task.garbage");

class Pioneer extends Task {

    static emoji() {
        return '🏔️';
    }

    constructor(room, wanted) {
        super("Pioneer", room, room, wanted);
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room not other-owned
            if (room.controller && room.controller.owner && !room.controller.my) {continue}

            // Check work to be done and specialized workers not available
            if (!room.memory.metrics) {continue}
            let metrics = room.memory.metrics;
            if (((metrics.last.build > 0 || (metrics.last.resources[RESOURCE_ENERGY] && metrics.last.resources[RESOURCE_ENERGY].refill > 0)) && room.energyAvailable <= 300) &&
                (!metrics.last.resources[RESOURCE_ENERGY] || metrics.last.resources[RESOURCE_ENERGY].free <= 100 || !room.find(FIND_MY_CREEPS).some((c) => c.memory.task && c.memory.task.name === "Stock"))) {
                tasks.push(new Pioneer(room.name, Math.max(1,Math.max((room.energyCapacityAvailable - room.energyAvailable)/50, Math.log(metrics.last.build), Math.log(metrics.last.damage)))));
            }
        }
        return tasks;
    }

    static doTask(creep) {
        let result = ERR_NOT_FOUND;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            delete creep.memory.curSrc;
            result = utils.doDst(creep, utils.findDst(creep));
        } else if (!creep.store.getUsedCapacity() || creep.memory.curSrc) {
            // Empty inventory, refill
            delete creep.memory.curTgt;
            delete creep.memory.curDst;
            result = utils.doSrc(creep, utils.findSrc(creep, RESOURCE_ENERGY, {sources: true}), RESOURCE_ENERGY);
            if (!creep.store.getFreeCapacity()) { delete creep.memory.curSrc }
        } else {
            // Move to room
            if (creep.room.name != creep.memory.task.room) {
                delete creep.memory.curTgt;
                delete creep.memory.curDst;
                creep.memory.room = creep.memory.task.room;
                return ERR_NOT_IN_RANGE;
            }

            // Do things
            delete creep.memory.curSrc;
            if (creep.room.memory.metrics.last.resources[RESOURCE_ENERGY] && creep.room.memory.metrics.last.resources[RESOURCE_ENERGY].refill) {
                // Do refill
                let dst = utils.findDst(creep, RESOURCE_ENERGY, {containers: false, haulers: false, room_limit: 0});
                result = utils.doDst(creep, dst, RESOURCE_ENERGY);
            } else if (creep.room.memory.metrics.last.build) {
                // Do build
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
            }
        }

        return result;
    }

}

module.exports = Pioneer;