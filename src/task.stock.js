config = require("config");

Task = require("task");
Hauler = require("body.hauler");

class Stock extends Task {

    static emoji() {
        return '📦';
    }

    constructor(room, wanted) {
        super("Stock", room, room, wanted);
        this.body = new Hauler();
        this.max_workers = 3;
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room not other-owned
            if (room.controller && room.controller.owner && !room.controller.my) {continue}

            // Check for refills
            if (!room.memory.metrics) {continue}
            let metrics = room.memory.metrics;
            if (metrics.last.resources[RESOURCE_ENERGY] && metrics.last.resources[RESOURCE_ENERGY].refill > 0) {
                tasks.push(new Stock(room.name, Math.max(1, (Math.log(room.energyCapacityAvailable) / 2), Math.log(2 * metrics.last.resources[RESOURCE_ENERGY].refill))));
            }
        }
        return tasks;
    }

    static doTask(creep) {
        let result = ERR_NOT_FOUND;
        if (!creep.store.getFreeCapacity()) { delete creep.memory.curSrc }
        if (!creep.store.getUsedCapacity()) { delete creep.memory.curDst }
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            delete creep.memory.curSrc;
            result = utils.doDst(creep, utils.findDst(creep, undefined, {haulers: false}));
        } else if (!creep.store.getFreeCapacity() || creep.memory.curDst) {
            // Move to room
            if (creep.room.name != creep.memory.task.room) {
                creep.memory.room = creep.memory.task.room;
                return ERR_NOT_IN_RANGE;
            }

            // Refill
            let dst = utils.findDst(creep, RESOURCE_ENERGY, {containers: false, haulers: false, room_limit: 0});
            result = utils.doDst(creep, dst, RESOURCE_ENERGY);
        } else {
            // Empty inventory, refill
            let src = utils.findSrc(creep, RESOURCE_ENERGY, {haulers: false})
            result = utils.doSrc(creep, src, RESOURCE_ENERGY);
        }

        return result;
    }

}

module.exports = Stock;