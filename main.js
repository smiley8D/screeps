utils = require("utils");

UpgradeTask = require("task.upgrade");
BuildTask = require("task.build");
StockTask = require("task.stock");
RepairTask = require("task.repair");
MineTask = require("task.mine");
RenewTask = require("task.renew");

TASKS = {
    "mine": MineTask,
    "stock": StockTask,
    "repair": RepairTask,
    "upgrade": UpgradeTask,
    "build": BuildTask,
    "renew": RenewTask,
}

StockSpawn = require("task.stock_spawn");

TASKS_NEW = {
    "StockSpawn": StockSpawn,
}

Memory.room_energies = {};
Memory.room_energy_changes = {};

module.exports.loop = function() {
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
            for (let task_name in TASKS_NEW) {
                for (let task of TASKS_NEW[task_name].getTasks(room)) {
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

    let spawner = Game.spawns["Spawn1"];

    if (Game.time % 50 == 0) {
        // Remove dead creeps
        let kill_counter = 0;
        for (let creep in Memory.creeps) {
            if (!Game.creeps[creep]) {
                delete Memory.creeps[creep];
                kill_counter++;
            }
        }
    }

    if (Game.time % 10 == 0) {
        // Update tasks
        let tasks = new Map();
        let room_limit = new Map();
        let task_locks = new Map();

        // Generate tasks
        for (let taskname in TASKS) {
            TASKS[taskname].getTasks(tasks, room_limit);
        }

        let avail_creeps = [];

        // Check creep tasks
        for (let creepname in Game.creeps) {
            let creep = Game.creeps[creepname];
            let task = creep.memory.task;
            if (creep.ticksToLive < 50) {
                // Creep will die soon, prepare to replace
            } else if (task && !tasks.has(task.id)) {
                // Continue outdated task
            } else if (task && tasks.get(task.id).local_limit > 0 && room_limit[task.name] > 0) {
                // Continue task
                tasks.get(task.id).local_limit--;
                room_limit[task.name]--;
            } else {
                // Mark available
                creep.memory.task = null

                // Apply task locks
                if (creep.memory.task_lock) {
                    if (!task_locks.has(creep.memory.task_lock)) {
                        task_locks.set(creep.memory.task_lock, []);
                    }
                    task_locks.get(creep.memory.task_lock).push(creep);
                } else {
                    avail_creeps.push(creep);
                }
            }
        }

        // Check tasks
        let lock_spawn = false;
        if (spawner.spawning) {lock_spawn = true};
        for (let [id, task] of tasks) {
            creep_loop:
            while (task.local_limit > 0 && room_limit[task.name] > 0) {
                // Assign existing creep
                let creep;
                if (task.task_lock) {
                    if (task_locks.get(task.name)) {
                        creep = task_locks.get(task.name).pop()
                    }
                } else {
                    creep = avail_creeps.pop();
                }
                if (creep) {
                    creep.memory.task = task;
                    task.local_limit--;
                    room_limit[task.name]--;
                    continue;
                }

                if (spawner.memory.lastEnergy == spawner.room.energyAvailable && !lock_spawn && !spawner.spawning) {
                    // Spawn correct body
                    let name = "worker-";
                    let body = task.body_base;
                    if (task.task_lock)  {name = task.task_lock + "-"}
                    let i = 0;
                    for (; i < task.body_limit; i++) {
                        let result = spawner.spawnCreep(body.concat(task.body_add), Game.time, {dryRun: true});
                        if (result != ERR_NOT_ENOUGH_RESOURCES) {
                            body = body.concat(task.body_add)
                        } else {
                            break;
                        }
                    }

                    let result = spawner.spawnCreep(body, name + Game.time, {memory:{task: task, task_lock: task.task_lock}});
                    if (result == OK) {
                        console.log("Spawning " + name + Game.time + " size " + i + " for " + task.id);
                        task.local_limit--;
                        room_limit[task.name]--;
                        lock_spawn = true;
                        continue creep_loop;
                    }
                }

                break;
            }
        }

        // Handle idle creeps
        for (let creep of avail_creeps) {
            creep.memory.task = new UpgradeTask("W7N2");
        }
        for (let creep_list of task_locks.values()) {
            for (let creep of creep_list) {
                creep.memory.task = new UpgradeTask("W7N2");
            }
        }
    }

    // Do tasks
    for (let creepname in Game.creeps) {
        let creep = Game.creeps[creepname];

        // Do task
        if (creep.memory.task && TASKS[creep.memory.task.name]) {
            TASKS[creep.memory.task.name].doTask(creep);
        } else if (creep.memory.task && TASKS_NEW[creep.memory.task.name]) {
            TASKS_NEW[creep.memory.task.name].doTask(creep);
        }

        // Handle idle creeps
        if (!creep.memory.task) {
            utils.depo(creep);
            if (!creep.memory.curDepo) {
                creep.moveTo(25,25);
            }
        }
    }

    // Update spawn
    spawner.memory.lastEnergy = spawner.room.energyAvailable;

}