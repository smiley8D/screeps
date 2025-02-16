const utils = require("utils");

const StockSpawn = require("task.stock_spawn");
const Mine = require("task.mine");
const Repair = require("task.repair");
const Build = require("task.build");
const Upgrade = require("task.upgrade");
const Stock = require("task.stock");
const Recycle = require("task.recycle");

TASKS = {
    // "StockSpawn": StockSpawn,
    "Mine": Mine,
    "Repair": Repair,
    "Build": Build,
    "Upgrade": Upgrade,
    "Stock": Stock,
    "Recycle": Recycle
}

module.exports.loop = function() {
    // Cleanup
    if (Game.time % 50 == 0) {
        for (let creep in Memory.creeps) {
            if (!Game.creeps[creep]) {
                delete Memory.creeps[creep];
            }
        }
    }

    let avail_creeps;

    // Assign tasks
    if (Game.time % 10 == 0) {
        let room_tasks = new Map();
        let room_creeps = new Map();

        // Intra-room
        for (let room_name in Game.rooms) {
            // Get room info
            let room = Game.rooms[room_name];
            let spawners = room.find(FIND_MY_SPAWNS, {filter: (spawner) => !spawner.spawning });

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

            // Get current assignments
            for (let creep of room.find(FIND_MY_CREEPS)) {
                if (creep.ticksToLive > 100 && creep.memory.task && tasks.has(creep.memory.task.id) && tasks.get(creep.memory.task.id).workers < tasks.get(creep.memory.task.id).wanted) {
                    // Mark assigned
                    let task = tasks.get(creep.memory.task.id);
                    task.workers++;

                    // Update task fulfillment
                    let i = 0
                    while (task.i < sorted_tasks.length - 1) {
                        // Compare to next task
                        let next_task = sorted_tasks[task.i+1];
                        if ((task.weight * task.workers / task.wanted) <= (next_task.weight * next_task.workers / next_task.wanted)) { break; }

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
                creep = avail_creeps.get(task.body.name).pop()
                if (creep) { creep.memory.task = task.compress() }

                // Try spawning
                if (!creep) {
                    let spawner = spawners.pop()
                    if (spawner) {
                        creep = task.body.spawn(spawner, task);
                    }
                }

                // Update task fullfillment
                if (creep) {
                    task.workers++;
                    for (let i = 0; i < sorted_tasks.length - 1; i++) {
                        // Compare to next task
                        let next_task = sorted_tasks[i+1];
                        if ((task.weight * task.workers / task.wanted) <= (next_task.weight * next_task.workers / next_task.wanted)) { break; }

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
        for (let name in avail_creeps) {
            let creep = avail_creeps[name];
            creep.memory.task = new Recycle(true);
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
}