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

        // Get depo
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
            result = utils.fill(creep, creep.body == "Worker");
        }

        // Cannot complete task
        if (result != OK && result != ERR_NOT_IN_RANGE) {
            creep.memory.task = null;
            creep.memory.curDepo = null;
        }
    }

}

module.exports = StockSpawn;