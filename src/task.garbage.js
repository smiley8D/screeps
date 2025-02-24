const config = require("config");
const Task = require("task");
const Hauler = require("body.hauler");

class Garbage extends Task {

    static emoji() {
        return '🗑️';
    }

    constructor(room, wanted) {
        super("Garbage", room, room, wanted);
        this.body = new Hauler();
    }

    static getTasks() {
        let tasks = []
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            let garbage = 0;

            // Count up trash
            if (!room.memory.metrics) {continue}
            for (let resource in room.memory.metrics.last.resources) {
                garbage += room.memory.metrics.last.resources[resource].trash;
            }

            if (garbage > 0) {
                tasks.push(new Garbage(room.name, Math.max(1, Math.log(garbage))));
            }
        }
        return tasks;
    }

    static doTask(creep) {
        let result = ERR_NOT_FOUND;
        if (!creep.store.getFreeCapacity()) {
            // Full inventory, depo
            delete creep.memory.curSrc;
            result = utils.doDst(creep, utils.findDst(creep));
        } else {
            // Move to room
            if (creep.room.name != creep.memory.task.room) {
                creep.memory.room = creep.memory.task.room;
                return ERR_NOT_IN_RANGE;
            }

            // Pickup trash
            delete creep.memory.curDst;
            result = utils.doSrc(creep, utils.findSrc(creep, undefined, {containers: false, haulers: false}))
        }

        return result;
    }

}

module.exports = Garbage;