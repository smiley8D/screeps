const Task = require("task");
const Miner = require("body.miner");

const utils = require("utils");
const config = require("config");

class Mine extends Task {

    constructor(pos, wanted, spots) {
        super("Mine", pos, wanted, spots);
        this.body = new Miner();
    }

    static getTasks(room) {
        // Find sources
        let tasks = []
        for (let source of room.find(FIND_SOURCES)) {
            // Calculate parking spots
            let spots = 0;
            for (let x = source.pos.x-1; x <= source.pos.x+1; x++) {
                for (let y = source.pos.y-1; y <= source.pos.y+1; y++) {
                    if (source.room.getTerrain().get(x,y) == 0) { spots++; }
                }
            }
            tasks.push(new Mine(source.id, 4 / config.PART_MULT, spots));
        }
        return tasks;
    }

    static doTask(creep) {
        creep.say("⛏️");
        let mine_amount = 2 * (1 + 2 * (creep.memory.size - 1))

        let source = Game.getObjectById(creep.memory.task.tgt);

        // Depo
        if ( creep.store.getFreeCapacity(RESOURCE_ENERGY) < ((creep.memory.size + 2) * 2) || creep.memory.curDepo) { utils.depo(creep) }

        // Mine
        if (!creep.memory.curDepo) {
            let result = creep.harvest(source)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {}})
            } else if (result == OK && creep.room.memory.metrics) {
                creep.room.memory.metrics.count.resources.total[RESOURCE_ENERGY] += mine_amount;
            }
        }
    }

}

module.exports = Mine;