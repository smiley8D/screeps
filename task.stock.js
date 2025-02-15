Task = require("task");
utils = require("utils");

class StockTask extends Task {
    body_base = [CARRY,CARRY,MOVE,CARRY,CARRY,MOVE];
    body_add = [CARRY,CARRY,MOVE];
    name = "stock";
    emoji = "📦";

    container;

    constructor(container) {
        super();
        this.id = "stock:" + container
        this.container = container
    }

    static getTasks(tasks, room_limit) {
        let total_cap = 0;
        for (let room in Game.rooms) {
            for (let structure of Game.rooms[room].find(FIND_STRUCTURES)) {
                if (structure.store && structure.pos.lookFor(LOOK_FLAGS).filter((flag) => flag.color == COLOR_YELLOW).length == 0 && structure.store.getFreeCapacity(RESOURCE_ENERGY)) {
                    let task = new StockTask(structure.id);
                    tasks.set(task.id, task);
                    task.local_limit = Math.ceil(Math.log(structure.store.getFreeCapacity(RESOURCE_ENERGY) + 1) / Math.log(100));
                    total_cap += structure.store.getFreeCapacity(RESOURCE_ENERGY);
                }
            }
        }
        room_limit["stock"] = Math.ceil(Math.log(total_cap) / Math.log(50));
    }

    static doTask(creep) {
        let container = Game.getObjectById(creep.memory.task.container);

        // Collect
        utils.fill(creep, false, true);

        // Store
        if (!creep.memory.curFill) {
            let result = creep.transfer(container, RESOURCE_ENERGY);
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(container, {visualizePathStyle: {stroke: "#1e90ff"}});
            } else if (result != OK) {
                creep.memory.task = null;
            }
        }
    }

    static alert(task) {
        let container = Game.getObjectById(task.container);
        container.room.visual.text(task.local_limit + "📦",container.pos);
    }
}

module.exports = StockTask;