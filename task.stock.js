config = require("config");

Task = require("task");
Hauler = require("body.hauler");

class Stock extends Task {

    constructor(room, wanted, resource) {
        super("Stock", room + ":" + resource, room, wanted);
        this.body = new Hauler();
        this.resource = resource;
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room owned
            if (!room.controller || !room.controller.my) {continue}

            if (!room.memory.metrics) {continue}
            for (let resource of RESOURCES_ALL) {
                let parts = Math.max(0, Math.log(room.memory.metrics.last.resources.imbalance[resource]));
                tasks.push(new Stock(room.name, parts, resource));
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
            resource: this.resource
        }
    }

    static doTask(creep) {
        let resource = creep.memory.task.resource;

        // Move to room
        if (creep.room != creep.memory.task.tgt) {
            let result = creep.moveTo(new RoomPosition(25,25,creep.memory.task.tgt), {visualizePathStyle: {}})
            if (result != OK) {
                creep.say("📦" + resource[0] + result);
            } else {
                creep.say("📦" + resource[0]);
            }
            return;
        }

        // Determine next step
        let src = Game.getObjectById(creep.memory.curSrc);
        let dst = Game.getObjectById(creep.memory.curDst);
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(resource)) {
            // Inventory contains wrong resource, depo
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource) && cur_resource != resource) {
                    dst = utils.findDst(creep, cur_resource);
                    resource = cur_resource;
                }
            }
        } else if (!src && !creep.store.getUsedCapacity()) {
            // Inventory empty, get src
            src = utils.bestSrc(creep, resource);
            dst = null;
        } else if (!dst && !creep.store.getFreeCapacity()) {
            // Inventory full, get dst
            dst = utils.bestDst(creep, resource);
            src = null;
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
        let result = ERR_NOT_FOUND;
        if (src) {
            result = utils.doSrc(creep, src, resource);
            if (result == ERR_NOT_ENOUGH_RESOURCES || result == ERR_FULL) { src = null }
        } else if (dst) {
            result = utils.doDst(creep, dst, resource);
            if (result == ERR_NOT_ENOUGH_RESOURCES || result == ERR_FULL) { dst = null }
        }

        // Update cache
        if (src) { creep.memory.curSrc = src.id }
        else { creep.memory.curSrc = null }
        if (dst) { creep.memory.curDst = dst.id }
        else { creep.memory.curDst = null }

        if (result != OK) {
            creep.say("📦" + resource[0] + result);
        } else {
            creep.say("📦" + resource[0]);
        }
    }

}

module.exports = Stock;