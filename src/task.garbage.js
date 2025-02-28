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

            if (room.controller && room.controller.owner && !room.controller.my) { continue }

            let garbage = 0;

            // Count up trash
            if (!room.memory.metrics) {continue}
            for (let resource in room.memory.metrics.last.resources) {
                garbage += room.memory.metrics.last.resources[resource].trash;
            }

            if (garbage > 0) {
                tasks.push(new Garbage(room.name, Math.max(1, Math.log(garbage / 100))));
            }
        }
        return tasks;
    }

    static doTask(creep) {
        let result = ERR_NOT_FOUND;
        if (creep.store.getUsedCapacity() && (!creep.store.getFreeCapacity() || creep.memory.curDst)) {
            // Full inventory, depo
            delete creep.memory.curSrc;
            result = utils.doDst(creep, utils.findDst(creep, undefined, {haulers: false}));
        } else {
            // Move to room
            if (creep.room.name != creep.memory.task.room) {
                creep.memory.room = creep.memory.task.room;
                return ERR_NOT_IN_RANGE;
            }

            // Pickup trash
            delete creep.memory.curDst;
            let src = utils.findSrc(creep, undefined, {containers: false, haulers: false, room_limit: 0, links: false});
            if (!src) {
                src = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: ((s) => s.store && s.pos.lookFor(LOOK_FLAGS).some((f) => (f.color === COLOR_WHITE || f.color === COLOR_GREY) &&
                    s.store.getCapacity() > s.store.getFreeCapacity(utils.flag_resource[f.secondaryColor]) + s.store.getUsedCapacity(utils.flag_resource[f.secondaryColor])))});
                if (src) {
                    let resource = utils.flag_resource[src.pos.lookFor(LOOK_FLAGS)[0].secondaryColor];
                    for (let r of RESOURCES_ALL) {
                        if (r != resource && src.store.getUsedCapacity(r)) {
                            result = utils.doSrc(creep, src, r);
                            break;
                        }
                    }
                }
            } else {
                result = utils.doSrc(creep, src);
            }

            if (!src) { creep.memory.curDst = true }
        }

        return result;
    }

}

module.exports = Garbage;