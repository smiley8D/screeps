Task = require("task");
utils = require("utils");

class Upgrade extends Task {

    constructor(room, wanted) {
        super("Upgrade", room, wanted);
    }

    static getTasks(room) {
        // Hardcode 5 for now, eventually base on change in energy over time?
        let task = new Upgrade(room.name, 5)
        return [task];
    }

    static doTask(creep) {
        creep.say("⬆️");
        let controller = Game.rooms[creep.memory.task.tgt].controller;

        // Attempt upgrade
        let result = creep.upgradeController(controller)
        if (result == ERR_NOT_IN_RANGE) {
            // Move in range
            creep.moveTo(controller, {visualizePathStyle: {}});
        } else if (result == ERR_NOT_ENOUGH_ENERGY) {
            // Fill inventory
            result = utils.fill(creep);
        }

        // Cannot complete task
        if (result != OK && result != ERR_NOT_IN_RANGE) {
            creep.memory.task = null;
        }
    }

}

module.exports = Upgrade;