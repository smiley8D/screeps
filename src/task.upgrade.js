const Task = require("task");
const utils = require("utils");
const config = require("config");
const Drudge = require('body.drudge');

class Upgrade extends Task {

    static emoji() {
        return '⬆️';
    }

    constructor(room, wanted) {
        super("Upgrade", room, room, wanted);
        // TEMP DISABLE WHILE LOGI DOWN
        // this.body = new Drudge();
    }

    static getTasks() {
        let tasks = [];
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room owned
            if (!room.controller || !room.controller.my) {continue}

            if (!room.memory.metrics) {continue}
            if (!room.controller.my) {continue}
            if (!room.memory.metrics.last_mov.resources[RESOURCE_ENERGY]) {continue}

            // Create tasks
            tasks.push(new Upgrade(room.name, 10*(room.memory.metrics.last_mov.resources[RESOURCE_ENERGY].free/100000)));
        }
        return tasks;
    }

    static doTask(creep) {
        let controller = Game.rooms[creep.memory.task.tgt].controller;

        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            delete creep.memory.curSrc;
            result = utils.doDst(creep, utils.findDst(creep));
        } else if (creep.store.getUsedCapacity()) {
            // Move to room
            if (creep.room.name != creep.memory.task.room) {
                creep.memory.room = creep.memory.task.room;
                return ERR_NOT_IN_RANGE;
            }
    
            // Energy in inventory, upgrade and move closer
            delete creep.memory.curSrc;
            result = creep.upgradeController(controller);
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(controller, { maxRooms: 1, visualizePathStyle: {}})  }
        } else {
            // Empty inventory, refill
            let src = utils.findSrc(creep, RESOURCE_ENERGY, {limit: 3});
            if (!src) {
                result = creep.moveTo(controller, {visualizePathStyle: {}});
            } else {
                result = utils.doSrc(creep, src, RESOURCE_ENERGY);
            }
        }

        return result;
    }

}

module.exports = Upgrade;