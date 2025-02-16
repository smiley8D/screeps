Task = require("task");
Miner = require("body.miner");
utils = require("utils");

class Mine extends Task {

    constructor(pos, wanted) {
        super("Mine", pos, wanted);
        this.body = new Miner();
    }

    static getTasks(room) {
        // 1 per node for now, eventually base on harvest efficiency and/or resources required?
        let tasks = []
        for (let source of room.find(FIND_SOURCES)) {
            tasks.push(new Mine(source.id,1));
        }
        return tasks;
    }

    static doTask(creep) {
        creep.say("⛏️");

        let source = Game.getObjectById(creep.memory.task.tgt);

        // Depo
        if ( creep.store.getFreeCapacity() == 0 || creep.memory.curDepo) { utils.depo(creep) }

        // Mine
        if (!creep.memory.curDepo) {
            let result = creep.harvest(source)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {}})
            } else if (result != OK && result != ERR_NOT_IN_RANGE) {
                // Cannot complete task
                creep.memory.task = null;
            }
        }
    }

}

module.exports = Mine;