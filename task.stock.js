config = require("config");

Task = require("task");
Hauler = require("body.hauler");

class Stock extends Task {

    constructor(room, wanted) {
        super("Stock", room, wanted);
        this.body = new Hauler();
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
                if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_YELLOW).length > 0) {
                    // Flagged as empty
                    over += structure.store.getUsedCapacity(RESOURCE_ENERGY);
                    if (structure.store.getUsedCapacity(RESOURCE_ENERGY)) { room.memory.visuals.push(["⬇︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                } else if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_BLUE).length > 0) {
                    // Flagged as fill
                    under += structure.store.getFreeCapacity(RESOURCE_ENERGY);
                    if (structure.store.getFreeCapacity(RESOURCE_ENERGY)) { room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                } else {
                    // Non-flagged container/storage, check against avg
                    let diff = structure.store.getCapacity(RESOURCE_ENERGY) * ((structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY)) - avg_fill);
                    if (diff > 0) {
                        over += diff
                        room.memory.visuals.push(["⬇︎", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                    } else if (diff < 0) {
                        under -= diff
                        room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                    }
                }
            } else {
                // Not a container or storage, always fill
                under += structure.store.getFreeCapacity(RESOURCE_ENERGY);
                if (structure.store.getFreeCapacity(RESOURCE_ENERGY)) { room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
            }
        }

        // Create task  
        let imbalance = Math.round(Math.max(over, under));
        let workers = Math.max(Math.ceil((room.energyCapacityAvailable - room.energyAvailable) / 100), Math.round(Math.log(imbalance)));
        if (workers > 0) {
            let task = new Stock(room.name, workers);
            if (room.find(FIND_MY_CREEPS).length == 0) {
                task.body.base = [WORK,CARRY,MOVE];
            }
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

        // Spawners not full, prioritize
        if (room.energyAvailable < room.energyCapacityAvailable) {
            // Fill
            if (!creep.store.getUsedCapacity(RESOURCE_ENERGY) || creep.memory.curFill) {
                utils.fill(creep, true, false, true, RESOURCE_ENERGY);
                creep.memory.curDepo = null;
            }

            // Stock spawner
            if (!creep.memory.curFill) {
                // Get closest spawn container
                let depo = Game.getObjectById(creep.memory.curDepo);
                if (!depo || !depo.store.getFreeCapacity(RESOURCE_ENERGY)) {
                    depo = creep.pos.findClosestByPath(FIND_MY_STRUCTURES,
                    {filter: (o) => (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION) && o.store.getFreeCapacity(RESOURCE_ENERGY)});
                    if (depo) {
                        creep.memory.curDepo = depo.id;
                    } else {
                        creep.memory.curDepo = null;
                    }
                }

                // Attempt restock
                let result = creep.transfer(depo, RESOURCE_ENERGY);
                creep.moveTo(depo, {visualizePathStyle: {stroke: "#1e90ff"}});
                if (result == ERR_NOT_ENOUGH_ENERGY) {
                    // Fill inventory
                    creep.memory.curFill = true;
                } else if (result == ERR_FULL) {
                    // Find new depo
                    creep.memory.curDepo = null;
                }
            }
        } else {
            // Find most full valid src (closest if several equal)
            if (creep.memory.curFill == true || (!creep.memory.curFill && !creep.store.getUsedCapacity(RESOURCE_ENERGY)) || (!creep.memory.curFill && !creep.memory.curDepo)) {
                // Find most full
                let cur = 0;
                let cur_level = 0;
                let cur_range = 200;
                for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE } )) {
                    let filled = structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY);
                    let range = creep.pos.getRangeTo(structure);
                    if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_YELLOW).length > 0) {
                        // Flagged as empty
                        if (filled > cur || (filled == cur && range < cur_range)) {
                            cur = filled;
                            creep.memory.curFill = structure.id;
                            cur_range = range;
                            cur_level = 1;
                        }
                    } else if (structure.pos.lookFor(LOOK_FLAGS).length == 0) {
                        // Unflagged
                        if (cur_level < 1 && (filled > cur || (filled == cur && range < cur_range))) {
                            cur = filled;
                            creep.memory.curFill = structure.id;
                            cur_range = range;
                        }
                    }
                }
            }

            // Attempt fill
            if (creep.memory.curFill) {
                let fill = Game.getObjectById(creep.memory.curFill);
                let result = creep.withdraw(fill, RESOURCE_ENERGY);
                if (result == ERR_NOT_ENOUGH_ENERGY) {
                    // Find new fill
                    creep.memory.curFill = true;
                } else if (result == ERR_FULL) {
                    // Begin depo
                    creep.memory.curDepo = true;
                    creep.memory.curFill = null;
                } else if (result == ERR_NOT_IN_RANGE) {
                    // Move in range
                    creep.moveTo(fill, {visualizePathStyle: {stroke: "#ffa500"}});
                } else if (result != OK) {
                    // Cannot complete task
                    creep.memory.task = null;
                }
            }

            // Find most imbalanaced dst
            if (creep.memory.curDepo == true || (!creep.memory.curDepo && !creep.store.getFreeCapacity(RESOURCE_ENERGY))) {
                let cur = 0;
                let cur_level = 0;
                let cur_range = 200;
                for (let structure of room.find(FIND_STRUCTURES, { filter: (o) => o.store && (o.my || !o.owner) } )) {
                    let empty = structure.store.getFreeCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY);
                    let range = creep.pos.getRangeTo(empty);
                    if (structure.structureType == STRUCTURE_SPAWN || structure.structureType == STRUCTURE_EXTENSION) {
                        // Spawning container
                        if (empty > 0 && range < cur_range) {
                            cur = empty;
                            creep.memory.curDepo = structure.id;
                            cur_level = 3;
                            cur_range = range;
                        }
                    } else if (structure.structureType != STRUCTURE_CONTAINER && structure.structureType != STRUCTURE_STORAGE) {
                        // Not container or storage
                        if (cur_level < 3 && (empty > cur || (empty == cur && range < cur_range))) {
                            cur = empty;
                            creep.memory.curDepo = structure.id;
                            cur_level = 2;
                            cur_range = range;
                        }
                    } else if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_BLUE).length > 0) {
                        // Flagged as fill
                        if (cur_level < 2 && (empty > cur || (empty == cur && range < cur_range))) {
                            cur = empty;
                            creep.memory.curDepo = structure.id;
                            cur_level = 1;
                            cur_range = range;
                        }
                    } else if (structure.pos.lookFor(LOOK_FLAGS).length == 0) {
                        // Unflagged
                        if (cur_level < 1 && (empty > cur || (empty == cur && range < cur_range))) {
                            cur = empty;
                            creep.memory.curDepo = structure.id;
                            cur_range = range;
                        }
                    }
                }
            }

            // Attempt depo
            if (creep.memory.curDepo) {
                let depo = Game.getObjectById(creep.memory.curDepo);
                let result = creep.transfer(depo, RESOURCE_ENERGY);
                if (result == ERR_FULL) {
                    // Find new depo
                    creep.memory.curDepo = true;
                } else if (result == ERR_NOT_ENOUGH_ENERGY) {
                    // Begin fill
                    creep.memory.curFill = true;
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

}

module.exports = Stock;