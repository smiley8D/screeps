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
            if (source.mineralType ) { wanted = 1 }
            tasks.push(new Mine(source.id, wanted, spots));
        }
        return tasks;
    }

    static doTask(creep) {
        let target = Game.getObjectById(creep.memory.task.tgt);
        let resource = RESOURCE_ENERGY;
        if (target.mineralType) { resource = target.mineralType }

        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(resource)) {
            // Inventory contains wrong resource, depo
            creep.memory.curSrc = null;
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource) && cur_resource != resource) {
                    result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
                    if (result == OK || result == ERR_NOT_IN_RANGE) { break }
                }
            }
        } else if (creep.store.getFreeCapacity()) {
            // Space in inventory, mine
            creep.memory.curDst = null;
            result = creep.harvest(target)
            if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(target, {visualizePathStyle: {}}) }
        } else {
            // Full inventory, depo
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource)) {
                    result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
                    if (result == OK || result == ERR_NOT_IN_RANGE) { break }
                }
            }
        }

        if (result != OK) {
            creep.say("⛏️" + result);
        } else {
            creep.say("⛏️");
        }
    }

}

module.exports = Mine;