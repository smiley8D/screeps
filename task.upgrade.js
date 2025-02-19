const Task = require("task");
const utils = require("utils");
const config = require("config");

class Upgrade extends Task {

    constructor(room, wanted) {
        super("Upgrade", room, room, wanted);
    }

    static getTasks() {
        let tasks = [];
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room owned
            if (!room.controller || !room.controller.my) {continue}

            if (!room.memory.metrics) {continue}
            if (!room.controller.my) {continue}
            tasks.push(new Upgrade(room.name, Math.log(room.memory.metrics.last_mov.resources.free[RESOURCE_ENERGY]) / config.PART_MULT));
        }
        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            let result = creep.moveTo(new RoomPosition(25,25,creep.memory.task.room), {visualizePathStyle: {}})
            if (result != OK) {
                creep.say("⬆️" + resource[0] + result);
            } else {
                creep.say("⬆️" + resource[0]);
            }
            return;
        }

        let controller = Game.rooms[creep.memory.task.tgt].controller;

        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            creep.memory.curSrc = null;
            result = utils.doDst(creep, utils.findDst(creep));
        } else if (creep.store.getUsedCapacity()) {
            // Energy in inventory, upgrade and move closer
            creep.memory.curSrc = null;
            result = creep.upgradeController(controller);
            if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(controller, {visualizePathStyle: {}})  }
            else if (result == OK) { creep.moveTo(controller, {visualizePathStyle: {}}) }
        } else {
            // Empty inventory, refill
            result = utils.doSrc(creep, utils.findSrc(creep, RESOURCE_ENERGY), RESOURCE_ENERGY);
        }

        if (result != OK) {
            creep.say("⬆️" + result);
        } else {
            creep.say("⬆️");
        };
    }

}

module.exports = Upgrade;