const config = require("config");

utils = {

    // Find the nearest src for a resource
    findSrc: function(creep, resource=RESOURCE_ENERGY, in_opts={}) {
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
        if (src && src.store && src.store.getUsedCapacity(resource)) { return src; }

        // Find new src
        let srcs = [];
        if (opts.trash) {
            // Drops
            srcs.push(creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (d) => d.resourceType == resource && (opts.partial || d.amount >= creep.store.getFreeCapacity(resource))}));
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

    // Find the best src for based on room resource distribution
    bestSrc: function(creep, resource=RESOURCE_ENERGY) {
        let src;

        // Try decayables
        let srcs = [];
        // Drops
        srcs.push(creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (d) => d.resourceType == resource}));
        // Tombstones
        srcs.push(creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (t) => t.store.getUsedCapacity(resource)}));
        // Ruin
        srcs.push(creep.pos.findClosestByPath(FIND_RUINS, {filter: (r) => r.store.getUsedCapacity(resource)}));

        // Also try most full flagged
        let cur = 0;
        let flagged_srcs = []
        for (let structure of creep.room.find(FIND_STRUCTURES, {filter: (s) => s.store && s.store.getUsedCapacity(resource) &&
            (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) &&
            s.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_GREY).length})) {
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
    doSrc: function(creep, src, resource=RESOURCE_ENERGY) {
        // Try withdraw
        let result = creep.withdraw(src, resource);

        // Try pickup
        if (result == ERR_INVALID_TARGET) { result = creep.pickup(src) }

        // Try harvest
        if (result == ERR_INVALID_TARGET) { result = creep.harvest(src) }

        // Move in range
        if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(src, {visualizePathStyle: {stroke: "#ffa500"}}) }

        return result;
    },

    // Find the best dst based on room resource distribution
    bestDst: function(creep, resource=RESOURCE_ENERGY) {
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

    // Find the nearest dst for a resource.
    findDst: function(creep, resource=RESOURCE_ENERGY, in_opts=null) {
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
        if (opts.spawners) {
            dsts.push(creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => s.my &&
                (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) &&
                (s.store.getFreeCapacity(resource) && (opts.partial || s.store.getFreeCapacity(resource) >= creep.store.getUsedCapacity(resource)))}));
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

    // Deposit to a dst
    doDst: function(creep, dst, resource=RESOURCE_ENERGY) {
        // Try transfer
        let result = creep.transfer(dst, resource);

        // Move in range
        if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(dst, {visualizePathStyle: {stroke: "#1e90ff"}}) }

        return result;
    },

    // Genereate a fresh metrics object
    freshMetrics: function() {
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
            build: 0,
            build_max: 0,
            build_per: 0,
            upgrade: 0,
            upgrade_per: 0,
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
    freshCounters: function() {
        let counts = {
            build: 0,
            repair: 0,
            upgrade: 0,
            harvest: {},
        }
        for (let resource of RESOURCES_ALL) {
            counts.harvest[resource] = 0;
        }
        return counts;
    },

    doChange: function(prev, cur, ticks=config.TASK_TICK) {
        let result = {};
        for (let i in prev) {
            if (typeof prev[i] == "object") { result[i] = utils.doChange(prev[i], cur[i], ticks)}
            else { result[i] = (cur[i] - prev[i]) / ticks }
        }
        return result;
    },

    doMov: function(prev, cur, ticks=1) {
        let result = {};
        for (let i in prev) {
            if (typeof prev[i] == "object") { result[i] = utils.doMov(prev[i], cur[i], ticks)}
            else { result[i] = prev[i] * (1 - config.MOV_N) + (cur[i] / ticks) * config.MOV_N }
        }
        return result;
    },

    // Compute metrics for a room and update memory
    roomMetrics: function(room) {
        // Initialize
        let metrics = utils.freshMetrics();

        // Process structures
        for (let structure of room.find(FIND_STRUCTURES, {filter: (s) => s.my || !s.owner})) {
            // Process damage
            if (structure.hitsMax) {
                metrics.hits += structure.hits;
                metrics.hits_max += structure.hitsMax;
                if (structure.hits < structure.hitsMax * 0.1) {
                    room.memory.visuals.push(["🔥"+(Math.round(100*structure.hits / structure.hitsMax))+"%", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                } else if (structure.hits < structure.hitsMax * 0.5) {
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
                    if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_GREY).length) {
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
        for (let creep of room.find(FIND_MY_CREEPS)) {
            for (let resource of RESOURCES_ALL) {
                metrics.resources.total[resource] += creep.store.getUsedCapacity(resource);
                metrics.resources.free[resource] += creep.store.getUsedCapacity(resource);
            }
        }

        // Process construction sites
        for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            metrics.build += site.progress;
            metrics.build_max += site.progressTotal;
            room.memory.visuals.push(["🔨"+(Math.round(100*site.progress / site.progressTotal))+"%", site.pos.x, site.pos.y, config.TASK_TICK]);
        }
        if (metrics.build_max) { metrics.build_per = metrics.build / metrics.build_max }

        // Process controller
        let controller = room.controller;
        if (controller && controller.my) {
            for (let i = 1; i < controller.level - 1; i++) {
                metrics.upgrade_total += CONTROLLER_LEVELS[i];
            }
            metrics.upgrade_total += controller.progress;
            metrics.upgrade = controller.progress;
            metrics.upgrade_per = metrics.upgrade / CONTROLLER_LEVELS[controller.level]
        }

        // Update memory
        if (!room.memory.metrics) { utils.reset(room.name, metrics) }
        else {
            let prev_metrics = room.memory.metrics;
    
            last_mov = utils.doMov(prev_metrics.last_mov, metrics);
            change = utils.doChange(prev_metrics.last, metrics);
            change_mov = utils.doMov(prev_metrics.change_mov, change);
            count_mov = utils.doMov(prev_metrics.count_mov, prev_metrics.count);
    
            room.memory.metrics = {
                last: metrics,
                last_mov: last_mov,
                change: change,
                change_mov: change_mov,
                count: utils.freshCounters(),
                count_mov: count_mov,
                tick: Game.time,
            }
        }
    },

    // Display a room's metrics
    showMetrics(room) {
        if (!room.memory.metrics) {return}
        let metrics = room.memory.metrics;

        // Build visuals
        let text = ["[ Room: " + room.name + " (" + (Game.time - metrics.tick) + ") ]"];

        text.push("[ Controller ]")
        text.push("Progress: " + room.controller.progress + " (" + (Math.round(10000*room.controller.progress/room.controller.progressTotal)/100) + "%)");
        text.push("Rate: " + Math.round(metrics.change_mov.upgrade) + " (" + (Math.round(10000000*metrics.change_mov.upgrade_per)/100000) + "%)")

        // Apply visuals
        for (let i = 0; i < text.length; i++) {
            room.visual.text(text[i], 0, 0 + parseInt(i) + 0.5, {align: "left"});
        }
    },

    // Clear visuals & metrics
    reset: function(room_name=null, metrics=null) {
        if (room_name) {
            Game.rooms[room_name].memory.visuals = [];
            Game.rooms[room_name].memory.sightings = {};
            if (metrics) {
                Game.rooms[room_name].memory.metrics = {
                    last: JSON.parse(JSON.stringify(metrics)),
                    last_mov: JSON.parse(JSON.stringify(metrics)),
                    change: utils.freshMetrics(),
                    change_mov: utils.freshMetrics(),
                    count: utils.freshCounters(),
                    mov_count: utils.freshCounters(),
                    tick: Game.time,
                }
            } else {
                Game.rooms[room_name].memory.metrics = null;
            }
        } else {
            for (let room_name in Game.rooms) {
                utils.reset(room_name, metrics);
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