const Task = require("task");
const Miner = require("body.miner");

const utils = require("utils");
const config = require("config");

class Mine extends Task {

    constructor(source, room, wanted, spots) {
        super("Mine", source, room, wanted);
        this.body = new Miner();
        this.max_workers = spots;
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room owned
            if (!room.controller || !room.controller.my) { continue }

            // Find mineables
            for (let source of room.find(FIND_SOURCES).concat(room.find(FIND_MINERALS, { filter: (m) => m.pos.lookFor(LOOK_STRUCTURES).length }))) {
                // Calculate parking spots
                let spots = 0;
                for (let x = source.pos.x - 1; x <= source.pos.x + 1; x++) {
                    for (let y = source.pos.y - 1; y <= source.pos.y + 1; y++) {
                        if (source.room.getTerrain().get(x, y) === 0) { spots++; }
                    }
                }

                // Determine wanted - HARDCODED TO MATCH SOURCE MAX RATE FOR NOW
                let wanted = 6;
                if (source instanceof Mineral) {
                    wanted = Math.max(0, Math.log(source.mineralAmount));
                    spots = 1;
                }
                tasks.push(new Mine(source.id, room.name, wanted, spots));
            }
        }
        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            creep.memory.room = creep.memory.task.room;
            creep.say("⛏️" + creep.memory.task.room);
            return;
        }

        let target = Game.getObjectById(creep.memory.task.tgt);
        let resource = RESOURCE_ENERGY;
        if (target.mineralType) { resource = target.mineralType }

        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(resource)) {
            // Inventory contains wrong resource, depo
            result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
        } else if (creep.store.getFreeCapacity() >= 2 * (2 * (creep.memory.size - 1) + 1)) {
            // Space in inventory, mine
            creep.memory.curDst = null;
            result = creep.harvest(target)
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(target, { visualizePathStyle: {} }) }
        } else {
            // Full inventory, depo
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource)) {
                    result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
                    if (result === OK || result === ERR_NOT_IN_RANGE) { break }
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