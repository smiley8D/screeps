Task = require("task");
utils = require("utils");

class MineTask extends Task {

    constructor(source, count) {
        super();
        this.body_add = [WORK];
        this.body_base = [WORK,WORK,CARRY,MOVE];
        this.name = "mine"
        this.emoji = "⛏️";
        this.permissive = false;
        this.task_lock = "mine";

        this.source = source
        this.id = "mine:" + source;
        this.local_limit = count;
        this.body_limit = Math.floor(6 / count) - 2;
    }

    static getTasks(tasks, room_limit) {
        room_limit["mine"] = 0;
        for (let room in Game.rooms) {
            let terrain = Game.rooms[room].getTerrain();
            for (let source of Game.rooms[room].find(FIND_SOURCES)) {
                let count = 0;
                for (let x = source.pos.x-1; x <= source.pos.x+1; x++) {
                    for (let y = source.pos.y-1; y <= source.pos.y+1; y++) {
                        if (terrain.get(x,y) != TERRAIN_MASK_WALL) {
                            count++;
                            room_limit["mine"]++;
                        }
                    }
                }
                let task = new MineTask(source.id, count);
                tasks.set(task.id, task);
            }
        }
    }

    static doTask(creep) {
        let source = Game.getObjectById(creep.memory.task.source);

        // Depo
        utils.depo(creep);

        // Mine
        if (!creep.memory.curDepo) {
            let result = creep.harvest(source)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {}})
            } else if (result == ERR_NO_BODYPART) {
                creep.memory.task = null;
            }
        }
    }

    static alert(task) {
        let source = Game.getObjectById(task.source);
        source.room.visual.text(task.local_limit + "⛏️",source.pos);
    }
}

module.exports = MineTask;