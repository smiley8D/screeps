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
        for (let structure of room.find(FIND_STRUCTURES, { filter: (o) =>
            (o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE) &&
            o.pos.lookFor(LOOK_FLAGS).length == 0 })) {
            amount += structure.store.getUsedCapacity(RESOURCE_ENERGY);
            capacity += structure.store.getCapacity(RESOURCE_ENERGY);
        }
        let avg_fill = amount / capacity;

        // Get imbalances
        let over = 0;
        let under = 0;
        for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => o.store && (o.my || !o.owner) } )) {
            if (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE) {
                if (structure.pos.lookFor(LOOK_FLAGS, {filter: {color: COLOR_YELLOW}}).length > 0) {
                    // Flagged as empty
                    over += structure.store.getUsedCapacity(RESOURCE_ENERGY);
                } else if (structure.pos.lookFor(LOOK_FLAGS, {filter: {color: COLOR_BLUE}}).length > 0) {
                    // Flagged as fill
                    under += structure.store.getFreeCapacity(RESOURCE_ENERGY);
                } else {
                    // Non-flagged container/storage, check against avg
                    let diff = structure.store.getCapacity(RESOURCE_ENERGY) * ((structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY)) - avg_fill);
                    if (diff > 0) { over += diff }
                    else if (diff < 0) { under -= diff }
                }
            } else {
                // Not a container or storage, always fill
                under += structure.store.getFreeCapacity(RESOURCE_ENERGY);
            }
        }

        // Create task
        let imbalance = Math.max(over, under);
        let workers = Math.max(0, Math.round(Math.log(Math.abs(imbalance)) / Math.log(50)));
        if (workers > 0) {
            let task = new Stock(room.name, workers, avg_fill);
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

        // Find most full valid src
        if ((!creep.memory.curFill && !creep.store.getUsedCapacity(RESOURCE_ENERGY)) || (!creep.memory.curFill && !creep.memory.curDepo)) {
            let cur = 0;
            let cur_flagged = 0;
            for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE } )) {
                let filled = structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY);
                if (structure.pos.lookFor(LOOK_FLAGS, {filter: {color: COLOR_YELLOW}}).length > 0) {
                    // Flagged as empty
                    if (filled > cur_flagged) {
                        cur_flagged = filled;
                        creep.memory.curFill = structure.id;
                    }
                } else if (structure.pos.lookFor(LOOK_FLAGS).length == 0) {
                    // Unflagged
                    if (filled > cur && cur_flagged == 0) {
                        cur = filled;
                        creep.memory.curFill = structure.id;
                    }
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
            }
        }

        // Find most imbalanaced dst
        if (!creep.memory.curDepo && !creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
            let cur = 0;
            let cur_flagged = 0;
            let cur_other = 0;
            for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => o.store && (o.my || !o.owner) } )) {
                let empty = structure.store.getFreeCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY);
                if (structure.structureType != STRUCTURE_CONTAINER && structure.structureType != STRUCTURE_STORAGE) {
                    // Not container or storage
                    if (empty > cur_other) {
                        cur_other = empty;
                        creep.memory.curDepo = structure.id;
                    }
                } else if (structure.pos.lookFor(LOOK_FLAGS, {filter: {color: COLOR_BLUE}}).length > 0) {
                    // Flagged as fill
                    if (empty > cur_flagged & cur_other == 0) {
                        cur_flagged = empty;
                        creep.memory.curDepo = structure.id;
                    }
                } else if (structure.pos.lookFor(LOOK_FLAGS).length == 0) {
                    // Unflagged
                    if (empty > cur && cur_flagged == 0 && cur_other == 0) {
                        cur = empty;
                        creep.memory.curDepo = structure.id;
                    }
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
            }
        }
    }

}

module.exports = Stock;