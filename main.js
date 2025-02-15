utils = require("utils");

StockSpawn = require("task.stock_spawn");

TASKS = {
    "StockSpawn": StockSpawn,
}

Memory.room_energies = {};
Memory.room_energy_changes = {};

module.exports.loop = function() {
    // Cleanup dead creeps
    if (Game.time % 50 == 0) {
        for (let creep in Memory.creeps) {
            if (!Game.creeps[creep]) {
                delete Memory.creeps[creep];
            }
        }
    }

    // Update tasks
    if (Game.time % 10 == 0) {
        for (let room_name in Game.rooms) {
            // Get room info
            let room = Game.rooms[room_name];
            let spawners = room.find(FIND_MY_SPAWNS, {filter: (spawner) => !spawner.spawning });

            // Get current assignments
            let total_avail = 0;
            let total_busy = 0;
            let avail_creeps = new Map();
            let busy_creeps = new Map();
            for (let creep of room.find(FIND_MY_CREEPS)) {
                if (creep.memory.task) {
                    if (!busy_creeps.get(creep.memory.task.id)) { busy_creeps.set(creep.memory.task.id, []) }
                    busy_creeps.get(creep.memory.task.id).push(creep);
                    total_busy++;
                } else if (creep.memory.body && avail_creeps.get(creep.memory.body)) {
                    if (!avail_creeps.get(creep.memory.body)) { avail_creeps.set(creep.memory.body, []) }
                    avail_creeps.get(creep.memory.body).push(creep);
                    total_avail++;
                }
            }

            // Get unfilled tasks
            let tasks = [];
            let lowest;
            for (let task_name in TASKS) {
                for (let task of TASKS[task_name].getTasks(room)) {
                    if (!avail_creeps.has(task.body.name)) { avail_creeps.set(task.body.name, []) }
                    if (!busy_creeps.has(task.id)) { busy_creeps.set(task.id, []) }
                    task.wanted = task.workers - busy_creeps.get(task.id).length;
                    if (task.wanted > 0) { tasks.push(task); console.log(task.id + ": " + busy_creeps.get(task.id).length + " / " + task.workers) }
                    if (!lowest || task.wanted < lowest) { lowest = task.wanted }
                }
            }

            // Assign creeps
            tasks_loop:
            while (tasks.length > 0) {
                // Dequeue
                let task = tasks.shift();
                for (let i = 0; i < Math.ceil(task.wanted / lowest); i++) {
                    // Find available creep
                    let creep = avail_creeps.get(task.body.name).pop()

                    // Spawn creep
                    if (!creep) {
                        let spawner = spawners.pop()
                        if (spawner) {
                            creep = task.body.spawn(spawner, task);
                        }
                    }

                    // Update busy_creeps
                    if (creep) { 
                        console.log(creep + " to " + task.id);
                        busy_creeps.get(task.id).push(creep); }

                    // Check if done assigning
                    if (!creep || busy_creeps.get(task.id).length >= task.wanted) { continue tasks_loop ;}
                }

                // Re-queue if needed
                tasks.push(task);
            }
        }
    }

    // Do tasks
    for (let creepname in Game.creeps) {
        let creep = Game.creeps[creepname];

        // Do task
        if (creep.memory.task && TASKS[creep.memory.task.name]) {
            TASKS[creep.memory.task.name].doTask(creep);
        }
    }
}