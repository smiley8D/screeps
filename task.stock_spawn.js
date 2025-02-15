Task = require("task");
Hauler = require("body.hauler");
Body = require("body");

class StockSpawn extends Task {
    // Initialize
    room;

    // Overwrite defaults
    name = "StockSpawn";
    body = Hauler;

    constructor(id, workers) {
        super(workers);
        this.id = "StockSpawn:" + id;
        this.room = id;
    }

    static getTasks(room) {
        if (room.energyAvailable < room.energyCapacityAvailable) {
            let task = new StockSpawn(room.name, Math.ceil(Math.log(room.energyCapacityAvailable - room.energyAvailable) / Math.log(10)))
            if (room.energyAvailable <= 300) {
                task.body = new Body();
            } else {
                task.body = new Hauler();
            }
            return [task];
        }
        return [];
    }

    static doTask(creep) {
        creep.say("📦");

        // Move to room first
        let room = Game.rooms[creep.memory.task.room];
        if (room != creep.room) {
            creep.moveTo(room);
            return;
        }

        // Collect
        utils.fill(creep, false, false);

        // Store
        if (!creep.memory.curFill) {
            // Determine depo
            let depo = Game.getObjectById(creep.memory.task.curDepo);
            if (!depo) {
                depo = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (c) => (c.structureType == STRUCTURE_SPAWN || c.structureType == STRUCTURE_EXTENSION) && c.store.getFreeCapacity(RESOURCE_ENERGY)});
            }

            // Attempt to depo
            if (depo) {
                creep.memory.task.curDepo = depo.id;
                let result = creep.transfer(depo, RESOURCE_ENERGY);
                if (result == ERR_NOT_IN_RANGE || result == OK) {
                    creep.moveTo(depo, {visualizePathStyle: {stroke: "#1e90ff"}});
                    return;
                } else {
                    // Depo invalid
                    creep.memory.task.curDepo = null;
                }
            } else {
                // No depo available, finish task
                creep.memory.task = null;
            }
        }
    }
}

module.exports = StockSpawn;