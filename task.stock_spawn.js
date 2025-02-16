Task = require("task");
Hauler = require("body.hauler");
Body = require("body");

class StockSpawn extends Task {

    constructor(room, wanted) {
        super("StockSpawn", room, wanted);
        this.body = new Hauler();
    }

    static getTasks(room) {
        if (room.energyAvailable < room.energyCapacityAvailable) {
            let task = new StockSpawn(room.name, Math.max(0, Math.ceil(Math.log(room.energyCapacityAvailable - room.energyAvailable) / Math.log(10))))
            if (room.energyAvailable <= 300) {
                task.body = new Body();
            }
            return [task];
        }
        return [];
    }

    static doTask(creep) {
        creep.say("🛌");

        // Move to room
        if (creep.room.name != creep.memory.task.tgt) {
            creep.moveTo(Game.rooms[creep.memory.task.tgt], {visualizePathStyle: {}});
            return;
        }

        // Fill
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || creep.memory.curFill) {
            utils.fill(creep, creep.body == "Worker");
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
            creep.moveTo(depo, {visualizePathStyle: {}});
            if (result == ERR_NOT_ENOUGH_ENERGY) {
                // Fill inventory
                creep.memory.curFill = true;
            } else if (result == ERR_FULL) {
                // Find new depo
                creep.memory.curDepo = null;
            }
        }
    }

}

module.exports = StockSpawn;