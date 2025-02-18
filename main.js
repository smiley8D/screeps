const utils = require("utils");
const config = require("config");

const Mine = require("task.mine");
const Repair = require("task.repair");
const Build = require("task.build");
const Upgrade = require("task.upgrade");
const Stock = require("task.stock");
const Recycle = require("task.recycle");

const TASKS = {
    "Mine": Mine,
    "Stock": Stock,
    "Repair": Repair,
    "Build": Build,
    "Upgrade": Upgrade,
    "Recycle": Recycle
}

module.exports.loop = function() {
    // Tower defenses
    for (let room_name in Game.rooms) {
        let room = Game.rooms[room_name];
        let creeps;
        if (creeps = room.find(FIND_HOSTILE_CREEPS)) {
            for (let tower of room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER})) {
                let hostile = tower.pos.findClosestByRange(creeps);
                if (hostile) {
                    tower.attack(hostile);
                    console.log(tower.pos,"attacking",hostile.pos);
                }
            }

            // Log
            room.memory.last_sighting = Game.time;
        }
    }

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
                let creep;
                let task;
                if (spawner.spawning) { creep = Game.creeps[spawner.spawning.name] }
                if (creep) { task = tasks.get(creep.memory.task.id) }
                if (!creep) {
                    spawners.push(spawner);
                } else if (!task ||
                    task.parts >= task.wanted ||
                    task.workers >= task.max_workers) {
                    spawner.spawning.cancel;
                    spawners.push(spawner);
                }
            }

            // Get current assignments
            for (let creep of room.find(FIND_MY_CREEPS)) {
                if (creep.ticksToLive > 100 && creep.memory.task && tasks.has(creep.memory.task.id) &&
                tasks.get(creep.memory.task.id).parts < tasks.get(creep.memory.task.id).wanted &&
                tasks.get(creep.memory.task.id).workers < tasks.get(creep.memory.task.id).max_workers) {
                    // Mark assigned
                    let task = tasks.get(creep.memory.task.id);
                    task.parts += creep.memory.size;
                    task.workers++;

                    // Update task fulfillment
                    while (task.i < sorted_tasks.length - 1) {
                        // Compare to next task
                        let next_task = sorted_tasks[task.i+1];
                        if ((task.parts / task.wanted) <= (next_task.parts / next_task.wanted)) { break; }

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
            while (sorted_tasks.length > 0 && sorted_tasks[0].parts < sorted_tasks[0].wanted) {
                let task = sorted_tasks[0];

                // Skip if already at max_workers
                if (task.workers >= task.max_workers) {
                    sorted_tasks.shift();
                    continue;
                }

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
                        [creep, size] = task.body.spawn(spawner, task, task.wanted - task.parts);
                    }
                }

                // Update task fullfillment
                if (creep) {
                    task.parts += size;
                    task.workers++;
                    for (let i = 0; i < sorted_tasks.length - 1; i++) {
                        // Compare to next task
                        let next_task = sorted_tasks[i+1];
                        if ((task.parts / task.wanted) <= (next_task.parts / next_task.wanted)) { break; }

                        // Swap with next task
                        sorted_tasks[i] = next_task;
                        sorted_tasks[i+1] = task;
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
                creep.memory.task = new Recycle(creep.ticksToLive < 500 || creep.room.energyAvailable < creep.room.energyCapacityAvailable * 0.5);
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

        utils.showMetrics(room);
    }
}