Task = require("task");
utils = require("utils");

class Upgrade extends Task {

    constructor(room, wanted) {
        super("Upgrade", room, wanted, 8);
    }

    static getTasks(room) {
        let energy = room.memory.metrics.last.resources.total[RESOURCE_ENERGY];
        let task = new Upgrade(room.name, Math.log(energy*5))
        return [task];
    }

    static doTask(creep) {
        let controller = Game.rooms[creep.memory.task.tgt].controller;

        let result;
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Energy in inventory, upgrade and move closer
            creep.memory.curSrc = null;
            result = creep.upgradeController(controller);
            if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(controller, {visualizePathStyle: {}})  }
            else if (result == OK) { creep.moveTo(controller, {visualizePathStyle: {}}) }
        } else if (!creep.store.getUsedCapacity()) {
            // Empty inventory, refill
            result = utils.doSrc(creep, utils.findSrc(creep, RESOURCE_ENERGY));
        } else {
            // Non-energy in inventory, depo
            creep.memory.curSrc = null;
            for (let resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(resource)) {
                    result = utils.doDst(creep, utils.findDst(creep, resource), resource);
                }
            }
        }

        creep.say("⬆️" + result);
    }

}

module.exports = Upgrade;