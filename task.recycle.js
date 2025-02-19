const Task = require("task");
const utils = require("utils");
const Hauler = require("body.hauler");

class Recycle extends Task {

    constructor(room=false, wanted=0) {
        super("Recycle", room, room, wanted);
        this.body = new Hauler();
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room owned
            if (!room.controller || !room.controller.my) {continue}

            let amount = 0;
            for (let src of room.find(FIND_DROPPED_RESOURCES).concat(room.find(FIND_TOMBSTONES),room.find(FIND_RUINS))) {
                if (src.store) {amount += src.store.getUsedCapacity()}
                else {amount += src.amount}
            }
            tasks.push(new Recycle(room.name, Math.max(0,Math.log(amount))));
        }
        return tasks;
    }

    static doTask(creep) {
        // Move to room if assigned
        if (creep.memory.task.tgt && creep.room.name != creep.memory.task.tgt) {
            console.log(creep.pos);
            console.log(creep.memory.task.tgt);
            console.log(new RoomPosition(25,25,creep.memory.task.tgt));
            let result = creep.moveTo(new RoomPosition(25,25,creep.memory.task.tgt), {visualizePathStyle: {}});
            if (result != OK) {
                creep.say("♻️" + result);
            } else {
                creep.say("♻️");
            }
            return;
        }

        let result = ERR_NOT_FOUND;
        if (creep.store.getFreeCapacity() && creep.room.find(FIND_DROPPED_RESOURCES).concat(creep.room.find(FIND_TOMBSTONES),creep.room.find(FIND_RUINS)).length) {
            // Space in inventory & decayables, refill
            creep.memory.curDst = null;
            if (!creep.memory.curSrc) {creep.memory.curSrc = creep.pos.findClosestByPath(creep.room.find(FIND_DROPPED_RESOURCES).concat(creep.room.find(FIND_TOMBSTONES),creep.room.find(FIND_RUINS))) }
            for (let resource of RESOURCES_ALL) {
                result = utils.doSrc(creep, Game.getObjectById(creep.memory.curSrc), resource);
                if (result == OK || result == ERR_NOT_IN_RANGE) { break }
            }
        } else if (creep.store.getUsedCapacity()) {
            // Cannot pickup more & have stuff to depo
            creep.memory.curSrc = null;
            for (let cur_resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(cur_resource)) {
                    result = utils.doDst(creep, utils.findDst(creep, cur_resource), cur_resource);
                    if (result == OK || result == ERR_NOT_IN_RANGE) { break }
                }
            }
        } else if (creep.ticksToLive < 500 && creep.room.find(FIND_MY_SPAWNS)) {
            // Recycle creep
            let spawner = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (spawner) { result = spawner.recycleCreep(creep) }
            if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(spawner, {visualizePathStyle: {stroke: "#dc0000"}})}
        } else {
            // Move to graveyard
            let graveyard = creep.pos.findClosestByRange(FIND_FLAGS, { filter: (f) => f.color == COLOR_GREY && f.pos.lookFor(LOOK_STRUCTURES).length == 0});
            if (graveyard) {
                result = creep.moveTo(graveyard, {visualizePathStyle: {}});
            }
            return;
        }

        if (result != OK) {
            creep.say("♻️" + result);
        } else {
            creep.say("♻️");
        }
    }

}

module.exports = Recycle;