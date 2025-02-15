Task = require("task");
utils = require("utils");

class RepairTask extends Task {
    name = "repair";
    emoji = "🔧";

    structure;

    constructor(structure) {
        super();
        this.id = "repair:" + structure.id;
        this.structure = structure.id;
    }

    static getTasks(tasks, room_limit) {
        let total_dmg = 0;
        for (let room in Game.rooms) {
            for (let structure of Game.rooms[room].find(FIND_STRUCTURES, {filter: function(o) {return o.owner == null || o.my}})) {
                if (structure.hits / structure.hitsMax < 0.9) {
                    let task = new RepairTask(structure);
                    tasks.set(task.id, task);
                    task.local_limit = Math.ceil(Math.log(structure.hitsMax - structure.hits) / Math.log(5000));
                    total_dmg += structure.hitsMax - structure.hits;
                }
            }
        }
        room_limit["repair"] = Math.ceil(Math.log(total_dmg) / Math.log(5000));
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

    static alert(task) {
        let structure = Game.getObjectById(task.structure);
        structure.room.visual.text(task.local_limit + "🔧",structure.pos);
    }
}

module.exports = RepairTask;