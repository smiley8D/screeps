config = require("config");

Task = require("task");
Hauler = require("body.hauler");

class Stock extends Task {

    constructor(room, wanted, resource) {
        super("Stock", room + ":" + resource, wanted);
        this.body = new Hauler();
        this.room = room;
        this.resource = resource;
    }

    static getTasks(room) {
        // Create tasks
        let tasks = []
        for (let resource of RESOURCES_ALL) {
            let parts = Math.max(0, Math.log(room.memory.metrics.last.resources.imbalance[resource]));
            if (parts > 0) {
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
        let room = Game.rooms[creep.memory.task.room];
        let resource = creep.memory.task.resource;

        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            creep.moveTo(Game.rooms[creep.memory.task.room], {visualizePathStyle: {}});
            return;
        }

        // Determine next step
        let src = Game.getObjectById(creep.memory.curSrc);
        let dst = Game.getObjectById(creep.memory.curDst);
        if (src && creep.store.getFreeCapacity()) {
            // Src cached & space available, refill
            dst = null;
        } else if (dst && creep.store.getUsedCapacity()) {
            // Dst cached & resources available, depo
            src = null;
        } else if (room.energyAvailable < room.energyCapacityAvailable) {
            // Spawners not full, prioritize
            if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
                // Inventory contains wrong resource, depo
                for (let cur_resource of RESOURCES_ALL) {
                    if (creep.store.getUsedCapacity(cur_resource) && cur_resource != RESOURCE_ENERGY) {
                        dst = utils.findDst(creep, cur_resource);
                    }
                }
                src = null;
            } else if (creep.store.getUsedCapacity()) {
                // Energy in inventory, depo
                dst = utils.findDst(creep, RESOURCE_ENERGY, {containers: false, haulers: false});
                src = null;
            } else {
                // Empty inventory, refill
                src = utils.findSrc(creep, RESOURCE_ENERGY, {source: creep.body.some((p) => p.type == WORK).length > 0});
                dst = null;
            }
        } else if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(resource)) {
            // Inventory contains wrong resource, depo
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource) && cur_resource != resource) {
                    dst = utils.findDst(creep, cur_resource);
                    if (dst) { break }
                }
            }
        } else if (!creep.store.getUsedCapacity()) {
            // Find new src
            src = utils.bestSrc(creep, resource);
            dst = null;
        } else if (!creep.store.getFreeCapacity()) {
            // Find new dst
            dst = utils.bestDst(creep, resource);
            src = null;
        } else {
            // Pick new src or dst by distance
            src = utils.bestSrc(creep, resource);
            dst = utils.bestDst(creep, resource);
            if (creep.pos.finePathTo(src).length < creep.pos.findPathTo(dst).length) {
                dst = null;
            } else {
                src = null;
            }
        }

        // Execute
        let result = ERR_NOT_FOUND;
        if (src) {
            result = utils.doSrc(creep, src, resource);
        } else if (dst) {
            result = utils.doDst(creep, dst, resource);
        }

        // Update cache
        if (src) { creep.memory.curSrc = src.id }
        else { creep.memory.curSrc = null }
        if (dst) { creep.memory.curDst = dst.id }
        else { creep.memory.curDst = null }

        if (room.energyAvailable < room.energyCapacityAvailable) {
            creep.say("📦" + result);
        } else {
            creep.say(resource[0] + "📦" + result);
        }
        return;
    }

}

module.exports = Stock;