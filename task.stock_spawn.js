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
            let task = new StockSpawn(room.name, Math.ceil(Math.log(room.energyCapacityAvailable - room.energyAvailable) / Math.log(10)))
            if (room.energyAvailable <= 300) {
                task.body = new Body();
            }
            return [task];
        }
        return [];
    }

    static doTask(creep) {
        creep.say("📦");

        // Fill
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || creep.memory.curFill) {
            utils.fill(creep, creep.body == "Worker");
            creep.memory.curDepo = null;
        }

        // Stock spawner
        if (!creep.memory.curFill) {
            // Get closest spawn container
            let depo = Game.getObjectById(creep.memory.curDepo);
            if (!depo) {
                depo = creep.pos.findClosestByPath(FIND_MY_STRUCTURES,
                {filter: (o) => (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION) && o.store.getFreeCapacity(RESOURCE_ENERGY)});
                creep.memory.curDepo = depo;
            }
    
            // Attempt restock
            let result = creep.transfer(depo, RESOURCE_ENERGY);
            if (result == ERR_NOT_IN_RANGE) {
                // Move in range
                creep.moveTo(depo, {visualizePathStyle: {}});
            } else if (result == ERR_NOT_ENOUGH_ENERGY) {
                // Fill inventory
                creep.memory.curFill = true;
            } else if (result != OK) {
                // Cannot complete task
                creep.memory.task = null;
                creep.memory.curDepo = null;
            }
        }
    }

}

module.exports = StockSpawn;