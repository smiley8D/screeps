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

        // Fill inventory
        if (creep.memory.filling) {
            
        } else {
            // Upgrade
            if (!creep.memory.curFill) {
                let result = creep.upgradeController(controller)
                if (result == ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, {visualizePathStyle: {}});
                } else if (result != OK && result != ERR_NOT_ENOUGH_ENERGY) {
                    creep.memory.task = null;
                }
            }
        }
    }

}

module.exports = Upgrade;