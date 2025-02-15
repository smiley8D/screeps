Task = require("task");
utils = require("utils");

class UpgradeTask extends Task {
    name = "upgrade";
    emoji = "⬆️";
    local_limit = 10;

    room;

    constructor(room) {
        super();
        this.id = "upgrade:" + room;
        this.room = room;
    }

    static getTasks(tasks, room_limit) {
        room_limit["upgrade"] = 10;
        for (let room in Game.rooms) {
            let controller = Game.rooms[room].controller;
            if (controller) {
                let task = new UpgradeTask(room);
                if (!tasks.has(task.id)) {
                    tasks.set(task.id, task);
                }
            }
        }
    }

    static doTask(creep) {
        let controller = Game.rooms[creep.memory.task.room].controller;

        // Collect
        utils.fill(creep);

        // Upgrade
        if (!creep.memory.curFill) {
            let result = creep.upgradeController(controller)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, {visualizePathStyle: {}});
            } else if (result != OK) {
                creep.memory.task = null;
            }
        }
    }

    static alert(task) {
        let controller = Game.rooms[task.room].controller;
        controller.room.visual.text(task.local_limit + "⬆️",controller.pos);
    }
}

module.exports = UpgradeTask;