utils = require("utils");
config = require("config");

Task = require("task");

class Repair extends Task {

    static emoji() {
        return '🔧';
    }

    constructor(room, wanted) {
        super("Repair", room, room, wanted);
        this.max_workers = 2;
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room not other-owned
            if (room.controller && room.controller.owner && !room.controller.my) {continue}

            if (!room.memory.metrics) {continue}
            let total_dmg = room.memory.metrics.last.hits_max - room.memory.metrics.last.hits;
            if (total_dmg > 0) {
                tasks.push(new Repair(room.name, Math.max(1,Math.log(total_dmg / 100))));
            }
        }
        return tasks;
    }

    static doTask(creep) {
        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            // Inventory contains wrong resource, depo
            delete creep.memory.curTgt;
            result = utils.doDst(creep, utils.findDst(creep));
        } else if (creep.store.getUsedCapacity()) {
            // Move to room
            if (creep.room.name != creep.memory.task.room) {
                creep.memory.room = creep.memory.task.room;
                return ERR_NOT_IN_RANGE;
            }
    
            // Energy in inventory, repair
            delete creep.memory.curSrc;

            // Get structure
            let structure = Game.getObjectById(creep.memory.curTgt);
            if (!structure || structure.hitsMax === structure.hits) {
                // Mixed priority of damage & distance
                structure = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter:(o) => (!o.owner || o.my) && o.hitsMax && o.hits  < 100 && !o.pos.lookFor(LOOK_FLAGS).some((f)=>f.color === COLOR_ORANGE && f.secondaryColor === COLOR_ORANGE)});
                if (!structure) { structure = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter:(o) => !o.pos.lookFor(LOOK_FLAGS).some((f)=>f.color === COLOR_ORANGE && f.secondaryColor === COLOR_ORANGE) &&
                    (!o.owner || o.my) && o.hitsMax && o.hits / o.hitsMax < ((o.structureType === STRUCTURE_WALL || o.structureType === STRUCTURE_RAMPART) ? 0.1 * config.DEFENSE_PER : 0.1)}) }
                if (!structure) { structure = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter:(o) => !o.pos.lookFor(LOOK_FLAGS).some((f)=>f.color === COLOR_ORANGE && f.secondaryColor === COLOR_ORANGE) &&
                    (!o.owner || o.my) && o.hitsMax && o.hits / o.hitsMax < ((o.structureType === STRUCTURE_WALL || o.structureType === STRUCTURE_RAMPART) ? 0.5 * config.DEFENSE_PER : 0.5)}) }
                if (!structure) { structure = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter:(o) => !o.pos.lookFor(LOOK_FLAGS).some((f)=>f.color === COLOR_ORANGE && f.secondaryColor === COLOR_ORANGE) &&
                    (!o.owner || o.my) && o.hitsMax && o.hits < ((o.structureType === STRUCTURE_WALL || o.structureType === STRUCTURE_RAMPART) ? o.hitsMax * config.DEFENSE_PER : o.hitsMax)}) }
                if (structure) {
                    creep.memory.curTgt = structure.id;
                } else {
                    delete creep.memory.curTgt;
                }
            }

            // Attempt repair
            result = creep.repair(structure);
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(structure, { maxRooms: 1, visualizePathStyle: {}}) }
        } else {
            // Empty inventory, refill
            delete creep.memory.curTgt;
            result = utils.doSrc(creep, utils.findSrc(creep, RESOURCE_ENERGY), RESOURCE_ENERGY);
        }

        return result;
    }

}

module.exports = Repair;