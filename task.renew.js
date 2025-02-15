Task = require("task");
utils = require("utils");

class RenewTask extends Task {
    name = "renew";

    old_task;

    constructor(old_task) {
        super();
        this.old_task = old_task;
    }

    static doTask(creep) {
        if (creep.memory.task.old_task) {
            // Check done
            if (creep.ticksToLive > 1400) {
                creep.memory.task = creep.memory.task.old_task;
                return;
            }
    
            // Attempt renew
            creep.say("💖" + creep.memory.task.old_task.emoji)
            if (Game.spawns["Spawn1"].renewCreep(creep) == ERR_NOT_IN_RANGE) {
                creep.moveTo(Game.spawns["Spawn1"], {visualizePathStyle: {}});
            }
        } else {
            creep.say("💀")

            // Attempt recycle
            if (!creep.memory.curDepo) {
                if (Game.spawns["Spawn1"].recycleCreep(creep) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(Game.spawns["Spawn1"], {visualizePathStyle: {}});
                }
            }
        }
    }
}

module.exports = RenewTask;