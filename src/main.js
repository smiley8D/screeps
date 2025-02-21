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

    // Update metrics
    if (Game.time % config.METRIC_TICK === 0) {
        utils.globalMetrics();
    }

    // Assign tasks
    if (Game.time % config.TASK_TICK === 0) {
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
            } else if (!task ||
                task.parts >= task.wanted ||
                task.workers >= task.max_workers) {
                if (!avail_spawns.has(spawner.room.name)) {avail_spawns.set(spawner.room.name,[])}
                let spawners = avail_spawns.get(spawner.room.name);
                if (spawner.room.memory.metrics && spawner.room.memory.metrics.count && creep.memory.cost) { spawner.room.memory.metrics.count.spawn -= creep.memory.cost }
                // Cancel unneeded spawns and mark available
                spawner.spawning.cancel();
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
                if (!creeps.get(creep.room.name)) { creeps.set(creep.room.name, []) }
                creep.memory.task = null;
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

            // Try creeps and spawners in same or adjacent rooms
            let creep;
            let size;
            for (let i in task.search_rooms) {
                let search_room = task.search_rooms[i];
                let room = utils.searchNearbyRooms([search_room], (r) => avail_spawns.get(r) || (avail_creeps.get(task.body.name) && avail_creeps.get(task.body.name).get(r)), task.max_search);
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
                    [creep, size] = task.body.spawn(spawner, task, Math.min(task.wanted, 1.5*(task.wanted - task.parts)));
                }
                if (creep) { break }
            }

            // Update task fullfillment
            if (creep) {
                if (creep.memory) {
                    creep.memory.curSrc = null;
                    creep.memory.curDst = null;
                    creep.memory.room = null;
                    creep.memory.curTgt = null;
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
                visuals.push([task.id+": "+task.parts+" / "+Math.round(task.wanted)+" ("+task.workers+")", 0, 48.5-i, config.TASK_TICK, {align: "left"}]);
            }
            visuals.push(["[ Tasks: " + room_tasks[room].length + " ]", 0, 48.5-i, config.TASK_TICK, {align: "left"}]);
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

    // Order creeps
    for (let creepname in Game.creeps) {
        let creep = Game.creeps[creepname];

        // Contact handling

        // Room navigation
        if (creep.memory.room && (creep.memory.room != creep.room.name || creep.pos.x % 49 === 0 || creep.pos.y % 49 === 0)) {
            creep.moveTo(new RoomPosition(25, 25, creep.memory.room), {resusePath: 50, visualizePathStyle: {}});
            if (creep.memory.task && creep.memory.task.emoji) {
                creep.say(creep.memory.task.emoji + creep.memory.room);
            } else {
                creep.say("⛵" + creep.memory.room);
            }
            continue;
        }
 
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
    for (let room_name in Memory.rooms) {
        let visuals = Memory.rooms[room_name].visuals;
        if (!visuals) {continue;}
        let visual = new RoomVisual(room_name);

        let new_visuals = []
        for (let i in visuals) {
            let [text, x, y, ticks, opts] = visuals[i];
            if (ticks) {
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
}