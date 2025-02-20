const Task = require("task");
const config = require("config");
const utils = require("utils");
const Hauler = require("body.hauler");

class Supply extends Task {

    constructor(flag, resource) {
        if (resource) {
            super("Supply", flag.name + ":" + resource, flag.pos.roomName, 10, 1);
        } else {
            super("Supply", flag.name, flag.pos.roomName, 10, 1);
        }
        this.body = new Hauler();
        this.flag = flag.name;
        this.resource = resource;
    }

    static getTasks() {
        let tasks = []

        // Iterate through supply flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];
            if (!flag.room || flag.pos.lookFor(LOOK_STRUCTURES).length) {continue}
            if (flag.color == COLOR_GREY || utils.flag_resource[flag.color]) {
                // Match on empty flags or defined resource flags
                tasks.push(new Supply(flag, utils.flag_resource[flag.color]));
            }
        }

        return tasks;
    }

    // Compress tasks for memory storage
    compress() {
        return {
            id: this.id,
            name: this.name,
            tgt: this.tgt,
            room: this.room,
            flag: this.flag,
            resource: this.resource
        }
    }

    static doTask(creep) {
        let flag = Game.flags[creep.memory.task.flag];
        if (!flag) {creep.memory.task = null}
        let resource = creep.memory.task.resource;
        let result = ERR_NOT_FOUND;

        if (resource) {
            // Need to fill and provide resource
            if (creep.store.getUsedCapacity(resource)) {
                // Non-empty, stay at point

                // Move to room
                if (creep.room.name != creep.memory.task.room) {
                    creep.memory.room = creep.memory.task.room;
                    creep.say("🛒" + resource[0] + creep.memory.task.room);
                    return;
                }

                // Move to position
                result = creep.moveTo(flag.pos, {visualizePathStyle: {}});
            } else if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(resource)) {
                // Inventory contains wrong resource, depo
                result = utils.doDst(creep, utils.findDst(creep));
            } else {
                // Room in inventory, refill
                result = utils.doSrc(creep, utils.findSrc(creep, resource, {partial: false}), resource);
            }

            if (result != OK) {
                creep.say("🛒" + resource[0] + result);
            } else {
                creep.say("🛒" + resource[0]);
            }
        } else {
            // Need to depo and provide inventory space
            if (creep.store.getFreeCapacity(resource)) {
                // Non-full, stay at point

                // Move to room
                if (creep.room.name != creep.memory.task.room) {
                    creep.memory.room = creep.memory.task.room;
                    creep.say("🛒" + resource[0] + creep.memory.task.room);
                    return;
                }

                // Move to position
                result = creep.moveTo(flag.pos, {visualizePathStyle: {}});
            } else {
                // Inventory full, depo
                result = utils.doDst(creep, utils.findDst(creep, null, {partial: false}));
            }

            if (result != OK) {
                creep.say("🛒" + result);
            } else {
                creep.say("🛒");
            }
        }
    }

}

module.exports = Supply;