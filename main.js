const utils = require("utils");
const config = require("config");

const Mine = require("task.mine");
const Repair = require("task.repair");
const Build = require("task.build");
const Upgrade = require("task.upgrade");
const Stock = require("task.stock");
const Recycle = require("task.recycle");

const TASKS = {
    "Stock": Stock,
    "Mine": Mine,
    "Repair": Repair,
    "Build": Build,
    "Upgrade": Upgrade,
    "Recycle": Recycle
}

// Clear visuals & metrics
for (let room_name in Game.rooms) {
    Game.rooms[room_name].memory.visuals = [];
    Game.rooms[room_name].memory.metrics = null;
}

module.exports.loop = function() {
    // Cleanup
    if (Game.time % config.CLEANUP_TICK == 0) {
        for (let creep in Memory.creeps) {
            if (!Game.creeps[creep]) {
                delete Memory.creeps[creep];
            }
        }
    }

    let avail_creeps;

    // Compute metrics and assign tasks
    if (Game.time % config.TASK_TICK == 0) {
        // Intra-room
        for (let room_name in Game.rooms) {
            // Get room info
            let room = Game.rooms[room_name];
            utils.roomMetrics(room);

            // Get current tasks
            let tasks = new Map();
            avail_creeps = new Map();
            let sorted_tasks = [];
            for (let task_name in TASKS) {
                for (let task of TASKS[task_name].getTasks(room)) {
                    if (!avail_creeps.get(task.body.name)) { avail_creeps.set(task.body.name, []) }
                    tasks.set(task.id, task)
                    task.i = sorted_tasks.length;
                    sorted_tasks.push(task);
                }
            }

            // Find elligible spawners
            let spawners = [];
            for (let spawner of room.find(FIND_MY_SPAWNS)) {
                // Cancel now-unneeded spawns
                if (!spawner.spawning) {
                    spawners.push(spawner);
                } else if (Game.creeps[spawner.spawning.name].memory.task && !tasks.has(Game.creeps[spawner.spawning.name].memory.task.id)) {
                    spawner.spawning.cancel;
                    spawners.push(spawner);
                }
            }

            // Get current assignments
            for (let creep of room.find(FIND_MY_CREEPS)) {
                if (creep.ticksToLive > 100 && creep.memory.task && tasks.has(creep.memory.task.id) && tasks.get(creep.memory.task.id).workers < tasks.get(creep.memory.task.id).wanted) {
                    // Mark assigned
                    let task = tasks.get(creep.memory.task.id);
                    task.workers += creep.memory.size;

                    // Update task fulfillment
                    let i = 0
                    while (task.i < sorted_tasks.length - 1) {
                        // Compare to next task
                        let next_task = sorted_tasks[task.i+1];
                        if ((task.workers / task.wanted) <= (next_task.workers / next_task.wanted)) { break; }

                        // Swap with next task
                        sorted_tasks[task.i] = next_task;
                        sorted_tasks[next_task.i] = task;
                        task.i++;
                        next_task.i--;
                    }
                } else if (creep.memory.body && creep.ticksToLive > 100) {
                    // Mark available
                    if (!avail_creeps.get(creep.memory.body)) { avail_creeps.set(creep.memory.body, []) }
                    creep.memory.task = null;
                    avail_creeps.get(creep.memory.body).push(creep);
                }
            }

            // Assign creeps
            while (sorted_tasks.length > 0 && sorted_tasks[0].workers < sorted_tasks[0].wanted) {
                let task = sorted_tasks[0];

                // Try available creep
                let creep = avail_creeps.get(task.body.name).pop()
                let size;
                if (creep) {
                    creep.memory.task = task.compress();
                    size = creep.memory.size;
                }

                // Try spawning
                if (!creep) {
                    let spawner = spawners.pop()
                    if (spawner) {
                        [creep, size] = task.body.spawn(spawner, task, task.wanted - task.workers);
                    }
                }

                // Update task fullfillment
                if (creep) {
                    task.workers += size;
                    for (let i = 0; i < sorted_tasks.length - 1; i++) {
                        // Compare to next task
                        let next_task = sorted_tasks[i+1];
                        if ((task.workers / task.wanted) <= (next_task.workers / next_task.wanted)) { break; }

                        // Swap with next task
                        sorted_tasks[task.i] = next_task;
                        sorted_tasks[next_task.i] = task;
                    }
                } else {
                    sorted_tasks.shift();
                }
            }
        }

        // Inter-room

        // Recycle idle
        for (let body of avail_creeps.values()) {
            for (let creep of body) {
                creep.memory.task = new Recycle(creep.ticksToLive < 500);
            }
        }
    }

    // Do tasks
    for (let creepname in Game.creeps) {
        let creep = Game.creeps[creepname];

        // Do task
        if (creep.memory.task && TASKS[creep.memory.task.name]) {
            TASKS[creep.memory.task.name].doTask(creep);
        } else {
            creep.memory.task = new Recycle();
        }
    }

    // Apply visuals
    for (let room_name in Game.rooms) {
        let room = Game.rooms[room_name];

        let new_visuals = []
        for (let i in room.memory.visuals) {
            let [text, x, y, ticks, opts] = room.memory.visuals[i];
            if (ticks) {
                if (typeof text == "object") {
                    for (let i = 0; i < text.length; i++) {
                        room.visual.text(text[i], x, y + parseInt(i), opts);
                    }
                } else {
                    room.visual.text(text, x, y, opts);
                }
                new_visuals.push([text, x, y, ticks-1, opts]);
            }
        }
        room.memory.visuals = new_visuals;
    }
}