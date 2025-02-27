const utils = require("utils");
const config = require("config");

const Drudge = require("body.drudge");
const Body = require("body");

const Build = require("task.build");
const Claim = require("task.claim");
const Dismantle = require("task.dismantle");
const Garbage = require("task.garbage");
const Mine = require("task.mine");
const Pioneer = require("task.pioneer");
const Recycle = require("task.recycle");
const Repair = require("task.repair");
const Scout = require("task.scout");
const Stock = require("task.stock");
const Supply = require("task.supply");
const Upgrade = require("task.upgrade");

const TASKS = {
    "Garbage": Garbage,
    "Pioneer": Pioneer,
    "Mine": Mine,
    "Stock": Stock,
    "Supply": Supply,
    "Repair": Repair,
    "Build": Build,
    "Upgrade": Upgrade,
    "Claim": Claim,
    "Recycle": Recycle,
    "Dismantle": Dismantle,
    "Scout": Scout
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
        // Cleanup unvisited/unflagged room metrics
        for (let room in Memory.rooms) {
            if (Memory.rooms[room].metrics && Memory.rooms[room].metrics.tick < (Game.time - (config.SCOUT_TICK * 2)) && !Object.values(Game.flags).some((f)=>f.pos.roomName === room)) {
                delete Memory.rooms[room].metrics;
            }
            // Check if room data empty
            if (Memory.rooms[room].metrics && Object.keys(Memory.rooms[room].metrics).length) { continue }
            if (Memory.rooms[room].sightings && Object.keys(Memory.rooms[room].sightings).length) { continue }
            if (Memory.rooms[room].survey && Object.keys(Memory.rooms[room].survey).length) { continue }
            if (Memory.rooms[room].visuals && Memory.rooms[room].visuals.length) { continue }
            delete Memory.rooms[room];
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
                let tgt = Game.getObjectById(event.data.targetId);
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
            if (creep && creep.memory.task) { task = tasks.get(creep.memory.task.id) }
            if (!creep) {
                if (!avail_spawns.has(spawner.room.name)) {avail_spawns.set(spawner.room.name,[])}
                let spawners = avail_spawns.get(spawner.room.name);
                // Mark available
                spawners.push(spawner);
            }
        }

        // Get available creeps
        let avail_creeps = new Map();
        for (let creep of Object.keys(Game.creeps).filter((c)=>Game.creeps[c].memory.body).sort((a,b)=>Game.creeps[b].memory.size - Game.creeps[a].memory.size)) {
            creep = Game.creeps[creep];

            // Get replace time
            let replace_ticks = 100;
            if (creep.memory.size) { replace_ticks = creep.memory.size * 3}
            let spawn = Game.spawns[creep.memory.spawn];
            if (spawn) { replace_ticks += 50 * Game.map.getRoomLinearDistance(creep.room.name, spawn.room.name) }

            if (creep.ticksToLive > replace_ticks && creep.memory.task && tasks.has(creep.memory.task.id) &&
            tasks.get(creep.memory.task.id).parts < tasks.get(creep.memory.task.id).wanted &&
            tasks.get(creep.memory.task.id).workers < tasks.get(creep.memory.task.id).max_workers) {
                // Creep already assigned and unavailable
                let task = tasks.get(creep.memory.task.id);
                task.parts += creep.memory.size;
                task.workers++;

                // Only boot other creeps if actually in position
                if (creep.room.name === task.room) {
                    task.active_parts += creep.memory.size;
                    task.active_workers++;
                }

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
            } else if ((creep.ticksToLive > replace_ticks) && (!creep.memory.task || !tasks.has(creep.memory.task.id) ||
                tasks.get(creep.memory.task.id).active_parts >= tasks.get(creep.memory.task.id).wanted ||
                tasks.get(creep.memory.task.id).active_workers >= tasks.get(creep.memory.task.id).max_workers)) {
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

            // Try creeps and spawners in range of search rooms
            let creep;
            let cost_wanted = task.body.cost(task.wanted);

            creep_weight = function(room, dist) {
                // Creep weight based on size and distance, limiting by ticks left
                let result = null;
                if (avail_creeps.has(task.body.name) && avail_creeps.get(task.body.name).has(room) &&
                    avail_creeps.get(task.body.name).get(room)[0].ticksToLive > ((100 + 50 * dist)) &&
                    (dist === 0 || task.body.name != "Drudge")) {
                    result = Math.min(1, (avail_creeps.get(task.body.name).get(room)[0].memory.size / task.wanted)) / Math.max(1, ((dist+1)**2) * task.body.weight * avail_creeps.get(task.body.name).get(room)[0].memory.size)
                }
                return result;
            }

            spawn_weight = function(room, dist) {
                // Room weight based on avail energy and distance
                let result = null;
                if (avail_spawns.has(room) && Game.rooms[room].energyAvailable > task.body.base_cost &&
                    (Game.rooms[room].energyAvailable >= cost_wanted || Game.rooms[room].energyAvailable === Game.rooms[room].energyCapacityAvailable || task.name === 'Pioneer')) {
                    result = Math.min(1, (Game.rooms[room].energyAvailable / cost_wanted)) / Math.max(1, ((dist+1)**2) * task.body.weight * task.wanted)
                }
                return result;
            }

            let creep_room;
            if (task.workers < task.max_workers) { creep_room = utils.searchNearbyRooms(task.search_rooms.slice(0), task.max_search, creep_weight, 'best') }
            if (creep_room) {
                // Assign available creep
                creep = avail_creeps.get(task.body.name).get(creep_room).shift();
                size = creep.memory.size;
                creep.memory.task = task.compress();
                if (avail_creeps.get(task.body.name).get(creep_room).length === 0) {avail_creeps.get(task.body.name).delete(creep_room)}
                if (avail_creeps.get(task.body.name).size === 0) {avail_creeps.delete(task.body.name)}
            }
            if (!creep) {
                let spawn_room = utils.searchNearbyRooms(task.search_rooms.slice(0), task.max_search, spawn_weight, 'best');
                if (spawn_room) {
                    // Use available spawner
                    let spawner = avail_spawns.get(spawn_room).pop();
                    if (avail_spawns.get(spawn_room).length === 0) {avail_spawns.delete(spawn_room)}
                    if (spawner.room.name != task.room && task.body instanceof Drudge) {
                        [creep, size] = new Body().spawn(spawner, task, task.wanted);
                    } else {
                        [creep, size] = task.body.spawn(spawner, task, task.wanted);
                    }
                }
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
            visuals = Memory.rooms[room].visuals;
            let i = 0;
            for (; i < room_tasks[room].length; i++) {
                let task = room_tasks[room][i];
                visuals.push([task.id+": "+task.parts+" / "+Math.round(task.wanted), 0, 48.5-i, config.TASK_TICK, {align: "left"}]);
            }
            visuals.push(["[ Tasks: " + room_tasks[room].length + " ]", 0, 48.5-i, config.TASK_TICK, {align: "left"}]);
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

    // Balance links
    link_loop:
    for (let room of Object.values(Game.rooms)) {
        // Skip unowned
        if (!room.controller || !room.controller.my) { continue }

        // Build queues
        let fill = [];
        let empty = [];
        let other = [];
        for (let link of room.find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_LINK}})) {
            if (link.pos.lookFor(LOOK_FLAGS).some((f) => f.color === COLOR_WHITE && link.store.getFreeCapacity(RESOURCE_ENERGY))) {fill.push(link)}
            else if (link.pos.lookFor(LOOK_FLAGS).some((f) => f.color === COLOR_GREY && link.store.getUsedCapacity(RESOURCE_ENERGY))) {empty.push(link)}
            else if (!link.pos.lookFor(LOOK_FLAGS).some((f) => f.color === COLOR_WHITE || f.color === COLOR_GREY)) {other.push(link)}
        }

        // Sort
        fill.sort((a,b) => a.store.getUsedCapacity(RESOURCE_ENERGY) - b.store.getUsedCapacity(RESOURCE_ENERGY));
        empty.sort((a,b) => a.store.getFreeCapacity(RESOURCE_ENERGY) - b.store.getFreeCapacity(RESOURCE_ENERGY));
        other.sort((a,b) => a.store.getUsedCapacity(RESOURCE_ENERGY) - b.store.getUsedCapacity(RESOURCE_ENERGY));

        // Satisfy empty flags
        while (empty.length && !empty[0].store.getFreeCapacity(RESOURCE_ENERGY)) {
            let empty_link = empty.shift();
            let dst = fill.shift();
            if (!dst) { dst = other.shift() }
            if (!dst) { break }
            empty_link.transferEnergy(dst);
        }

        // Satify fill flags
        while (fill.length && !fill[0].store.getUsedCapacity(RESOURCE_ENERGY)) {
            let fill_link = fill.shift();
            let src = empty.pop();
            if (!src) { src = other.pop() }
            if (!src) { break }
            src.transferEnergy(fill_link);
        }
    }

    // Order creeps
    let task_cpu = {};
    for (let creepname in Game.creeps) {
        let creep = Game.creeps[creepname];
        let result = ERR_NOT_FOUND;
        let start = Game.cpu.getUsed();
        let task_name = 'Unassigned';

        if (creep.memory.task) {
            task_name = creep.memory.task.name;
        }

        // Contact handling

        // // Renewal if nearby
        // if (task_name != "Unassigned" && task_name != "Recycle" && creep.ticksToLive < 1400 && creep.room.energyAvailable / creep.room.energyCapacityAvailable > 0.5 && (creep.ticksToLive < 1000 || creep.memory.renewing) && !creep.getActiveBodyparts(CLAIM) && creep.memory.body != "Drudge") {
        //     let spawns = creep.pos.findInRange(FIND_MY_SPAWNS, 5, {filter: (s) => !s.spawning});
        //     if (spawns.length) {
        //         creep.memory.renewing = true;
        //         creep.moveTo(spawns[0]);
        //         spawns[0].renewCreep(creep);
        //         if (TASKS[task_name] && TASKS[task_name].emoji) {
        //             creep.say("❤️" + TASKS[task_name].emoji() + creep.memory.task.detail)
        //         } else {
        //             creep.say("❤️")
        //         }
        //         continue
        //     } else if (creep.ticksToLive > 500) {
        //         delete creep.memory.renewing;
        //     }
        // } else if (creep.memory.renewing) {
        //     delete creep.memory.renewing;
        // }

        // Room navigation
        if (creep.memory.room && (creep.memory.room != creep.room.name || creep.pos.x % 49 === 0 || creep.pos.y % 49 === 0)) {
            result = creep.moveTo(new RoomPosition(25, 25, creep.memory.room), {resusePath: 50, visualizePathStyle: {}});
        } else if (creep.memory.room) { delete creep.memory.room }
 
        if (!creep.memory.room) {

            // Do task
            if (TASKS[task_name]) {
                result = TASKS[task_name].doTask(creep);
            } else if (task_name != "Recycle" && creep.memory.body) {
                creep.memory.task = new Recycle(creep).compress();
            }
        }

        // Show result
        if (creep.memory.task && TASKS[task_name] && TASKS[task_name].emoji) {
            if (creep.memory.room) {
                creep.say(TASKS[task_name].emoji() + creep.memory.task.detail + creep.memory.room + (result != OK ? result : ''))
            } else {
                creep.say(TASKS[task_name].emoji() + creep.memory.task.detail + (result != OK ? result : ''));
            }
        }

        // Track cost & CPU usage
        if (!task_cpu[task_name]) { task_cpu[task_name] = 0 }
        let used = Game.cpu.getUsed() - start;
        task_cpu[task_name] += (used);
    }

    // Update task cost CPU usage
    for (let task in task_cpu) {
        if (!Memory.metrics.cpu_tasks[task]) { Memory.metrics.cpu_tasks[task] = task_cpu[task] }
        else { Memory.metrics.cpu_tasks[task] = (Memory.metrics.cpu_tasks[task] * (1 - config.MOV_N)) + (task_cpu[task] * config.MOV_N) }
    }

    // CPU check
    cpu_used = Game.cpu.getUsed();
    Memory.metrics.cpu_order = Memory.metrics.cpu_order * (1 - config.MOV_N) + (cpu_used - cpu_count) * config.MOV_N;
    cpu_count = cpu_used;

    // Paint visuals
    utils.showMetrics();

    // Spawning information
    for (let spawn of Object.values(Game.spawns)) {
        if (!spawn.spawning) { continue }
        let creep = Game.creeps[spawn.spawning.name];
        if (!creep || !creep.memory || !creep.memory.task || !TASKS[creep.memory.task.name] || !TASKS[creep.memory.task.name].emoji) { continue }
        spawn.room.visual.text(creep.memory.size + TASKS[creep.memory.task.name].emoji() + creep.memory.task.room, spawn.pos.x, spawn.pos.y - 0.75);
    }

    // Include flagged rooms
    let rooms = Object.assign({}, Game.rooms);
    for (let flag of Object.values(Game.flags)) {
        if (!rooms[flag.pos.roomName]) {rooms[flag.pos.roomName] = flag}
    }
    for (let room_name in rooms) {
        if (!Memory.rooms[room_name]) { continue }
        let visuals = Memory.rooms[room_name].visuals;
        if (!visuals) {continue;}
        let visual = new RoomVisual(room_name);

        let new_visuals = []
        for (let i in visuals) {
            let [text, x, y, ticks, opts] = visuals[i];
            if (ticks > 0) {
                if (typeof text === "object") {
                    for (let i = 0; i < text.length; i++) {
                        visual.text(text[i], x, y + parseInt(i), opts);
                    }
                } else {
                    visual.text(text, x, y, opts);
                }
                new_visuals.push([text, x, y, ticks-1, opts]);
            }
        }
        Memory.rooms[room_name].visuals = new_visuals;
    }

    // Final CPU check
    cpu_used = Game.cpu.getUsed();
    Memory.metrics.cpu_visual = Memory.metrics.cpu_visual * (1 - config.MOV_N) + (cpu_used - cpu_count) * config.MOV_N;
    Memory.metrics.cpu_total = Memory.metrics.cpu_total * (1 - config.MOV_N) + cpu_used * config.MOV_N;
}