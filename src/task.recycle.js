const Task = require("task");
const utils = require("utils");
const Hauler = require("body.hauler");

class Recycle extends Task {

    static emoji = '♻️';

    constructor(room=false, wanted=0) {
        super("Recycle", room, room, wanted);
        this.body = new Hauler();
    }

    static getTasks() {
        return [];
    }

    static doTask(creep) {
        // Move to room if assigned
        if (creep.memory.task.room && creep.room.name != creep.memory.task.room) {
            creep.memory.room = creep.memory.task.room;
            creep.say("♻️" + creep.memory.task.room);
            return;
        }

        let result = ERR_NOT_FOUND;

        // If space available, look for more trash
        let src;
        if (creep.store.getFreeCapacity()) {
            src = utils.findSrc(creep, undefined, {
                containers: false,
                sources: false,
                haulers: false
            });
        }

        if (src) {
            // If trash, pickup
            result = utils.doSrc(creep, src);
        } else if (creep.store.getUsedCapacity()) {
            // Inventory not empty, depo
            result = utils.doDst(creep, utils.findDst(creep));
        } else if (creep.ticksToLive < 500 && creep.room.find(FIND_MY_SPAWNS)) {
            // Recycle creep
            let spawner = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (spawner) { result = spawner.recycleCreep(creep) }
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(spawner, {visualizePathStyle: {stroke: "#dc0000"}})}
        } else {
            // Move to graveyard
            let graveyard = creep.pos.findClosestByRange(FIND_FLAGS, { filter: (f) => f.color === COLOR_GREY && f.pos.lookFor(LOOK_STRUCTURES).length === 0});
            if (graveyard) {
                result = creep.moveTo(graveyard, {visualizePathStyle: {}});
            }
            return;
        }

        return result;
    }

}

module.exports = Recycle;