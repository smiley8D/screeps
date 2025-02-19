const utils = require("utils");
const config = require("config");

const Mine = require("task.mine");
const Repair = require("task.repair");
const Build = require("task.build");
const Upgrade = require("task.upgrade");
const Stock = require("task.stock");
const Recycle = require("task.recycle");
const Dismantle = require("task.dismantle");
const Scout = require("task.scout");

const TASKS = {
    "Mine": Mine,
    "Stock": Stock,
    "Repair": Repair,
    "Build": Build,
    "Upgrade": Upgrade,
    "Recycle": Recycle,
    "Dismantle": Dismantle,
    "Scout": Scout
}

module.exports.loop = function() {
    // Initialize memory
    if (!Memory.metrics) {utils.reset()}

    // Cleanup memory
    if (Game.time % config.CLEANUP_TICK == 0) {
        for (let creep in Memory.creeps) {
            if (!Game.creeps[creep]) {
                delete Memory.creeps[creep];
            }
        }
    }

    // Process last tick events
    for (let room_name in Game.rooms) {
        let room = Game.rooms[room_name];
        if (!room.memory.metrics) {utils.reset(room_name)}
        if (!room.memory.metrics.count) {continue}

        let build = 0;
        let build_spend = 0;
        let repair = 0;
        let repair_spend = 0;
        let upgrade = 0;
        let upgrade_spend = 0;
        let harvest = {};

        // Process events
        let events = room.getEventLog();
        for (let i in events) {
            let event = events[i];
            if (event.event == EVENT_BUILD) {
                build += event.data.amount;
                // Docs say this should be energySpent, but this field doesn't exist
                build_spend += event.data.amount;
            } else if (event.event == EVENT_REPAIR) {
                repair += event.data.amount;
                repair_spend += event.data.energySpent;
            } else if (event.event == EVENT_UPGRADE_CONTROLLER) {
                upgrade += event.data.amount;
                upgrade_spend += event.data.energySpent;
            } else if (event.event == EVENT_HARVEST) {
                let resource = RESOURCE_ENERGY;
                let tgt = Game.getObjectById(event.data.targetId );
                if (tgt.resourceType) { resource = tgt.resourceType }
                if (!harvest[resource]) { harvest[resource] = 0 }
                harvest[resource] += event.data.amount;
            }
        }

        // Update memory
        room.memory.metrics.count.build += build;
        room.memory.metrics.count.build_spend += build_spend;
        room.memory.metrics.count.repair += repair;
        room.memory.metrics.count.repair_spend += repair_spend;
        room.memory.metrics.count.upgrade += upgrade;
        room.memory.metrics.count.upgrade_spend += upgrade_spend;
        for (let resource in harvest) {
            room.memory.metrics.count.harvest[resource] += harvest[resource];
        }
    }

    // Tower defenses
    for (let room_name in Game.rooms) {
        let room = Game.rooms[room_name];
        let enemies;
        if (enemies = room.find(FIND_HOSTILE_CREEPS).concat(room.find(FIND_HOSTILE_POWER_CREEPS),room.find(FIND_HOSTILE_STRUCTURES),room.find(FIND_HOSTILE_SPAWNS))) {
            for (let tower of room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER})) {
                let hostile = tower.pos.findClosestByRange(enemies);
                if (hostile) {
                    tower.attack(hostile);
                }
            }

            // Log
            if (enemies.length) {
                room.memory.sightings[enemies[0].owner.username] = Game.time;
            }
        }
    }

    // Assign tasks
    if (Game.time % config.TASK_TICK == 0) {
        // Update metrics
        utils.globalMetrics();
    
        // Generate tasks
        let tasks = new Map();
        let sorted_tasks = [];
        for (let task_name in TASKS) {
            for (let task of TASKS[task_name].getTasks()) {
                if (task.wanted <= 0) {continue}
                if (tasks.has(task.id)) {console.log("Duplicate task:",task.id)}
                tasks.set(task.id, task)
                task.i = sorted_tasks.length;
                sorted_tasks.push(task);
                if (!Memory.rooms[task.room]) {utils.reset(task.room)}
            }
        }

        // Get available spawners
        let avail_spawns = new Map();
        for (let spawner in Game.spawns) {
            spawner = Game.spawns[spawner];
            if (!avail_spawns.has(spawner.room.name)) {avail_spawns.set(spawner.room.name,[])}
            let spawners = avail_spawns.get(spawner.room.name);

            // Check if spawning
            let creep;
            let task;
            if (spawner.spawning) { creep = Game.creeps[spawner.spawning.name] }
            if (creep) { task = tasks.get(creep.memory.task.id) }
            if (!creep) {
                // Mark available
                spawners.push(spawner);
            } else if (!task ||
                task.parts >= task.wanted ||
                task.workers >= task.max_workers) {
                // Cancel unneeded spawns and mark available
                spawner.spawning.cancel();
                spawners.push(spawner);
            }
        }

        // Get available creeps
        let avail_creeps = new Map();
        for (let creep in Game.creeps) {
            creep = Game.creeps[creep];
            if (!avail_creeps.has(creep.room.name)) {avail_creeps.set(creep.room.name,new Map())}
            let creeps = avail_creeps.get(creep.room.name);

            if (creep.ticksToLive > 100 && creep.memory.task && tasks.has(creep.memory.task.id) &&
            tasks.get(creep.memory.task.id).parts < tasks.get(creep.memory.task.id).wanted &&
            tasks.get(creep.memory.task.id).workers < tasks.get(creep.memory.task.id).max_workers) {
                // Creep already assigned and unavailable
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
                if (!creeps.get(creep.memory.body)) { creeps.set(creep.memory.body, []) }
                creep.memory.task = null;
                creeps.get(creep.memory.body).push(creep);
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

            // Try creeps and spawners by distance
            let creep;
            let size;
            for (let i in Memory.rooms[task.room].neighbors) {
                room = Memory.rooms[task.room].neighbors[i];

                // Try creep
                if (avail_creeps.get(room) && avail_creeps.get(room).get(task.body.name)) {
                    creep = avail_creeps.get(room).get(task.body.name).pop();
                }
                if (creep) {
                    creep.memory.task = task.compress();
                    size = creep.memory.size;
                    break;
                }

                // Try spawner
                if (avail_spawns.get(room)) {
                    let spawner = avail_spawns.get(room).pop();
                    if (spawner) {
                        [creep, size] = task.body.spawn(spawner, task, task.wanted - task.parts);
                    }
                }
                if (creep) { break };
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

        // Recycle idle
        for (let room of avail_creeps.values()) {
            for (let body of room.values()) {
                for (let creep of body) {
                    creep.memory.task = new Recycle().compress();
                }
            }
        }
    }

    // Do tasks
    for (let creepname in Game.creeps) {
        let creep = Game.creeps[creepname];

        // Do task
        if (creep.memory.task && TASKS[creep.memory.task.name]) {
            TASKS[creep.memory.task.name].doTask(creep);
        } else if (creep.memory.body) {
            creep.memory.task = new Recycle().compress();
        }
    }

    // Note CPU usage
    if (Memory.metrics) {
        Memory.metrics.cpu_mov = Memory.metrics.cpu_mov * (1 - config.MOV_N) + Game.cpu.getUsed() * config.MOV_N;
    }

    // Paint visuals
    utils.showMetrics();
    for (let room_name in Game.rooms) {
        let room = Game.rooms[room_name];
        if (!room.memory.visuals) {continue;}

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