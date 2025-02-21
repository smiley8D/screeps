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
        if (src && ((src.resourceType === resource || (src.resourceType && !resource)) || (src.store && src.store.getUsedCapacity(resource)))) { return src; }

        // Find new src
        let srcs = [];
        if (opts.trash) {
            // Drops
            srcs.push(creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (d) => (d.resourceType === resource || !resource) && (opts.partial || d.amount >= creep.store.getFreeCapacity(resource))}));
            // Tombstones
            srcs.push(creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (t) => t.store.getUsedCapacity(resource) && (opts.partial || t.store.getUsedCapacity(recycle) >= creep.store.getFreeCapacity(resource))}));
            // Ruin
            srcs.push(creep.pos.findClosestByPath(FIND_RUINS, {filter: (r) => r.store.getUsedCapacity(resource) && (opts.partial || r.store.getUsedCapacity(recycle) >= creep.store.getFreeCapacity(resource))}));
        }
        // Containers
        if (opts.containers) {
            srcs.push(creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) =>
                (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER) &&
                (s.store.getUsedCapacity(resource) && (opts.partial || s.store.getUsedCapacity(resource) >= creep.store.getFreeCapacity(resource)))
            }));
        }
        // Sources
        if (opts.sources && resource === RESOURCE_ENERGY) {
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
        srcs.push(creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (d) => d.resourceType === resource || !resource}));
        // Tombstones
        srcs.push(creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (t) => t.store.getUsedCapacity(resource)}));
        // Ruin
        srcs.push(creep.pos.findClosestByPath(FIND_RUINS, {filter: (r) => r.store.getUsedCapacity(resource)}));

        // Also try most full flagged
        let cur = 0;
        let flagged_srcs = []
        for (let structure of creep.room.find(FIND_STRUCTURES, {filter: (s) => s.store && s.store.getUsedCapacity(resource) &&
            (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
            s.pos.lookFor(LOOK_FLAGS).filter((f) => f.color === COLOR_GREY || f.color === COLOR_ORANGE).length})) {
            let fill = structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)
            if (fill > cur) {
                flagged_srcs = [structure]
                cur = fill;
            } else if (fill === cur) {
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
                (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) && s.pos.lookFor(LOOK_FLAGS).length === 0})) {
                let fill = structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)
                if (fill > cur) {
                    srcs = [structure]
                    cur = fill;
                } else if (fill === cur) {
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
        if (result === ERR_INVALID_TARGET) { result = creep.pickup(src) }

        // Try harvest
        if (result === ERR_INVALID_TARGET) { result = creep.harvest(src) }

        // Move in range
        if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(src, {visualizePathStyle: {stroke: "#ffa500"}}) }

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
            ((s.structureType === STRUCTURE_STORAGE && s.my) || s.structureType === STRUCTURE_CONTAINER) &&
            (s.store.getFreeCapacity(resource) && (opts.partial || s.store.getFreeCapacity(resource) >= creep.store.getUsedCapacity(resource)))}));
        }
        // Haulers
        if (opts.haulers) {
            dsts.push();
        }
        // Spawners
        if (opts.spawners && (resource === RESOURCE_ENERGY || (!resource && creep.store.getUsedCapacity(RESOURCE_ENERGY)))) {
            dsts.push(creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => s.my &&
                (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
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
        dst = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => s.my && (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) && s.store.getFreeCapacity(resource)});

        // Try flagged
        if (!dst) {
            let cur = 1;
            let dsts = [];

            for (let structure of creep.room.find(FIND_STRUCTURES, {filter: (s) => s.store && s.store.getFreeCapacity(resource) && s.pos.lookFor(LOOK_FLAGS).filter((f) => f.color === utils.resource_flag[resource]).length})) {
                let fill = structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)
                if (fill < cur) {
                    dsts = [structure]
                    cur = fill;
                } else if (fill === cur) {
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
                } else if (fill === cur) {
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

            for (let structure of creep.room.find(FIND_STRUCTURES, {filter: (s) => s.store && s.store.getFreeCapacity(resource) && s.pos.lookFor(LOOK_FLAGS).length === 0})) {
                let fill = structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)
                if (fill < cur) {
                    dsts = [structure]
                    cur = fill;
                } else if (fill === cur) {
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
                if (result === OK || result === ERR_NOT_IN_RANGE) { break }
            }
        } else {
            // Try transfer of defined resource
            result = creep.transfer(dst, resource);
        }

        // Move in range
        if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(dst, {visualizePathStyle: {stroke: "#1e90ff"}}) }

        return result;
    },

    // Generate a fresh resourc metrics object
    freshResourceMetrics: function() {
        let resources= {
            total: 0,
            over: 0,
            under: 0,
            fill: 0,
            fill_max: 0,
            fill_avg: 0,
            imbalance: 0,
            free: 0
        }

        return resources;
    },

    // Genereate a fresh room metrics object
    freshRoomMetrics: function() {
        let metrics = {
            hits: 0,
            hits_max: 0,
            hits_per: 0,
            damage: 0,
            build: 0,
            build_max: 0,
            build_per: 0,
            upgrade: 0,
            upgrade_total: 0,
            level: 0,
            creeps: 0,
            creeps_cost: 0,
            resources: {}
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
            spawn: 0,
            harvest: {}
        }

        return counts;
    },

    // Survey a visible room for map information
    doSurvey: function(room) {
        let survey = {
            sources: room.find(FIND_SOURCES).length,
            minerals: {},
            deposits: {},
            tick: Game.time
        }
        // Survey minerals
        for (let mineral of room.find(FIND_MINERALS)) {
            survey.minerals[mineral.mineralType] = mineral.density;
        }
        // Survey deposits
        for (let deposit of room.find(FIND_DEPOSITS)) {
            survey.deposits[deposit.depositType] = deposit.ticksToDecay;
        }
        return survey;
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
            if (structure.pos.lookFor(LOOK_FLAGS,{filter:(f)=>f.color != COLOR_ORANGE}).length > 0) {
                // Structure to be disassembled, ignore
            } else if (structure.hitsMax && structure.structureType != STRUCTURE_WALL && structure.structureType != STRUCTURE_RAMPART) {
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
            } else if (structure.hitsMax && (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART)) {
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
                let inv_counter = 0;
                let resources = new Array();
                for (let resource of RESOURCES_ALL) {
                    if (inv_counter === structure.store.getUsedCapacity()) { break }
                    let amount = structure.store.getUsedCapacity(resource);
                    if (!amount) { continue }
                    inv_counter += amount;
                    if (!metrics.resources[resource]) { metrics.resources[resource] = utils.freshResourceMetrics() }
                    metrics.resources[resource].total += amount;
                    resources.push(resource);
                }

                // Find imbalance
                if (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) {
                    if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => f.color === COLOR_GREY || f.color === COLOR_ORANGE).length) {
                        // Flagged as empty
                        if (structure.store.getUsedCapacity()) { room.memory.visuals.push(["⬇︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                        for (let resource of resources) {
                            metrics.resources[resource].over += structure.store.getUsedCapacity(resource);
                        }
                    } else if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => utils.flag_resource[f.color]).length) {
                        // Flagged as fill
                        if (structure.store.getFreeCapacity(utils.flag_resource[structure.pos.lookFor(LOOK_FLAGS)[0].color])) { room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                        metrics.resources[utils.flag_resource[structure.pos.lookFor(LOOK_FLAGS)[0].color]].under += structure.store.getFreeCapacity(utils.flag_resource[structure.pos.lookFor(LOOK_FLAGS)[0].color]);
                    } else {
                        // Non-flagged container/storage, build average
                        for (let resource of resources) {
                            if (metrics.resources[resource].fill += structure.store.getUsedCapacity(resource)) {
                                metrics.resources[resource].fill_max += structure.store.getCapacity(resource);
                            }
                        }
                    }
                    // Process available resources
                    for (let resource of resources) {
                        metrics.resources[resource].free += structure.store.getUsedCapacity(resource);
                    }
                } else {
                    // Not a container or storage, always fill
                    for (let resource of resources) {
                        metrics.resources[resource].under += structure.store.getFreeCapacity(resource);
                        if (structure.store.getFreeCapacity(resource)) { room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                    }
                }
            }
        }
        if (metrics.hits_max) { metrics.hits_per = metrics.hits / metrics.hits_max }

        // Process over/under averages
        for (let resource in metrics.resources) {
            if (metrics.resources[resource].fill) {
                metrics.resources[resource].fill_avg = metrics.resources[resource].fill / metrics.resources[resource].fill_max;
            }
        }
        for (let structure of room.find(FIND_STRUCTURES, { filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
            !s.pos.lookFor(LOOK_FLAGS).length })) {
            for (let resource in metrics.resources) {
                let diff = structure.store.getCapacity(resource) * ((structure.store.getUsedCapacity(resource) / structure.store.getCapacity(resource)) - metrics.resources[resource].fill_avg);
                if (diff > 0) {
                    metrics.resources[resource].over += diff;
                    room.memory.visuals.push(["⬇︎", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                } else if (diff < 0) {
                    metrics.resources[resource].under -= diff;
                    room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]);
                }
            }
        }

        // Compute imbalances
        for (let resource in metrics.resources) {
            metrics.resources[resource].imbalance = Math.max(metrics.resources[resource].over, metrics.resources[resource].under);
        }

        // Process decayables
        for (let drop of room.find(FIND_DROPPED_RESOURCES)) {
            let resource = drop.resourceType;
            if (!metrics.resources[resource]) {metrics.resources[resource] = utils.freshResourceMetrics()}
            metrics.resources[resource].total += drop.amount;
            metrics.resources[resource].over += drop.amount;
            metrics.resources[resource].free += drop.amount;
        }
        for (let structure of room.find(FIND_TOMBSTONES).concat(room.find(FIND_RUINS))) {
            let inv_counter = 0;
            for (let resource in RESOURCES_ALL) {
                if (inv_counter === structure.store.getUsedCapacity()) { break }
                let amount = structure.store.getUsedCapacity(resource);
                if (!amount) { continue }
                inv_counter += amount;
                if (!metrics.resources[resource]) {metrics.resources[resource] = utils.freshResourceMetrics()}
                metrics.resources[resource].total += amount;
                metrics.resources[resource].over += amount;
                metrics.resources[resource].free += amount;
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
            let inv_counter = 0;
            for (let resource of RESOURCES_ALL) {
                if (inv_counter === creep.store.getUsedCapacity()) { break }
                let amount = creep.store.getUsedCapacity(resource);
                if (!amount) { continue }
                inv_counter += amount;
                if (!metrics.resources[resource]) {metrics.resources[resource] = utils.freshResourceMetrics()}
                metrics.resources[resource].total += amount;
                metrics.resources[resource].free += amount;
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
            metrics.level = controller.level;
        }

        // Update memory
        let prev_metrics = room.memory.metrics;

        // Last will be set to current metrics
        let last = metrics;

        // Get new last_mov
        let last_mov;
        if (prev_metrics) {
            // Handle resources
            for (let resource in Object.assign({}, prev_metrics.last.resources, last.resources, prev_metrics.last_mov.resources)) {
                if (!prev_metrics.last.resources[resource]) { prev_metrics.last.resources[resource] = utils.freshResourceMetrics() }
                if (!last.resources[resource]) { last.resources[resource] = utils.freshResourceMetrics() }
                if (!prev_metrics.last_mov.resources[resource]) { prev_metrics.last_mov.resources[resource] = last.resources[resource] }
            }
            last_mov = utils.doMov(prev_metrics.last_mov, last);
        } else { last_mov = last }

        // Get change
        let change;
        if (prev_metrics) { change = utils.doChange(prev_metrics.last, last, Game.time - prev_metrics.tick)}
        else { change = null }

        // Get change_mov
        let change_mov;
        if (prev_metrics && prev_metrics.change_mov) { change_mov = utils.doMov(prev_metrics.change_mov, change)}
        else if (prev_metrics) { change_mov = change }
        else { change_mov = null }

        // Get count
        let count = utils.freshRoomCounters();
        if (prev_metrics && prev_metrics.count_mov ) {
            // Handle resources
            for (let resource in Object.assign({}, prev_metrics.count_mov.harvest, prev_metrics.count.harvest)) {
                if (!prev_metrics.count_mov.harvest[resource]) { prev_metrics.count_mov.harvest[resource] = 0 }
                if (!prev_metrics.count.harvest[resource]) { prev_metrics.count.harvest[resource] = 0 }
                count.harvest[resource] = 0;
            }
        } else if (prev_metrics && prev_metrics.count) {
            // Handle resources
            for (let resource in prev_metrics.count.harvest) {
                if (!prev_metrics.count.harvest[resource]) { prev_metrics.count.harvest[resource] = 0 }
                count.harvest[resource] = 0;
            }
        }

        // Get count_mov
        if (prev_metrics && prev_metrics.count_mov) { count_mov = utils.doMov(prev_metrics.count_mov, utils.doChange(count, prev_metrics.count, Game.time - prev_metrics.tick)) }
        else if (prev_metrics && prev_metrics.count) {  count_mov = utils.doMov(prev_metrics.count, utils.doChange(count, prev_metrics.count, Game.time - prev_metrics.tick))}
        else { count_mov = null }

        return {
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

        for (let room_name in Game.rooms) {
            // Compute room metrics
            if (!Memory.rooms[room_name]) { Memory.rooms[room_name] = {}}
            Memory.rooms[room_name].metrics = utils.roomMetrics(Game.rooms[room_name]);

            // Survey if needed
            if (!Memory.rooms[room_name].survey || Memory.rooms[room_name].survey.tick < (Game.time - config.SCOUT_TICK)) {
                Memory.rooms[room_name].survey = utils.doSurvey(Game.rooms[room_name]);
            }
        }

        // Compute global metrics
    },

    // Display metrics visuals
    showMetrics() {
        // Scouting information on world map
        for (let room_name in Memory.rooms) {
            if (!Memory.rooms[room_name].metrics || !Memory.rooms[room_name].metrics.tick) {continue}
            let time = Game.time - Memory.rooms[room_name].metrics.tick;
            if (Game.rooms[room_name]) { time = 0 }
            Game.map.visual.text(time, new RoomPosition(25,7,room_name))
        }

        // Room metrics
        for (let room_name in Memory.rooms) {
            let metrics;
            let visual = new RoomVisual(room_name);

            // Show global metrics
            metrics = Memory.metrics;
            if (metrics) {
                // Build visuals
                let text = ["[ Shard: " + Game.shard.name+ " ]"];

                text.push("CPU: " + (Math.round(100*metrics.cpu_mov)/100) + " (" + (Math.round(1000*metrics.cpu_mov/Game.cpu.limit)/10) + "%)");
                text.push("Bucket: " + Game.cpu.bucket + " (" + (Math.round(1000*Game.cpu.bucket/10000)/10) + "%)")

                // Apply visuals
                for (let i = 0; i < text.length; i++) {
                    visual.text(text[i], 49, i + 0.5, {align: "right"});
                }
            }

            // Show room metrics
            metrics = Memory.rooms[room_name].metrics;
            let survey = Memory.rooms[room_name].survey;
            if (metrics) {

                // Build visuals
                let text = ["[ Room: " + room_name + " (" + (Game.time - metrics.tick) + ") ]"];

                // Upgrade/controller info
                let progress_total = CONTROLLER_LEVELS[metrics.last.level];
                text.push("RCL " + (metrics.last.level) + ": " + (progress_total - metrics.last.upgrade) +
                    " (" + (Math.round(10000*metrics.last.upgrade/progress_total)/100) + ((metrics.change_mov) ? "%) @ " + Math.round(metrics.change_mov.upgrade_total) +
                    "/t (" + Math.ceil((progress_total- metrics.last.upgrade) / metrics.change_mov.upgrade_total) + " t)" : "%)"));

                // Repair & build info
                if (metrics.last.damage) {text.push(
                    "Repairing: " + metrics.last.damage + " (" + (Math.round(10000*metrics.last.hits/metrics.last.hits_max)/100) + ((metrics.change_mov) ? "%) @ " +
                    Math.round(-1 * metrics.change_mov.damage) + "/t (" + Math.ceil(metrics.last.damage / (-1 * metrics.change_mov.damage)) + " t)" : "%)")
                )}
                if (metrics.last.build_max) {text.push(
                    "Building: " + metrics.last.build + " (" + (Math.round(10000*metrics.last.build_per)/100) + ((metrics.change_mov) ? "%) @ " +
                    Math.round(metrics.change_mov.build) + "/t (" + Math.ceil(metrics.last.build_max / metrics.change_mov.build) + " t)" : "%)")
                )}

                // Balances
                let header = false;
                for (let resource in metrics.last.resources) {
                    if (!header) {
                        text.push("[ Resources ]");
                        header = true;
                    }
                    text.push(resource.charAt(0).toUpperCase() + resource.slice(1) + ": " + metrics.last.resources[resource].free + ((metrics.change_mov && metrics.change_mov.resources[resource]) ? " @ " + (Math.round(100*metrics.change_mov.resources[resource].free)/100) +
                    "/t" + ((metrics.change_mov.resources[resource].free < 0) ? " (" + Math.floor(-1*metrics.last.resources[resource].free/metrics.change_mov.resources[resource].free) + " t)" : "") 
                    : "") + ((metrics.last.resources[resource].imbalance > 500) ? " (" + Math.round(metrics.last.resources[resource].imbalance) + " i)" : ""))
                }

                // Energy flows
                if (metrics.last.resources[RESOURCE_ENERGY] && metrics.count_mov && metrics.change_mov && metrics.change_mov.resources[RESOURCE_ENERGY]) {
                    let inflow_total = metrics.count_mov.harvest[RESOURCE_ENERGY];
                    let outflow_total = metrics.count_mov.upgrade_spend + metrics.count_mov.repair_spend + metrics.count_mov.build_spend + metrics.count_mov.spawn;
                    let transfer = metrics.change_mov.resources[RESOURCE_ENERGY].total;
                    if (transfer > 0) {outflow_total += transfer}
                    else {inflow_total -= transfer}

                    // In
                    if (inflow_total) {text.push("[ Energy Inflows ]")}
                    if (survey) {

                    } else {

                    }
                    if (metrics.count_mov.harvest[RESOURCE_ENERGY]) {text.push("Harvested: " + (Math.round(100*metrics.count_mov.harvest[RESOURCE_ENERGY])/100) + " (" + (Math.round(1000*metrics.count_mov.harvest[RESOURCE_ENERGY]/inflow_total)/10)
                    + ((survey) ? "%) (" + (Math.round(100*metrics.count_mov.harvest[RESOURCE_ENERGY]/(survey.sources))/10) + "% eff)" : "%)"))}
                    if (transfer < 0) {text.push("Transfer: " + (Math.round(-100*transfer)/100) + " (" + (Math.round(-1000*transfer/inflow_total)/10) + "%)")}
    
                    // Out
                    if (outflow_total) {text.push("[ Energy Outflows ]")}
                    if (metrics.count_mov.upgrade_spend) {text.push("Upgrades: " + (Math.round(100*metrics.count_mov.upgrade_spend)/100) + " (" + (Math.round(1000*metrics.count_mov.upgrade_spend/outflow_total)/10) + "%)")}
                    if (metrics.count_mov.repair_spend) {text.push("Repairs: " + (Math.round(100*metrics.count_mov.repair_spend)/100) + " (" + (Math.round(1000*metrics.count_mov.repair_spend/outflow_total)/10) + "%)")}
                    if (metrics.count_mov.build_spend) {text.push("Builds: " + (Math.round(100*metrics.count_mov.build_spend)/100) + " (" + (Math.round(1000*metrics.count_mov.build_spend/outflow_total)/10) + "%)")}
                    if (metrics.count_mov.spawn || metrics.last_mov.creeps_cost) {text.push("Creeps: " + (Math.round(100*metrics.count_mov.spawn)/100) + " (" + (Math.round(1000*metrics.count_mov.spawn/outflow_total)/10)
                    + "%) @ " + (Math.round(100*metrics.last_mov.creeps_cost)/100) + " (" + (Math.round(1000*metrics.last_mov.creeps_cost/outflow_total)/10) + "%)")}
                    if (transfer > 0) {text.push("Transfer: " + (Math.round(100*transfer)/100) + " (" + (Math.round(1000*transfer/outflow_total)/10) + "%)")}
                }

                // Apply visuals
                for (let i = 0; i < text.length; i++) {
                    visual.text(text[i], 0, i + 0.5, {align: "left"});
                }
            } else {
                // Show indicator that metrics are loading
                visual.text("[ Room: " + room_name + " (unscanned) ]", 0, 0.5, {align: "left"});
            }
        }
    },

    // Search nearby rooms for a match with a callback
    searchNearbyRooms: function(queue, check, limit=config.MAX_ROOM_SEARCH, amount=1, dists={}, cur=[]) {
        let room = queue.shift();

        // Base case, goal met
        if (cur.length === amount && amount === 1) { return cur[0] }
        else if (cur.length === amount && amount > 0) { return cur }

        // Add current room if initializing
        if (dists[room] === undefined) {dists[room] = 0}
        let dist = dists[room];

        // Base case, not found
        if (!room && amount == 1) { return null }
        else if (!room) { return cur }

        // Check if room matches
        if (check(room)) { cur.push(room) }

        // Queue neighbors if distance ok
        if (dist < limit) {
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
        return utils.searchNearbyRooms(queue, check, limit, amount, dists, cur);
    },

    // Clear visuals & metrics
    reset: function(room_name=null, metrics=false, sightings=false, survey=false) {
        if (room_name) {
            if (!Memory.rooms[room_name]) {Memory.rooms[room_name] = {}}
            let memory = Memory.rooms[room_name];
            memory.visuals = [];
            if (sightings || !memory.sightings) {
                memory.sightings = {};
            }
            if (survey || !memory.survey) {
                memory.survey = null;
                if (Game.rooms[room_name]) { memory.survey = utils.doSurvey(Game.rooms[room_name]) }
            }
            if (metrics || !memory.metrics) {
                memory.metrics = null;
                if (Game.rooms[room_name]) { memory.metrics = utils.roomMetrics(Game.rooms[room_name]) }
            }
        } else {
            for (let room_name in Game.rooms) {
                utils.reset(room_name, metrics, sightings, survey);
            }
            for (let room_name in Memory.rooms) {
                if (Game.rooms[room_name]) {continue}
                utils.reset(room_name, metrics, sightings, survey);
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