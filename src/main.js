const utils = require("utils");
const config = require("config");

const Build = require("task.build");
const Claim = require("task.claim");
const Dismantle = require("task.dismantle");
const Mine = require("task.mine");
const Recycle = require("task.recycle");
const Repair = require("task.repair");
const Scout = require("task.scout");
const Stock = require("task.stock");
const Upgrade = require("task.upgrade");

const TASKS = {
    "Mine": Mine,
    "Stock": Stock,
    "Repair": Repair,
    "Build": Build,
    "Upgrade": Upgrade,
    "Claim": Claim,
    "Recycle": Recycle,
    "Dismantle": Dismantle,
    // "Scout": Scout
}

module.exports.loop = function() {
    // Initialize memory
    if (!Memory.metrics) {utils.reset()}

    // CPU check
    let cpu_used = Game.cpu.getUsed();
    Memory.metrics.cpu_start = Memory.metrics.cpu_start * (1 - config.MOV_N) + cpu_used * config.MOV_N;
    let cpu_count = cpu_used;

    // Cleanup memory
    if (Game.time % config.CLEANUP_TICK === 0) {
        // Cleanup dead creeps
        for (let creep in Memory.creeps) {
            if (!Game.creeps[creep]) {
                delete Memory.creeps[creep];
            }
        }
        // Cleanup unvisited rooms metrics
        for (let room in Memory.rooms) {
            if (Memory.rooms[room].metrics && Memory.rooms[room].metrics.tick < (Game.time - (config.SCOUT_TICK * 2))) {
                delete Memory.rooms[room].metrics;
            }
        }

        // CPU check
        cpu_used = Game.cpu.getUsed();
        Memory.metrics.cpu_cleanup = Memory.metrics.cpu_cleanup * (1 - config.MOV_N) + (cpu_used - cpu_count) * config.MOV_N;
        cpu_count = cpu_used;
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
            if (event.event === EVENT_BUILD) {
                build += event.data.amount;
                // Docs say this should be energySpent, but this field doesn't exist
                build_spend += event.data.amount;
            } else if (event.event === EVENT_REPAIR) {
                repair += event.data.amount;
                repair_spend += event.data.energySpent;
            } else if (event.event === EVENT_UPGRADE_CONTROLLER) {
                upgrade += event.data.amount;
                upgrade_spend += event.data.energySpent;
            } else if (event.event === EVENT_HARVEST) {
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
            if (!room.memory.metrics.count.harvest[resource]) { room.memory.metrics.count.harvest[resource] = 0 }
            room.memory.metrics.count.harvest[resource] += harvest[resource];
        }
    }

    // CPU check
    cpu_used = Game.cpu.getUsed();
    Memory.metrics.cpu_log = Memory.metrics.cpu_log * (1 - config.MOV_N) + (cpu_used - cpu_count) * config.MOV_N;
    cpu_count = cpu_used;

    // Tower defenses
    for (let room_name in Game.rooms) {
        let room = Game.rooms[room_name];
        let enemies;
        if (enemies = room.find(FIND_HOSTILE_CREEPS).concat(room.find(FIND_HOSTILE_POWER_CREEPS),room.find(FIND_HOSTILE_STRUCTURES),room.find(FIND_HOSTILE_SPAWNS))) {
            for (let tower of room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_TOWER})) {
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

    // CPU check
    cpu_used = Game.cpu.getUsed();
    Memory.metrics.cpu_defend = Memory.metrics.cpu_defend * (1 - config.MOV_N) + (cpu_used - cpu_count) * config.MOV_N;
    cpu_count = cpu_used;

    // Update metrics
    if (Game.time % config.METRICS_TICK === 0 && Game.cpu.bucket === 10000) {
        utils.globalMetrics();

        // CPU check
        cpu_used = Game.cpu.getUsed();
        Memory.metrics.cpu_metrics = Memory.metrics.cpu_metrics * (1 - config.MOV_N) + (cpu_used - cpu_count) * config.MOV_N;
        cpu_count = cpu_used;
    }

    // Generate tasks
    if (Game.time % config.TASK_TICK === 0 && Game.cpu.bucket === 10000) {
        let tasks = new Map();
        let sorted_tasks = [];
        for (let task_name in TASKS) {
            for (let task of TASKS[task_name].getTasks()) {
                if (task.wanted <= 0) {continue}
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

            // Check if spawning
            let creep;
            let task;
            if (spawner.spawning) { creep = Game.creeps[spawner.spawning.name] }
            if (creep) { task = tasks.get(creep.memory.task.id) }
            if (!creep) {
                if (!avail_spawns.has(spawner.room.name)) {avail_spawns.set(spawner.room.name,[])}
                let spawners = avail_spawns.get(spawner.room.name);
                // Mark available
                spawners.push(spawner);
            }
        }

        // Get available creeps
        let avail_creeps = new Map();
        for (let creep in Game.creeps) {
            creep = Game.creeps[creep];

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
                if (!avail_creeps.has(creep.memory.body)) {avail_creeps.set(creep.memory.body,new Map())}
                let creeps = avail_creeps.get(creep.memory.body);
                if (!creeps.has(creep.room.name)) { creeps.set(creep.room.name, []) }
                delete creep.memory.task;
                creeps.get(creep.room.name).push(creep);
            }
        }

        // Assign creeps
        while (sorted_tasks.length > 0 && sorted_tasks[0].parts < sorted_tasks[0].wanted && (avail_spawns.size || avail_creeps.size)) {
            let task = sorted_tasks[0];

            // Skip if already at max_workers
            if (task.workers >= task.max_workers) {
                sorted_tasks.shift();
                continue;
            }

            // Try creeps and spawners in range of search rooms
            let creep;
            let size;
            let room = utils.searchNearbyRooms(task.search_rooms.slice(0), task.max_search, ((r,d) => avail_spawns.has(r) || (avail_creeps.has(task.body.name) && avail_creeps.get(task.body.name).has(r))), 'first');
            if (room && avail_creeps.get(task.body.name) && avail_creeps.get(task.body.name).get(room)) {
                // Assign available creep
                creep = avail_creeps.get(task.body.name).get(room).pop();
                size = creep.memory.size;
                creep.memory.task = task.compress();
                if (avail_creeps.get(task.body.name).get(room).length === 0) {avail_creeps.get(task.body.name).delete(room)}
                if (avail_creeps.get(task.body.name).size === 0) {avail_creeps.delete(task.body.name)}
            } else if (avail_spawns.get(room)) {
                // Use available spawner
                let spawner = avail_spawns.get(room).pop();
                if (avail_spawns.get(room).length === 0) {avail_spawns.delete(room)}
                [creep, size] = task.body.spawn(spawner, task, Math.min(task.wanted, 1.5*(task.wanted - task.parts)), task.emergency);
            }

            // Update task fullfillment
            if (creep) {
                if (creep.memory) {
                    delete creep.memory.curSrc;
                    delete creep.memory.curDst;
                    delete creep.memory.room;
                    delete creep.memory.curTgt;
                }
                task.parts += size;
                task.workers++;
                if (avail_creeps.size || avail_spawns.size) {
                    for (let i = 0; i < sorted_tasks.length - 1; i++) {
                        // Compare to next task
                        let next_task = sorted_tasks[i+1];
                        if ((task.parts / task.wanted) <= (next_task.parts / next_task.wanted)) { break; }
    
                        // Swap with next task
                        sorted_tasks[i] = next_task;
                        sorted_tasks[i+1] = task;
                    }
                }
            } else {
                sorted_tasks.shift();
            }
        }

        // Create visuals
        let room_tasks = {}
        for (let task of tasks.values()) {
            if (!room_tasks[task.room]) {room_tasks[task.room] = []}
            room_tasks[task.room].push(task);
        }
        for (let room in room_tasks) {
            let i = 0;
            for (; i < room_tasks[room].length; i++) {
                let task = room_tasks[room][i];
                visuals = Memory.rooms[room].visuals;
                visuals.push([task.id+": "+task.parts+" / "+Math.round(task.wanted)+" ("+task.workers+")", 0, 48.5-i, Game.time, {align: "left"}]);
            }
            visuals.push(["[ Tasks: " + room_tasks[room].length + " ]", 0, 48.5-i, Game.time, {align: "left"}]);
        }

        // Recycle idle
        for (let room of avail_creeps.values()) {
            for (let body of room.values()) {
                for (let creep of body) {
                    creep.memory.task = new Recycle(creep).compress();
                }
            }
        }

        // CPU check
        cpu_used = Game.cpu.getUsed();
        Memory.metrics.cpu_task = Memory.metrics.cpu_task * (1 - config.MOV_N) + (cpu_used - cpu_count) * config.MOV_N;
        cpu_count = cpu_used;
    }

    // Order creeps
    for (let creepname in Game.creeps) {
        let creep = Game.creeps[creepname];
        let result = ERR_NOT_FOUND;

        // Contact handling

        // Room navigation
        if (creep.memory.room && (creep.memory.room != creep.room.name || creep.pos.x % 49 === 0 || creep.pos.y % 49 === 0)) {
            result = creep.moveTo(new RoomPosition(25, 25, creep.memory.room), {resusePath: 50, visualizePathStyle: {}});
        } else if (creep.memory.room) { delete creep.memory.room }

        let task_cpu = {}
 
        // Do task
        if (creep.memory.task && TASKS[creep.memory.task.name]) {
            let start = Game.cpu.getUsed();
            result = TASKS[creep.memory.task.name].doTask(creep);
            if (!task_cpu[creep.memory.task.name]) { task_cpu[creep.memory.task.name] = 0 }
            task_cpu[creep.memory.task.name] += Game.cpu.getUsed() - start;
        } else if (creep.memory.body) {
            creep.memory.task = new Recycle(creep).compress();
        }

        // Update task usage
        for (let task in task_cpu) {
            if (!Memory.metrics.cpu_tasks[task]) { Memory.metrics.cpu_tasks[task] = task_cpu[task] }
            else { Memory.metrics.cpu_tasks[task] = Memory.metrics.cpu_tasks[task] * (1 - config.MOV_N) + task_cpu[task] }
        }

        // Handle room movement
        if (typeof result === 'string') {
            let pos = new RoomPosition(25, 25, result);
            if (pos) { creep.memory.room = result }
        }

        // Show result
        if (creep.memory.task && TASKS[creep.memory.task.name] && TASKS[creep.memory.task.name].emoji) { creep.say(TASKS[creep.memory.task.name].emoji + creep.memory.task.detail + (result != OK ? result : '')) }
    }

    // CPU check
    cpu_used = Game.cpu.getUsed();
    Memory.metrics.cpu_order = Memory.metrics.cpu_order * (1 - config.MOV_N) + (cpu_used - cpu_count) * config.MOV_N;
    cpu_count = cpu_used;

    // Paint visuals
    utils.showMetrics();
    let rooms = Object.keys(Game.rooms).concat(Object.values(Game.flags).filter((f) => f.color === COLOR_PURPLE).map((f) => f.pos.roomName))
    for (let room_name of rooms) {
        if (!Memory.rooms[room_name]) { continue }
        let visuals = Memory.rooms[room_name].visuals;
        if (!visuals) {continue;}
        let visual = new RoomVisual(room_name);

        let new_visuals = []
        for (let i in visuals) {
            let [text, x, y, ticks, opts] = visuals[i];
            if (Memory.rooms[room_name].metrics && ticks >= Memory.rooms[room_name].metrics.tick) {
                if (typeof text === "object") {
                    for (let i = 0; i < text.length; i++) {
                        visual.text(text[i], x, y + parseInt(i), opts);
                    }
                } else {
                    visual.text(text, x, y, opts);
                }
                new_visuals.push([text, x, y, ticks, opts]);
            }
        }
        Memory.rooms[room_name].visuals = new_visuals;
    }

    // Final CPU check
    cpu_used = Game.cpu.getUsed();
    Memory.metrics.cpu_visual = Memory.metrics.cpu_visual * (1 - config.MOV_N) + (cpu_used - cpu_count) * config.MOV_N;
    Memory.metrics.cpu_total = Memory.metrics.cpu_total * (1 - config.MOV_N) + cpu_used * config.MOV_N;
}