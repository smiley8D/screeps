config = require("config");

Task = require("task");
Hauler = require("body.hauler");

class Stock extends Task {

    static emoji = '📦';

    constructor(room, wanted, resource) {
        super("Stock", room + ":" + resource, room, wanted);
        this.body = new Hauler();
        this.resource = resource;
        this.detail = resource[0];
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room owned
            if (!room.controller || !room.controller.my) {continue}

            if (!room.memory.metrics) {continue}
            for (let resource in room.memory.metrics.last.resources) {
                if (room.memory.metrics.last.resources[resource].imbalance) {
                    let parts = Math.max(1, 10*(room.memory.metrics.last.resources[resource].imbalance/1000));
                    tasks.push(new Stock(room.name, parts, resource));
                }
            }
        }
        return tasks;
    }

    // Compress tasks for memory storage
    compress() {
        return {
            id: this.id,
            name: this.name,
            tgt: this.tgt,
            room: this.room,
            detail: this.detail,
            resource: this.resource
        }
    }

    static doTask(creep) {
        let resource = creep.memory.task.resource;

        let result = ERR_NOT_FOUND;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(resource)) {
            // Inventory contains wrong resource, depo
            result = utils.doDst(creep, utils.findDst(creep));
        } else {
            // Determine next step
            let src = Game.getObjectById(creep.memory.curSrc);
            if (src && src.store && !src.store.getUsedCapacity(resource)) { src = null }
            let dst = Game.getObjectById(creep.memory.curDst);
            if (dst && dst.store && !dst.store.getFreeCapacity(resource)) { dst = null }
            if (!src && !creep.store.getUsedCapacity()) {
                // Inventory empty, get src
                src = utils.bestSrc(creep, resource);
                dst = null;
            } else if (!dst && !creep.store.getFreeCapacity()) {
                // Inventory full, get dst
                dst = utils.bestDst(creep, resource);
                src = null;
            } else if (!src && !dst && creep.room.name != creep.memory.task.room) {
                // Move to correct room
                return creep.memory.task.room;
            } else if (!src && !dst) {
                // Pick new src or dst by distance
                src = utils.bestSrc(creep, resource);
                dst = utils.bestDst(creep, resource);
                if (creep.pos.findPathTo(src).length < creep.pos.findPathTo(dst).length) {
                    dst = null;
                } else {
                    src = null;
                }
            }

            // Execute
            if (src) {
                if (src instanceof Flag) {
                    if (src.pos.lookFor(LOOK_CREEPS).length && src.pos.lookFor(LOOK_CREEPS)[0].name === creep.name) { result = OK }
                    else if (src.pos.lookFor(LOOK_CREEPS).length) { result = utils.doSrc(creep, src.pos.lookFor(LOOK_CREEPS)[0], resource) }
                    else if (src.pos.lookFor(LOOK_STRUCTURES).length) { result = utils.doSrc(creep, src.pos.lookFor(LOOK_STRUCTURES)[0], resource) }
                    else { result = creep.moveTo(src, {visualizePathStyle: {stroke: "#ffa500"}}) }
                } else {
                    result = utils.doSrc(creep, src, resource);
                }
                if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) { src = null }
            } else if (dst) {
                if (dst instanceof Flag) {
                    if (dst.pos.lookFor(LOOK_CREEPS).length && dst.pos.lookFor(LOOK_CREEPS)[0].name === creep.name) { result = OK }
                    else if (dst.pos.lookFor(LOOK_CREEPS).length) { result = utils.doDst(creep, dst.pos.lookFor(LOOK_CREEPS)[0], resource) }
                    else if (dst.pos.lookFor(LOOK_STRUCTURES).length) { result = utils.doDst(creep, dst.pos.lookFor(LOOK_STRUCTURES)[0], resource) }
                    else { result = creep.moveTo(dst, {visualizePathStyle: {stroke: "#1e90ff"}}) }
                } else {
                    result = utils.doDst(creep, dst, resource);
                }
                if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_FULL) { dst = null }
            }

            // Update cache
            if (src) { creep.memory.curSrc = src.id }
            else { creep.memory.curSrc = null }
            if (dst) { creep.memory.curDst = dst.id }
            else { creep.memory.curDst = null }
        }

        return result;
    }

}

module.exports = Stock;