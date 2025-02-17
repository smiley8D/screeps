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
        // Find mineables
        let tasks = []
        for (let source of room.find(FIND_SOURCES).concat(room.find(FIND_MINERALS, {filter: (m) => m.pos.lookFor(LOOK_STRUCTURES).length }))) {
            // Calculate parking spots
            let spots = 0;
            for (let x = source.pos.x-1; x <= source.pos.x+1; x++) {
                for (let y = source.pos.y-1; y <= source.pos.y+1; y++) {
                    if (source.room.getTerrain().get(x,y) == 0) { spots++; }
                }
            }

            // Determine wanted
            let wanted = 4 / config.PART_MULT;
            if (source.mineralType ) { wanted = Math.max(0, Math.log(source.mineralAmount)) }
            tasks.push(new Mine(source.id, wanted, spots));
        }
        return tasks;
    }

    static doTask(creep) {
        creep.say("⛏️");
        let mine_amount = 2 * (1 + 2 * (creep.memory.size - 1));
        let source = Game.getObjectById(creep.memory.task.tgt);
        let resource = RESOURCE_ENERGY;
        if (source.mineralType) { resource = source.mineralType }

        // Depo
        if ( creep.store.getFreeCapacity(resource) < ((creep.memory.size + 2) * 2) || creep.memory.curDepo) { utils.depo(creep, resource) }

        // Mine
        if (!creep.memory.curDepo) {
            let result = creep.harvest(source)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {}})
            } else if (result == OK) {
                creep.room.memory.metrics.count.resources.total[resource] += mine_amount;
            }
        }
    }

}

module.exports = Mine;