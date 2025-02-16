Task = require("task");
Hauler = require("body.hauler");

class Stock extends Task {

    constructor(room, wanted, avg_fill) {
        super("Stock", room, wanted);
        this.body = new Hauler();
        this.avg_fill = avg_fill;
    }

    static getTasks(room) {
        // Get totals
        let amount = 0;
        let capacity = 0;
        for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => (o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE) })) {
            amount += structure.store.getUsedCapacity(RESOURCE_ENERGY);
            capacity += structure.store.getCapacity(RESOURCE_ENERGY);
        }
        let avg_fill = amount / capacity;

        // Get imbalance
        let imbalance = 0;
        for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => (o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE) })) {
            let diff = (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY)) - avg_fill;
            if (diff > 0.1) {
                imbalance += structure.store.getCapacity(RESOURCE_ENERGY) * diff;
            }
        }

        // Create task
        if (imbalance > 0) {
            let task = new Stock(room.name, Math.max(0, Math.round(Math.log(imbalance) / Math.log(25))), avg_fill);
            return [task];
        }
        return [];
    }

    static doTask(creep) {
        creep.say("📦");
        let room = Game.rooms[creep.memory.task.tgt];

        // Move to room
        if (creep.room.name != creep.memory.task.tgt) {
            creep.moveTo(Game.rooms[creep.memory.task.tgt], {visualizePathStyle: {}});
            return;
        }

        // Find most filled container
        if ((!creep.memory.curFill && !creep.store.getUsedCapacity(RESOURCE_ENERGY)) || (!creep.memory.curFill && !creep.memory.curDepo)) {
            let cur = 0;
            for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => (o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE) })) {
                if (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY) > cur) {
                    cur = structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY);
                    creep.memory.curFill = structure.id;
                }
            }
        }

        // Attempt fill
        if (creep.memory.curFill) {
            let fill = Game.getObjectById(creep.memory.curFill);
            let result = creep.withdraw(fill, RESOURCE_ENERGY);
            if (result == ERR_NOT_ENOUGH_ENERGY) {
                // Find new inventory
                creep.memory.curFill = false;
            } else if (result == ERR_NOT_IN_RANGE) {
                // Move in range
                creep.moveTo(fill, {visualizePathStyle: {stroke: "#ffa500"}});
            } else if (result != OK) {
                // Cannot complete task
                creep.memory.task = null;
                creep.say(result);
            }
        }

        // Find least filled container
        if (!creep.memory.curDepo && !creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
            let cur = 1;
            for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => (o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE) })) {
                if (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY) < cur) {
                    cur = structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY);
                    creep.memory.curDepo = structure.id;
                }
            }
        }

        // Attempt depo
        if (creep.memory.curDepo) {
            let depo = Game.getObjectById(creep.memory.curDepo);
            let result = creep.transfer(depo, RESOURCE_ENERGY);
            if (result == ERR_NOT_ENOUGH_ENERGY) {
                // Find new inventory
                creep.memory.curDepo = false;
            } else if (result == ERR_NOT_IN_RANGE) {
                // Move in range
                creep.moveTo(depo, {visualizePathStyle: {stroke: "#1e90ff"}});
            } else if (result != OK) {
                // Cannot complete task
                creep.memory.task = null;
                creep.say(result);
            }
        }
    }

}

module.exports = Stock;