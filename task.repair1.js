Task = require("task");
Body = require("body");
Hauler = require("body.hauler");
utils = require("utils");

class Repair extends Task {
    body = Hauler;

    constructor(id, workers) {
        super(workers);
        this.id = "Repair:" + id;
    }

    static getTasks(room) {
        return [new Repair(room.name, 9)];
    }

    static doTask(creep) {
        let structure = Game.getObjectById(creep.memory.task.structure);

        // Collect
        utils.fill(creep);

        // Repair
        if (!creep.memory.curFill) {
            let result = creep.repair(structure)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(structure, {visualizePathStyle: {}})
            } else if (result != OK) {
                creep.memory.task = null;
            }
        }

        if (structure.hitsMax == structure.hits) {
            creep.memory.task = null;
        }
    }
}

module.exports = Repair;