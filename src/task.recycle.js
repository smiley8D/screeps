const Task = require("task");
const utils = require("utils");

class Recycle extends Task {

    constructor(creep) {
        super("Recycle", null, null, 0);
        delete creep.memory.curSrc;
        delete creep.memory.curDst;
        delete creep.memory.room;
        delete creep.memory.curTgt;
    }

    static getTasks() {
        return [];
    }

    static doTask(creep) {
        let result = ERR_NOT_FOUND;
        if (creep.store.getUsedCapacity()) {
            // Inventory not empty, depo
            result = utils.doDst(creep, utils.findDst(creep, undefined, {haulers: creep.memory.body != 'Hauler'}));
        } else if ((creep.ticksToLive < 500 || (creep.ticksToLive < 1400 && creep.room.energyAvailable / creep.room.energyCapacityAvailable < 0.5)) && creep.room.find(FIND_MY_SPAWNS).length) {
            // Recycle creep
            let spawner = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (spawner) { result = spawner.recycleCreep(creep) }
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(spawner, {visualizePathStyle: {stroke: "#dc0000"}})}
        } else {
            // Move to graveyard
            let graveyard = creep.pos.findClosestByRange(FIND_FLAGS, { filter: (f) => f.color === COLOR_BROWN && f.secondaryColor === COLOR_BROWN });
            if (graveyard) {
                result = creep.moveTo(graveyard, {visualizePathStyle: {}});
            }
        }

        return result;
    }

}

module.exports = Recycle;