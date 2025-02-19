const config = require("config");

utils = {

    // Find the nearest src for a resource
    findSrc: function(creep, resource=undefined, in_opts={}) {
        // Setup opts
        let opts = {
            partial: true,
            trash: true,
            containers: true,
            sources: false,
            haulers: true
        }
        for (let opt in in_opts) {
            opts[opt] = in_opts[opt];
        }

        // Check current src
        let src = Game.getObjectById(creep.memory.curSrc);
        if (src && ((src.resourceType == resource || (src.resourceType && !resource)) || (src.store && src.store.getUsedCapacity(resource)))) { return src; }

        // Find new src
        let srcs = [];
        if (opts.trash) {
            // Drops
            srcs.push(creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (d) => (d.resourceType == resource || !resource) && (opts.partial || d.amount >= creep.store.getFreeCapacity(resource))}));
            // Tombstones
            srcs.push(creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (t) => t.store.getUsedCapacity(resource) && (opts.partial || t.store.getUsedCapacity(recycle) >= creep.store.getFreeCapacity(resource))}));
            // Ruin
            srcs.push(creep.pos.findClosestByPath(FIND_RUINS, {filter: (r) => r.store.getUsedCapacity(resource) && (opts.partial || r.store.getUsedCapacity(recycle) >= creep.store.getFreeCapacity(resource))}));
        }
        // Containers
        if (opts.containers) {
            srcs.push(creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) =>
                (s.structureType == STRUCTURE_STORAGE || s.structureType == STRUCTURE_CONTAINER) &&
                (s.store.getUsedCapacity(resource) && (opts.partial || s.store.getUsedCapacity(resource) >= creep.store.getFreeCapacity(resource)))
            }));
        }
        // Sources
        if (opts.sources && resource == RESOURCE_ENERGY) {
            srcs.push(creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE));
        }
        // Haulers
        if (opts.haulers) {

        }

        // Find valid src
        let valid_srcs = [];
        for (let i in srcs) {
            if (srcs[i]) { valid_srcs.push(srcs[i]) }
        }
        src = creep.pos.findClosestByPath(valid_srcs);

        // Update cache
        if (src) {
            creep.memory.curSrc = src.id;
            return src;
        } else {
            creep.memory.curSrc = null;
            return;
        }
    },

    // Find the best src based on room resource distribution
    bestSrc: function(creep, resource) {
        let src;

        // Try decayables
        let srcs = [];
        // Drops
        srcs.push(creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (d) => d.resourceType == resource || !resource}));
        // Tombstones
        srcs.push(creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (t) => t.store.getUsedCapacity(resource)}));
        // Ruin
        srcs.push(creep.pos.findClosestByPath(FIND_RUINS, {filter: (r) => r.store.getUsedCapacity(resource)}));

        // Also try most full flagged
        let cur = 0;
        let flagged_srcs = []
        for (let structure of creep.room.find(FIND_STRUCTURES, {filter: (s) => s.store && s.store.getUsedCapacity(resource) &&
            (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) &&
            s.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_GREY || f.color == COLOR_ORANGE).length})) {
            let fill = structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)
            if (fill > cur) {
                flagged_srcs = [structure]
                cur = fill;
            } else if (fill == cur) {
                flagged_srcs.push(structure);
            }
        }

        let valid_srcs = [];
        for (let i in srcs) {
            if (srcs[i]) { valid_srcs.push(srcs[i]) }
        }
        for (let i in flagged_srcs) {
            if (flagged_srcs[i]) { valid_srcs.push(flagged_srcs[i]) }
        }
        src = creep.pos.findClosestByPath(valid_srcs);

        // Try most full unflagged
        if (!src) {
            let cur = 0;
            let srcs = [];

            for (let structure of creep.room.find(FIND_STRUCTURES, {filter: (s) => s.store && s.store.getUsedCapacity(resource) &&
                (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.pos.lookFor(LOOK_FLAGS).length == 0})) {
                let fill = structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)
                if (fill > cur) {
                    srcs = [structure]
                    cur = fill;
                } else if (fill == cur) {
                    srcs.push(structure);
                }
            }

            let valid_srcs = [];
            for (let i in srcs) {
                if (srcs[i]) { valid_srcs.push(srcs[i]) }
            }
            src = creep.pos.findClosestByPath(valid_srcs);
        }

        return src;
    },

    // Withdraw from a src
    doSrc: function(creep, src, resource=undefined) {
        let result = ERR_NOT_FOUND;

        // Try withdraw
        if (resource) {result = creep.withdraw(src, resource) }

        // Try pickup
        if (result == ERR_INVALID_TARGET) { result = creep.pickup(src) }

        // Try harvest
        if (result == ERR_INVALID_TARGET) { result = creep.harvest(src) }

        // Move in range
        if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(src, {visualizePathStyle: {stroke: "#ffa500"}}) }

        return result;
    },

    // Find the nearest dst based on room resource distribution
    findDst: function(creep, resource=undefined, in_opts=null) {
        // Setup opts
        let opts = {
            partial: true,
            containers: true,
            haulers: true,
            spawners: true
        }
        for (let opt in in_opts) {
            opts[opt] = in_opts[opt];
        }

        // Check current dst
        let dst = Game.getObjectById(creep.memory.curDst);
        if (dst && dst.store && dst.store.getFreeCapacity(resource)) { return dst; }

        // Find new dst
        let dsts = []
        // Containers
        if (opts.containers) {
            dsts.push(creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) =>
            ((s.structureType == STRUCTURE_STORAGE && s.my) || s.structureType == STRUCTURE_CONTAINER) &&
            (s.store.getFreeCapacity(resource) && (opts.partial || s.store.getFreeCapacity(resource) >= creep.store.getUsedCapacity(resource)))}));
        }
        // Haulers
        if (opts.haulers) {
            dsts.push();
        }
        // Spawners
        if (opts.spawners && (resource == RESOURCE_ENERGY || (!resource && creep.store.getUsedCapacity(RESOURCE_ENERGY)))) {
            dsts.push(creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => s.my &&
                (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) &&
                (s.store.getFreeCapacity(RESOURCE_ENERGY) && (opts.partial || s.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.store.getUsedCapacity(RESOURCE_ENERGY)))}));
        }

        // Find valid dst
        let valid_dsts = [];
        for (let i in dsts) {
            if (dsts[i]) { valid_dsts.push(dsts[i]) }
        }
        dst = creep.pos.findClosestByPath(valid_dsts);

        // Update cache
        if (dst) {
            creep.memory.curDst = dst.id;
            return dst;
        } else {
            creep.memory.curDst = null;
            return;
        }
    },

    // Find the best dst based on room resource distribution
    bestDst: function(creep, resource=undefined) {
        let dst;

        // Try spawn containers
        dst = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => s.my && (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getFreeCapacity(resource)});

        // Try flagged
        if (!dst) {
            let cur = 1;
            let dsts = [];

            for (let structure of creep.room.find(FIND_STRUCTURES, {filter: (s) => s.store && s.store.getFreeCapacity(resource) && s.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == utils.resource_flag[resource]).length})) {
                let fill = structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)
                if (fill < cur) {
                    dsts = [structure]
                    cur = fill;
                } else if (fill == cur) {
                    dsts.push(structure);
                }
            }

            let valid_dsts = [];
            for (let i in dsts) {
                if (dsts[i]) { valid_dsts.push(dsts[i]) }
            }
            dst = creep.pos.findClosestByPath(valid_dsts);
        }

        // Try non-containers
        if (!dst) {
            let cur = 1;
            let dsts = [];

            for (let structure of creep.room.find(FIND_STRUCTURES, {filter: (s) => s.store && s.store.getFreeCapacity(resource) && s.structureType != STRUCTURE_CONTAINER && s.structureType != STRUCTURE_STORAGE})) {
                let fill = structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)
                if (fill < cur) {
                    dsts = [structure]
                    cur = fill;
                } else if (fill == cur) {
                    dsts.push(structure);
                }
            }

            let valid_dsts = [];
            for (let i in dsts) {
                if (dsts[i]) { valid_dsts.push(dsts[i]) }
            }
            dst = creep.pos.findClosestByPath(valid_dsts);
        }

        // Try most empty unflagged
        if (!dst) {
            let cur = 1;
            let dsts = [];

            for (let structure of creep.room.find(FIND_STRUCTURES, {filter: (s) => s.store && s.store.getFreeCapacity(resource) && s.pos.lookFor(LOOK_FLAGS).length == 0})) {
                let fill = structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)
                if (fill < cur) {
                    dsts = [structure]
                    cur = fill;
                } else if (fill == cur) {
                    dsts.push(structure);
                }
            }

            let valid_dsts = [];
            for (let i in dsts) {
                if (dsts[i]) { valid_dsts.push(dsts[i]) }
            }
            dst = creep.pos.findClosestByPath(valid_dsts);
        }

        return dst;
    },

    // Deposit to a dst
    doDst: function(creep, dst, resource=undefined) {
        let result;
        if (!resource) {
            // Try any present resources
            for (let resource of RESOURCES_ALL) {
                if (creep.store.getUsedCapacity(resource)) { result = creep.transfer(dst, resource)}
                if (result == OK || result == ERR_NOT_IN_RANGE) { break }
            }
        } else {
            // Try transfer of defined resource
            result = creep.transfer(dst, resource);
        }

        // Move in range
        if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(dst, {visualizePathStyle: {stroke: "#1e90ff"}}) }

        return result;
    },

    // Genereate a fresh room metrics object
    freshRoomMetrics: function() {
        let metrics = {
            resources: {
                total: {},
                over: {},
                under: {},
                fill: {},
                fill_max: {},
                fill_avg: {},
                imbalance: {},
                free: {}
            },
            hits: 0,
            hits_max: 0,
            hits_per: 0,
            damage: 0,
            build: 0,
            build_max: 0,
            build_per: 0,
            upgrade: 0,
            upgrade_total: 0,
            upgrade_per: 0,
            creeps: 0,
            creeps_cost: 0
        }
        for (let resource of RESOURCES_ALL) {
            metrics.resources.total[resource] = 0;
            metrics.resources.over[resource] = 0;
            metrics.resources.under[resource] = 0;
            metrics.resources.fill[resource] = 0;
            metrics.resources.fill_max[resource] = 0;
            metrics.resources.imbalance[resource] = 0;
            metrics.resources.free[resource] = 0;
        }
        return metrics;
    },

    // Generate a fresh counts object
    freshRoomCounters: function() {
        let counts = {
            build: 0,
            build_spend: 0,
            repair: 0,
            repair_spend: 0,
            upgrade: 0,
            upgrade_spend: 0,
            harvest: {},
            spawn: 0
        }
        for (let resource of RESOURCES_ALL) {
            counts.harvest[resource] = 0;
        }
        return counts;
    },

    doChange: function(prev, cur, ticks) {
        let result = {};
        for (let i in prev) {
            if (typeof prev[i] == "object") { result[i] = utils.doChange(prev[i], cur[i], ticks)}
            else if (ticks > 0) { result[i] = (cur[i] - prev[i]) / ticks }
            else { result[i] = 0 }
        }
        return result;
    },

    doMov: function(prev, cur) {
        let result = {};
        for (let i in prev) {
            if (typeof prev[i] == "object") { result[i] = utils.doMov(prev[i], cur[i])}
            else { result[i] = prev[i] * (1 - config.MOV_N) + cur[i] * config.MOV_N }
        }
        return result;
    },

    // Compute metrics for a room and update memory
    roomMetrics: function(room) {
        // Check can collect metrics
        if (!room.memory) { return }

        // Initialize
        let metrics = utils.freshRoomMetrics();

        // Process structures
        for (let structure of room.find(FIND_STRUCTURES)) {
            // Process damage
            if (structure.hitsMax && structure.structureType != STRUCTURE_WALL && structure.structureType != STRUCTURE_RAMPART) {
                metrics.damage += structure.hitsMax - structure.hits
                metrics.hits += structure.hits;
                metrics.hits_max += structure.hitsMax;
                if (structure.hits < structure.hitsMax * 0.1) {
                    room.memory.visuals.push(["🔥"+(Math.round(100*structure.hits / structure.hitsMax))+"%", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                } else if (structure.hits < structure.hitsMax * 0.5) {
                    room.memory.visuals.push(["🔧"+(Math.round(100*structure.hits / structure.hitsMax))+"%", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                } else if (structure.hits < structure.hitsMax) {
                    room.memory.visuals.push(["🔧", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                }
            } else if (structure.hitsMax) {
                // Configurable wall upgrade threshold
                metrics.damage += Math.max(0, (structure.hitsMax * config.DEFENSE_PER) - structure.hits);
                metrics.hits += Math.min(structure.hits, structure.hitsMax * config.DEFENSE_PER);
                metrics.hits_max += structure.hitsMax * config.DEFENSE_PER;
                if (structure.hits < (structure.hitsMax * config.DEFENSE_PER) * 0.1) {
                    room.memory.visuals.push(["🔥"+(Math.round(100*structure.hits / (structure.hitsMax * config.DEFENSE_PER)))+"%", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                } else if (structure.hits < (structure.hitsMax * config.DEFENSE_PER) * 0.5) {
                    room.memory.visuals.push(["🔧"+(Math.round(100*structure.hits / (structure.hitsMax * config.DEFENSE_PER)))+"%", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                } else if (structure.hits < (structure.hitsMax * config.DEFENSE_PER)) {
                    room.memory.visuals.push(["🔧", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                }
            }

            // Process inventory
            if (structure.store) {
                // Process resources
                for (let resource of RESOURCES_ALL) {
                    metrics.resources.total[resource] += structure.store.getUsedCapacity(resource);
                }

                // Find imbalance
                if (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE) {
                    if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_GREY || f.color == COLOR_ORANGE).length) {
                        // Flagged as empty
                        if (structure.store.getUsedCapacity()) { room.memory.visuals.push(["⬇︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                        for (let resource of RESOURCES_ALL) {
                            metrics.resources.over[resource] += structure.store.getUsedCapacity(resource);
                        }
                    } else if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => utils.flag_resource[f.color]).length) {
                        // Flagged as fill
                        if (structure.store.getFreeCapacity(utils.flag_resource[structure.pos.lookFor(LOOK_FLAGS)[0].color])) { room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                        metrics.resources.under[utils.flag_resource[structure.pos.lookFor(LOOK_FLAGS)[0].color]] += structure.store.getFreeCapacity(utils.flag_resource[structure.pos.lookFor(LOOK_FLAGS)[0].color]);
                    } else {
                        // Non-flagged container/storage, build average
                        for (let resource of RESOURCES_ALL) {
                            if (metrics.resources.fill[resource] += structure.store.getUsedCapacity(resource)) {
                                metrics.resources.fill_max[resource] += structure.store.getCapacity(resource);
                            }
                        }
                    }
                    // Process available resources
                    for (let resource of RESOURCES_ALL) {
                        metrics.resources.free[resource] += structure.store.getUsedCapacity(resource);
                    }
                } else {
                    // Not a container or storage, always fill
                    for (let resource of RESOURCES_ALL) {
                        metrics.resources.under[resource] += structure.store.getFreeCapacity(resource);
                        if (structure.store.getFreeCapacity(resource)) { room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                    }
                }
            }
        }
        if (metrics.hits_max) { metrics.hits_per = metrics.hits / metrics.hits_max }

        // Process over/under averages
        for (let resource of RESOURCES_ALL) {
            if (metrics.resources.fill[resource]) {
                metrics.resources.fill_avg[resource] = metrics.resources.fill[resource] / metrics.resources.fill_max[resource];
            }
        }
        for (let structure of room.find(FIND_STRUCTURES, { filter: (s) => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) &&
            !s.pos.lookFor(LOOK_FLAGS).length })) {
            for (let resource of RESOURCES_ALL) {
                let diff = structure.store.getCapacity(resource) * ((structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)) - metrics.resources.fill_avg[resource]);
                if (diff > 0) {
                    metrics.resources.over[resource] += diff;
                    room.memory.visuals.push(["⬇︎", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                } else if (diff < 0) {
                    metrics.resources.under[resource] -= diff;
                    room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                }
            }
        }

        // Compute imbalances
        for (let resource of RESOURCES_ALL) {
            metrics.resources.imbalance[resource] = Math.max(metrics.resources.over[resource], metrics.resources.under[resource]);
        }

        // Process decayables
        for (let drop of room.find(FIND_DROPPED_RESOURCES)) {
            let resource = drop.resourceType;
            metrics.resources.total[resource] += drop.amount;
            metrics.resources.over[resource] += drop.amount;
            metrics.resources.free[resource] += drop.amount;
        }
        for (let structure of room.find(FIND_TOMBSTONES).concat(room.find(FIND_RUINS))) {
            for (let resource of RESOURCES_ALL) {
                metrics.resources.total[resource] += structure.store.getUsedCapacity(resource);
                metrics.resources.over[resource] += structure.store.getUsedCapacity(resource);
                metrics.resources.free[resource] += structure.store.getUsedCapacity(resource);
            }
        }

        // Process creeps
        for (let creep of room.find(FIND_CREEPS)) {
            // Update costs
            metrics.creeps++;
            if (creep.memory && creep.memorycost) {
                // Cost cached, use that
                metrics.creeps_cost += (creep.memory.cost / 1500)
            }
            else {
                // Cost not cached, calculate
                for (let i in creep.body) {
                    metrics.creeps_cost += (BODYPART_COST[creep.body[i].type] / 1500);
                }
            }
            for (let resource of RESOURCES_ALL) {
                metrics.resources.total[resource] += creep.store.getUsedCapacity(resource);
                metrics.resources.free[resource] += creep.store.getUsedCapacity(resource);
            }
        }

        // Process construction sites
        for (let site of room.find(FIND_CONSTRUCTION_SITES)) {
            metrics.build += site.progress;
            metrics.build_max += site.progressTotal;
            room.memory.visuals.push(["🔨"+(Math.round(100*site.progress / site.progressTotal))+"%", site.pos.x, site.pos.y, config.TASK_TICK]);
        }
        if (metrics.build_max) { metrics.build_per = metrics.build / metrics.build_max }

        // Process controller
        let controller = room.controller;
        if (controller) {
            for (let i = 1; i < controller.level - 1; i++) {
                metrics.upgrade_total += CONTROLLER_LEVELS[i];
            }
            metrics.upgrade_total += controller.progress;
            metrics.upgrade = controller.progress;
            metrics.upgrade_per = metrics.upgrade / CONTROLLER_LEVELS[controller.level]
        }

        // Update memory
        let prev_metrics = room.memory.metrics;

        // Last will be set to current metrics
        let last = metrics;

        // Get new last_mov
        let last_mov;
        if (prev_metrics) { last_mov = utils.doMov(prev_metrics.last_mov, last) }
        else { last_mov = last }

        // Get change
        let change;
        if (prev_metrics) { change = utils.doChange(prev_metrics.last, metrics, Game.time - prev_metrics.tick)}
        else { change = null }

        // Get change_mov
        let change_mov;
        if (prev_metrics && prev_metrics.change_mov) { change_mov = utils.doMov(prev_metrics.change_mov, change)}
        else if (prev_metrics) { change_mov = change }

        // Get count
        let count;
        if (prev_metrics) { count = utils.freshRoomCounters() }
        else { count = null }

        // Get count_mov
        if (prev_metrics && prev_metrics.count_mov) { count_mov = utils.doMov(prev_metrics.count_mov, utils.doChange(count, prev_metrics.count, Game.time - prev_metrics.tick)) }
        else if (prev_metrics && prev_metrics.count) {  count_mov = utils.doMov(prev_metrics.count, utils.doChange(count, prev_metrics.count, Game.time - prev_metrics.tick))}
        else { count_mov = null }

        room.memory.metrics = {
            last: last,
            last_mov: last_mov,
            change: change,
            change_mov: change_mov,
            count: count,
            count_mov: count_mov,
            tick: Game.time,
        }
    },

    // Compute all metrics
    globalMetrics: function() {
        // Reset if needed
        if (!Memory.metrics) { utils.reset() }

        // Compute room metrics
        for (let room_name in Game.rooms) {
            utils.roomMetrics(Game.rooms[room_name]);
        }

        // Compute global metrics
    },

    // Display metrics visuals
    showMetrics() {
        // Room metrics
        for (let room_name in Game.rooms) {
            let room = Game.rooms[room_name];

            // Show global metrics
            if (Memory.metrics) {
                let metrics = Memory.metrics;

                // Build visuals
                let text = ["[ Shard: " + Game.shard.name+ " ]"];

                text.push("CPU: " + (Math.round(100*metrics.cpu_mov)/100) + " (" + (Math.round(1000*metrics.cpu_mov/Game.cpu.limit)/10) + "%)");
                text.push("Bucket: " + Game.cpu.bucket + " (" + (Math.round(1000*Game.cpu.bucket/10000)/10) + "%)")

                // Apply visuals
                for (let i = 0; i < text.length; i++) {
                    room.visual.text(text[i], 49, parseInt(i) + 0.5, {align: "right"});
                }
            }

            // Show room metrics
            if (room.memory.metrics && room.memory.metrics.change_mov && room.memory.metrics.count_mov) {
                let metrics = room.memory.metrics;

                // Build visuals
                let text = ["[ Room: " + room.name + " (" + (Game.time - metrics.tick) + ") ]"];

                if (room.controller) {
                    // Upgrade/controller info
                    text.push("RCL " + (room.controller.level + 1) + ": " + (room.controller.progressTotal - room.controller.progress) +
                        " (" + (Math.round(10000*room.controller.progress/room.controller.progressTotal)/100) + "%) @ " + Math.round(metrics.change_mov.upgrade_total) +
                        "/t (" + Math.ceil(room.controller.progressTotal / metrics.change_mov.upgrade_total) + " t)")
                }

                // Repair & build info
                if (metrics.last.damage) {text.push(
                    "Repairing: " + metrics.last.damage + " (" + (Math.round(10000*metrics.last.hits/metrics.last.hits_max)/100) + "%) @ " +
                    Math.round(-1 * metrics.change_mov.damage) + "/t (" + Math.ceil(metrics.last.damage / (-1 * metrics.change_mov.damage)) + " t)"
                )}
                if (metrics.last.build) {text.push(
                    "Building: " + metrics.last.build + " (" + (Math.round(10000*metrics.last.build_per)/100) + "%) @ " +
                    Math.round(metrics.change_mov.build) + "/t (" + Math.ceil(metrics.last.build_max / metrics.change_mov.build) + " t)"
                )}

                // Balances
                let header = false;
                for (let resource of RESOURCES_ALL) {
                    if (metrics.last.resources.free[resource]) {
                        if (!header) {
                            text.push("[ Resources ]");
                            header = true;
                        }
                        text.push(resource.charAt(0).toUpperCase() + resource.slice(1) + ": " + metrics.last.resources.free[resource] + " @ " + (Math.round(100*metrics.change_mov.resources.free[resource])/100) +
                        "/t" + ((metrics.change_mov.resources.free[resource] < 0) ? " (" + Math.floor(-1*metrics.last.resources.free[resource]/metrics.change_mov.resources.free[resource]) + " t)" : "") +
                        ((metrics.last.resources.imbalance[resource] > 500) ? " (" + Math.round(metrics.last.resources.imbalance[resource]) + " i)" : ""))
                    }
                }

                // Energy flows
                if (metrics.last.resources.total[RESOURCE_ENERGY]) {
                    let inflow_total = metrics.count_mov.harvest[RESOURCE_ENERGY];
                    let outflow_total = metrics.count_mov.upgrade_spend + metrics.count_mov.repair_spend + metrics.count_mov.build_spend + metrics.last_mov.creeps_cost;
                    let transfer = metrics.change_mov.resources.total[RESOURCE_ENERGY];
                    if (transfer > 0) {outflow_total += transfer}
                    else {inflow_total -= transfer}
    
                    // In
                    if (inflow_total) {text.push("[ Energy Inflows ]")}
                    if (metrics.count_mov.harvest[RESOURCE_ENERGY]) {text.push("Harvested: " + (Math.round(100*metrics.count_mov.harvest[RESOURCE_ENERGY])/100) + " (" + (Math.round(1000*metrics.count_mov.harvest[RESOURCE_ENERGY]/inflow_total)/10)
                    + "%) (" + (Math.round(100*metrics.count_mov.harvest[RESOURCE_ENERGY]/(room.find(FIND_SOURCES).length))/10) + "% eff)")}
                    if (transfer < 0) {text.push("Transfer: " + (Math.round(-100*transfer)/100) + " (" + (Math.round(-1000*transfer/inflow_total)/10) + ")")}
    
                    // Out
                    if (outflow_total) {text.push("[ Energy Outflows ]")}
                    if (metrics.count_mov.upgrade_spend) {text.push("Upgrades: " + (Math.round(100*metrics.count_mov.upgrade_spend)/100) + " (" + (Math.round(1000*metrics.count_mov.upgrade_spend/outflow_total)/10) + "%)")}
                    if (metrics.count_mov.repair_spend) {text.push("Repairs: " + (Math.round(100*metrics.count_mov.repair_spend)/100) + " (" + (Math.round(1000*metrics.count_mov.repair_spend/outflow_total)/10) + "%)")}
                    // if (metrics.count_mov.spawn) {text.push("Spawns: " + (Math.round(100*metrics.count_mov.spawn)/100) + " (" + (Math.round(1000*metrics.count_mov.spawn/outflow_total)/10) + "%)")}
                    if (metrics.last_mov.creeps_cost) {text.push("Creeps: " + (Math.round(100*metrics.last_mov.creeps_cost)/100) + " (" + (Math.round(1000*metrics.last_mov.creeps_cost/outflow_total)/10) + "%)")}
                    if (transfer > 0) {text.push("Transfer: " + (Math.round(100*transfer)/100) + " (" + (Math.round(1000*transfer/outflow_total)/10) + "%)")}
                }

                // Apply visuals
                for (let i = 0; i < text.length; i++) {
                    room.visual.text(text[i], 0, parseInt(i) + 0.5, {align: "left"});
                }
            } else {
                // Show indicator that metrics are loading
                room.visual.text("[ Room: " + room.name + " metrics loading... ]", 0, 0.5, {align: "left"});
            }
        }
    },

    // Get a sorted list of nearby room names
    getNearbyRooms: function(queue=null, cur=[], dists={}) {
        let room = queue.shift();

        // Add current room if initializing
        if (dists[room] == undefined) {dists[room] = 0}
        let dist = dists[room];

        // Base case
        if (!room) { return cur }

        // Add self
        cur.push(room);

        // Queue neighbors if distance ok
        if (dist < config.MAX_SEARCH_ROOMS) {
            for (let direction in Game.map.describeExits(room)) {
                let neighbor = Game.map.describeExits(room)[direction];

                // Queue if not duplicate
                if (dists[neighbor] == undefined) {
                    queue.push(neighbor);
                    dists[neighbor] = dist + 1;
                }
            }
        }

        // Recurse
        return utils.getNearbyRooms(queue, cur, dists);
    },

    // Clear visuals & metrics
    reset: function(room_name=null, metrics=false, sightings=false, neighbors=false) {
        if (room_name) {
            console.log("resetting",room_name);
            if (!Memory.rooms[room_name]) {Memory.rooms[room_name] = {}}
            let memory = Memory.rooms[room_name];
            memory.visuals = [];
            if (sightings || !memory.sightings) {
                memory.sightings = {};
                console.log("resetting sightings");
            }
            if (neighbors || !memory.neighbors) {
                memory.neighbors = utils.getNearbyRooms([room_name]);
                console.log("resetting neighbors");
            }
            if (metrics || !memory.metrics) {
                memory.metrics = null;
                console.log("resetting metrics");
            }
            if (Game.rooms[room_name]) {
                utils.roomMetrics(Game.rooms[room_name]);
                console.log("calculating metrics");
            }
        } else {
            console.log("resetting",Game.shard.name);
            for (let room_name in Game.rooms) {
                utils.reset(room_name, metrics, sightings, neighbors);
            }
            for (let room_name in Memory.rooms) {
                if (Game.rooms[room_name]) {continue}
                utils.reset(room_name, metrics, sightings, neighbors);
            }
            Memory.metrics = {
                cpu_mov: 0
            }
        }
    },

    // Mapping of resources to flags
    resource_flag: {
        "energy": COLOR_YELLOW
    },

    // Mapping of flags to resources
    flag_resource: {
        6: RESOURCE_ENERGY
    }

}

module.exports = utils;