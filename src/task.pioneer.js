const Task = require("task");

const utils = require("utils");

class Pioneer extends Task {

    static emoji = '🏔️';

    constructor(room, wanted) {
        super("Pioneer", source, room, wanted);
        this.max_workers = spots;
        this.emergency = true;
    }

    static getTasks() {
        let tasks = [];

        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            creep.memory.room = creep.memory.task.room;
            creep.say("⛏️" + creep.memory.task.room);
            return;
        }

        let target = Game.getObjectById(creep.memory.task.tgt);
        let resource = RESOURCE_ENERGY;
        if (target.mineralType) { resource = target.mineralType }

        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(resource)) {
            // Inventory contains wrong resource, depo
            result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
        } else if (creep.store.getFreeCapacity() >= 2 * (2 * (creep.memory.size - 1) + 1)) {
            // Space in inventory, mine
            delete creep.memory.curDst;
            result = creep.harvest(target)
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(target, { visualizePathStyle: {} }) }
        } else {
            // Full inventory, depo
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource)) {
                    result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
                    if (result === OK || result === ERR_NOT_IN_RANGE) { break }
                }
            }
        }

        return result;
    }

}

module.exports = Mine;