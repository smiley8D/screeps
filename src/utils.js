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
            haulers: true,
            limit: null
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
            srcs = srcs.concat(creep.room.find(FIND_DROPPED_RESOURCES, {filter: (d) => (d.resourceType === resource || !resource) && (opts.partial || d.amount >= creep.store.getFreeCapacity(resource))}));
            // Tombstones
            srcs = srcs.concat(creep.room.find(FIND_TOMBSTONES, {filter: (t) => t.store.getUsedCapacity(resource) && (opts.partial || t.store.getUsedCapacity(recycle) >= creep.store.getFreeCapacity(resource))}));
            // Ruin
            srcs = srcs.concat(creep.room.find(FIND_RUINS, {filter: (r) => r.store.getUsedCapacity(resource) && (opts.partial || r.store.getUsedCapacity(recycle) >= creep.store.getFreeCapacity(resource))}));
        }
        // Containers
        if (opts.containers) {
            srcs = srcs.concat(creep.room.find(FIND_STRUCTURES, {filter: (s) =>
                (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER) &&
                (s.store.getUsedCapacity(resource) && (opts.partial || s.store.getUsedCapacity(resource) >= creep.store.getFreeCapacity(resource)))
            }));
        }
        // Sources
        if (opts.sources && resource === RESOURCE_ENERGY) {
            srcs = srcs.concat(creep.room.find(FIND_SOURCES_ACTIVE));
        }
        // Haulers
        if (opts.haulers) {
            srcs = srcs.concat(creep.room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.body === 'Hauler' && c.store.getUsedCapacity(resource) &&
                (opts.partial || c.store.getUsedCapacity(resource) >= creep.store.getFreeCapacity(resource))}));
        }

        // Find valid src
        let valid_srcs = [];
        for (let i in srcs) {
            if (srcs[i]) { valid_srcs.push(srcs[i]) }
        }
        src = creep.pos.findClosestByRange(valid_srcs);

        // Check range
        if (opts.limit != null && creep.pos.getRangeTo(src) > opts.limit) { src = null }

        // Update cache
        if (src) {
            delete creep.memory.curSrc;
            return src;
        } else {
            delete creep.memory.curSrc;
            return;
        }
    },

    // Find the best src based on room resource distribution
    bestSrc: function(creep, resource) {
        // Try unsatisfied flags
        let src = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => f.color === COLOR_WHITE && f.secondaryColor === COLOR_WHITE &&
            !f.pos.lookFor(LOOK_STRUCTURES).length && (!f.pos.lookFor(LOOK_CREEPS).length || f.pos.lookFor(LOOK_CREEPS)[0].name === creep.name)})
        if (src) { return src }

        // Try closest decayable
        let srcs = [];
        // Drops
        srcs = srcs.concat(creep.room.find(FIND_DROPPED_RESOURCES, {filter: (d) => d.resourceType === resource || !resource}));
        // Tombstones
        srcs = srcs.concat(creep.room.find(FIND_TOMBSTONES, {filter: (t) => t.store.getUsedCapacity(resource)}));
        // Ruin
        srcs = srcs.concat(creep.room.find(FIND_RUINS, {filter: (r) => r.store.getUsedCapacity(resource)}));
        let valid_srcs = [];
        for (let i in srcs) {
            if (srcs[i]) { valid_srcs.push(srcs[i]) }
        }
        src = creep.pos.findClosestByRange(valid_srcs);
        if (src) { return src }

        // Try closest flagged >= 75%
        src = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => (f.color === COLOR_WHITE && f.secondaryColor === COLOR_WHITE &&
            (f.pos.lookFor(LOOK_CREEPS).some((c) => c.store.getUsedCapacity(resource) / c.store.getCapacity(resource) > 0.75) ||
            f.pos.lookFor(LOOK_STRUCTURES).some((s) => s.store.getUsedCapacity(resource) / s.store.getCapacity(resource) > 0.75)))});
        if (src) { return src }

        // Try closest flagged >= 50%
        src = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => (f.color === COLOR_WHITE && f.secondaryColor === COLOR_WHITE &&
            (f.pos.lookFor(LOOK_CREEPS).some((c) => c.store.getUsedCapacity(resource) / c.store.getCapacity(resource) > 0.5) ||
            f.pos.lookFor(LOOK_STRUCTURES).some((s) => s.store.getUsedCapacity(resource) / s.store.getCapacity(resource) > 0.5)))});
        if (src) { return src }

        // Try closest flagged >= 25%
        src = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => (f.color === COLOR_WHITE && f.secondaryColor === COLOR_WHITE &&
            (f.pos.lookFor(LOOK_CREEPS).some((c) => c.store.getUsedCapacity(resource) / c.store.getCapacity(resource) > 0.25) ||
            f.pos.lookFor(LOOK_STRUCTURES).some((s) => s.store.getUsedCapacity(resource) / s.store.getCapacity(resource) > 0.25)))});
        if (src) { return src }

        // Try closest flagged >= 10%
        src = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => (f.color === COLOR_WHITE && f.secondaryColor === COLOR_WHITE &&
            (f.pos.lookFor(LOOK_CREEPS).some((c) => c.store.getUsedCapacity(resource) / c.store.getCapacity(resource) > 0.1) ||
            f.pos.lookFor(LOOK_STRUCTURES).some((s) => s.store.getUsedCapacity(resource) / s.store.getCapacity(resource) > 0.1)))});
        if (src) { return src }

        // Try most full storage in MAX_ROOM_SEARCH
        let room = utils.searchNearbyRooms([creep.room.name], config.MAX_ROOM_SEARCH, ((r,d) => (Game.rooms[r] && Game.rooms[r].storage) ?
        Game.rooms[r].storage.store.getUsedCapacity(resource) / Game.rooms[r].storage.store.getCapacity(resource) : null), 'best');
        if (room) { return Game.rooms[room].storage }

        return src;
    },

    // Withdraw from a src
    doSrc: function(creep, src, resource=undefined) {
        let result = ERR_NOT_FOUND;

        // Handle tgt is creep
        if (src instanceof Creep) {
            result = utils.doDst(src, creep, resource)
        } else if (resource) {
            // Try targetted withdraw
            result = creep.withdraw(src, resource)
        } else if (src.store) {
            // Try any present resources
            for (let resource of RESOURCES_ALL) {
                if (src.store.getUsedCapacity(resource)) { result = creep.withdraw(src, resource)}
                if (result === OK || result === ERR_NOT_IN_RANGE) { break }
            }
        }

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
            spawners: true,
            limit: null
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
            dsts = dsts.concat(creep.room.find(FIND_STRUCTURES, {filter: (s) =>
            ((s.structureType === STRUCTURE_STORAGE && s.my) || s.structureType === STRUCTURE_CONTAINER) &&
            (s.store.getFreeCapacity(resource) && (opts.partial || s.store.getFreeCapacity(resource) >= creep.store.getUsedCapacity(resource)))}));
        }
        // Haulers
        if (opts.haulers) {
            dsts = dsts.concat(creep.room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.body === 'Hauler' && c.store.getFreeCapacity(resource) &&
                (opts.partial || c.store.getFreeCapacity(resource) <= creep.store.getUsedCapacity(resource))}));
        }
        // Spawners
        if (opts.spawners && (resource === RESOURCE_ENERGY || (!resource && creep.store.getUsedCapacity(RESOURCE_ENERGY)))) {
            dsts = dsts.concat(creep.room.find(FIND_STRUCTURES, {filter: (s) => s.my &&
                (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
                (s.store.getFreeCapacity(RESOURCE_ENERGY) && (opts.partial || s.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.store.getUsedCapacity(RESOURCE_ENERGY)))}));
        }

        // Find valid dst
        let valid_dsts = [];
        for (let i in dsts) {
            if (dsts[i]) { valid_dsts.push(dsts[i]) }
        }
        dst = creep.pos.findClosestByRange(valid_dsts);

        // Check range
        if (opts.limit != null && creep.pos.getRangeTo(dst) > opts.limit) { dst = null }

        // Update cache
        if (dst) {
            creep.memory.curDst = dst.id;
            return dst;
        } else {
            delete creep.memory.curDst;
            return;
        }
    },

    // Find the best dst based on room resource distribution
    bestDst: function(creep, resource=undefined) {
        // Stay at satisfied flags
        let dst = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => f.color === COLOR_WHITE && f.secondaryColor === utils.resource_flag[resource] &&
            !f.pos.lookFor(LOOK_STRUCTURES).length && f.pos.lookFor(LOOK_CREEPS).length && f.pos.lookFor(LOOK_CREEPS)[0].name === creep.name})
        if (dst) { return dst }

        // Try spawn containers
        dst = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.my && (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) && s.store.getFreeCapacity(resource)});
        if (dst) { return dst }

        // Try defenses
        dst = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(resource)})
        if (dst) { return dst }

        // Try unsatisfied flags
        dst = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => f.color === COLOR_WHITE && f.secondaryColor === utils.resource_flag[resource] &&
            !f.pos.lookFor(LOOK_STRUCTURES).length && (!f.pos.lookFor(LOOK_CREEPS).length || f.pos.lookFor(LOOK_CREEPS)[0].name === creep.name)})
        if (dst) { return dst }

        // Try closest flagged < 25%
        dst = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => (f.color === COLOR_WHITE && f.secondaryColor === utils.resource_flag[resource] &&
            (f.pos.lookFor(LOOK_CREEPS).some((c) => c.store.getFreeCapacity(resource) / c.store.getCapacity(resource) > 0.75) ||
            f.pos.lookFor(LOOK_STRUCTURES).some((s) => s.store.getFreeCapacity(resource) / s.store.getCapacity(resource) > 0.75)))});
        if (dst) { return dst }

        // Try closest flagged < 50%
        dst = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => (f.color === COLOR_WHITE && f.secondaryColor === utils.resource_flag[resource] &&
            (f.pos.lookFor(LOOK_CREEPS).some((c) => c.store.getFreeCapacity(resource) / c.store.getCapacity(resource) > 0.5) ||
            f.pos.lookFor(LOOK_STRUCTURES).some((s) => s.store.getFreeCapacity(resource) / s.store.getCapacity(resource) > 0.5)))});
        if (dst) { return dst }

        // Try closest flagged < 75%
        dst = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => (f.color === COLOR_WHITE && f.secondaryColor === utils.resource_flag[resource] &&
            (f.pos.lookFor(LOOK_CREEPS).some((c) => c.store.getFreeCapacity(resource) / c.store.getCapacity(resource) > 0.25) ||
            f.pos.lookFor(LOOK_STRUCTURES).some((s) => s.store.getFreeCapacity(resource) / s.store.getCapacity(resource) > 0.25)))});
        if (dst) { return dst }

        // Try closest flagged < 90%
        dst = creep.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => (f.color === COLOR_WHITE && f.secondaryColor === utils.resource_flag[resource] &&
            (f.pos.lookFor(LOOK_CREEPS).some((c) => c.store.getFreeCapacity(resource) / c.store.getCapacity(resource) > 0.1) ||
            f.pos.lookFor(LOOK_STRUCTURES).some((s) => s.store.getFreeCapacity(resource) / s.store.getCapacity(resource) > 0.1)))});
        if (dst) { return dst }

        // Try most empty storage in MAX_ROOM_SEARCH
        let room = utils.searchNearbyRooms([creep.room.name], config.MAX_ROOM_SEARCH, ((r,d) => (Game.rooms[r] && Game.rooms[r].storage) ?
        Game.rooms[r].storage.store.getFreeCapacity(resource) / Game.rooms[r].storage.store.getCapacity(resource) : null), 'best');
        if (room) { return Game.rooms[room].storage }

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
            dismantle: 0,
            dismantle_max: 0,
            dismantle_per: 0,
            cpu: 0,
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
        let start = Game.cpu.getUsed();
        let metrics = utils.freshRoomMetrics();

        // Process structures
        for (let structure of room.find(FIND_STRUCTURES)) {
            // Process damage
            if (structure.pos.lookFor(LOOK_FLAGS).some((f)=>f.color === COLOR_ORANGE)) {
                // Structure to be disassembled
                metrics.dismantle += structure.hits;
                metrics.dismantle_max += structure.hitsMax;
                room.memory.visuals.push(["💣"+(Math.round(100*(structure.hitsMax - structure.hits) / structure.hitsMax))+"%", structure.pos.x, structure.pos.y, Game.time]);
            } else if (structure.hitsMax && structure.structureType != STRUCTURE_WALL && structure.structureType != STRUCTURE_RAMPART) {
                metrics.damage += structure.hitsMax - structure.hits
                metrics.hits += structure.hits;
                metrics.hits_max += structure.hitsMax;
                if (structure.hits < structure.hitsMax * 0.1) {
                    room.memory.visuals.push(["🔥"+(Math.round(100*structure.hits / structure.hitsMax))+"%", structure.pos.x, structure.pos.y, Game.time]);
                } else if (structure.hits < structure.hitsMax * 0.5) {
                    room.memory.visuals.push(["🔧"+(Math.round(100*structure.hits / structure.hitsMax))+"%", structure.pos.x, structure.pos.y, Game.time]);
                } else if (structure.hits < structure.hitsMax) {
                    room.memory.visuals.push(["🔧", structure.pos.x, structure.pos.y, Game.time]);
                }
            } else if (structure.hitsMax && (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART)) {
                // Configurable wall upgrade threshold
                metrics.damage += Math.max(0, (structure.hitsMax * config.DEFENSE_PER) - structure.hits);
                metrics.hits += Math.min(structure.hits, structure.hitsMax * config.DEFENSE_PER);
                metrics.hits_max += structure.hitsMax * config.DEFENSE_PER;
                if (structure.hits < (structure.hitsMax * config.DEFENSE_PER) * 0.1) {
                    room.memory.visuals.push(["🔥"+(Math.round(100*structure.hits / (structure.hitsMax * config.DEFENSE_PER)))+"%", structure.pos.x, structure.pos.y, Game.time]);
                } else if (structure.hits < (structure.hitsMax * config.DEFENSE_PER) * 0.5) {
                    room.memory.visuals.push(["🔧"+(Math.round(100*structure.hits / (structure.hitsMax * config.DEFENSE_PER)))+"%", structure.pos.x, structure.pos.y, Game.time]);
                } else if (structure.hits < (structure.hitsMax * config.DEFENSE_PER)) {
                    room.memory.visuals.push(["🔧", structure.pos.x, structure.pos.y, Game.time]);
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

                // Note imbalance
                if (structure.pos.lookFor(LOOK_FLAGS).length) {}
                else if (structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_TOWER) {
                    // Always fill
                    if (!metrics.resources[RESOURCE_ENERGY]) { metrics.resources[RESOURCE_ENERGY] = utils.freshResourceMetrics() }
                    metrics.resources[RESOURCE_ENERGY].under += structure.store.getFreeCapacity(RESOURCE_ENERGY);
                    if (structure.store.getFreeCapacity(RESOURCE_ENERGY)) { room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, Game.time]) }
                } else if (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE || structure.structureType === STRUCTURE_LINK) {
                    // Mark available
                    for (let resource of resources) {
                        metrics.resources[resource].free += structure.store.getUsedCapacity(resource);
                    }
                }
            }
        }

        // Process logistics flags
        for (let flag of room.find(FIND_FLAGS, {filter: (f) => f.color === COLOR_WHITE })) {
            let store;
            if (flag.pos.lookFor(LOOK_STRUCTURES).length) { store = flag.pos.lookFor(LOOK_STRUCTURES)[0].store }
            else if (flag.pos.lookFor(LOOK_CREEPS).length) { store = flag.pos.lookFor(LOOK_CREEPS)[0].store }
            // TEMP ADD ENERGY IMBALANCE
            if (!metrics.resources[RESOURCE_ENERGY]) { metrics.resources[RESOURCE_ENERGY] = utils.freshResourceMetrics() }
            if (utils.flag_resource[flag.secondaryColor] && !metrics.resources[utils.flag_resource[flag.secondaryColor]]) { metrics.resources[utils.flag_resource[flag.secondaryColor]] = utils.freshResourceMetrics() }
            if (flag.secondaryColor === COLOR_WHITE && !store) { metrics.resources[RESOURCE_ENERGY].over += 500 }
            else if (utils.flag_resource[flag.secondaryColor] && !store) { metrics.resources[utils.flag_resource[flag.secondaryColor]].under += 500}
            else if (flag.secondaryColor === COLOR_WHITE) { metrics.resources[RESOURCE_ENERGY].over += store.getUsedCapacity(RESOURCE_ENERGY) }
        }

        // Process averages
        if (metrics.hits_max) { metrics.hits_per = metrics.hits / metrics.hits_max }
        if (metrics.dismantle_max) { metrics.dismantle_per = (metrics.dismantle_max - metrics.dismantle) / metrics.dismantle_max }

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
            room.memory.visuals.push(["🔨"+(Math.round(100*site.progress / site.progressTotal))+"%", site.pos.x, site.pos.y, Game.time]);
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

        // Note time
        metrics.cpu = Game.cpu.getUsed() - start;

        // Update memory
        let prev_metrics = room.memory.metrics;

        // Last will be set to current metrics
        let last = metrics;

        // Get new last_mov
        let last_mov;
        if (prev_metrics) {
            // Handle resources
            for (let resource in Object.assign({}, prev_metrics.last.resources, last.resources, prev_metrics.last_mov.resources)) {
                if (last.resources[resource] || prev_metrics.last_mov.resources[resource] >= 0.01 || prev_metrics.change_mov >= 0.01) {
                    if (!prev_metrics.last.resources[resource]) { prev_metrics.last.resources[resource] = utils.freshResourceMetrics() }
                    if (!prev_metrics.last_mov.resources[resource]) { prev_metrics.last_mov.resources[resource] = last.resources[resource] }
                    if (!last.resources[resource]) { last.resources[resource] = utils.freshResourceMetrics() }
                } else {
                    delete last.resources[resource];
                    delete prev_metrics.last.resources[resource];
                    delete prev_metrics.last_mov.resources[resource];
                }
            }
            last_mov = utils.doMov(prev_metrics.last_mov, last);
        } else { last_mov = last }

        // Get change
        let change;
        if (prev_metrics) { change = utils.doChange(prev_metrics.last, last, Game.time - prev_metrics.tick)}
        else { change = null }

        // Get change_mov
        let change_mov;
        if (prev_metrics && prev_metrics.change_mov) {
            for (let resource in Object.assign({}, change.resources, prev_metrics.change_mov.resources)) {
                if (change.resources[resource] || prev_metrics.change_mov.resources >= 0.01) {
                    if (!prev_metrics.change_mov.resources[resource]) { prev_metrics.change_mov.resources[resource] = utils.freshResourceMetrics() }
                    if (!change.resources[resource]) { change.resources[resource] = utils.freshResourceMetrics() }
                } else {
                    delete prev_metrics.change_mov.resources[resource];
                    delete change.resources[resource];
                }
            }
            change_mov = utils.doMov(prev_metrics.change_mov, change)}
        else if (prev_metrics) { change_mov = change }
        else { change_mov = null }

        // Get count
        let count = utils.freshRoomCounters();
        if (prev_metrics && prev_metrics.count_mov ) {
            // Handle resources
            for (let resource in Object.assign({}, prev_metrics.count_mov.harvest, prev_metrics.count.harvest)) {
                if (prev_metrics.count.harvest[resource] || prev_metrics.count_mov.harvest[resource] >= 0.01) {
                    if (!prev_metrics.count.harvest[resource]) { prev_metrics.count.harvest[resource] = 0 }
                    if (!prev_metrics.count_mov.harvest[resource]) { prev_metrics.count_mov.harvest[resource] = 0 }
                    count.harvest[resource] = 0;
                } else {
                    delete prev_metrics.count.harvest[resource];
                    delete prev_metrics.count_mov.harvest[resource]
                }
            }
        } else if (prev_metrics && prev_metrics.count) {
            // Handle resources
            for (let resource in prev_metrics.count.harvest) {
                if (prev_metrics.count.harvest[resource]) { count.harvest[resource] = 0 }
                else { delete prev_metrics.count.harvest[resource] }
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
        let rooms = Object.keys(Game.rooms).concat(Object.values(Game.flags).filter((f) => f.color === COLOR_BLUE).map((f) => f.pos.roomName))
        for (let room_name of rooms) {
            if (!Memory.rooms[room_name]) { continue }
            let metrics;
            let visual = new RoomVisual(room_name);

            // Show global metrics
            metrics = Memory.metrics;
            if (metrics) {
                // Build visuals
                let text = ["[ Shard: " + Game.shard.name+ " ]"];

                text.push("CPU: " + (Math.round(100*metrics.cpu_total)/100) + " (" + (Math.round(1000*metrics.cpu_total/Game.cpu.limit)/10) + "%)");
                text.push("Bucket: " + Game.cpu.bucket + " (" + (Math.round(1000*Game.cpu.bucket/10000)/10) + "%)");
                text.push("Start: " + (Math.round(100*metrics.cpu_start)/100));
                text.push("Cleanup: " + (Math.round(100*metrics.cpu_cleanup)/100));
                text.push("Log: " + (Math.round(100*metrics.cpu_log)/100));
                text.push("Defend: " + (Math.round(100*metrics.cpu_defend)/100));
                text.push("Task: " + (Math.round(100*metrics.cpu_task)/100));
                text.push("Visual: " + (Math.round(100*metrics.cpu_visual)/100));

                text.push("[ Metrics: " + (Math.round(100*metrics.cpu_metrics)/100) + " ]");
                for (let room in Game.rooms) {
                    let mov = Memory.rooms[room].metrics.last_mov.cpu;
                    if (mov) { text.push(room + ": " + (Math.round(100*mov)/100)) }
                }

                text.push("[ Order: " + (Math.round(100*metrics.cpu_order)/100) + " ]");
                for (let task in metrics.cpu_tasks) {
                    text.push(task + ": " + (Math.round(100*metrics.cpu_tasks[task])/100))
                }

                // Apply visuals
                for (let i = 0; i < text.length; i++) {
                    visual.text(text[i], 49, i + 0.5, {align: "right"});
                }
            }

            // Show room metrics
            metrics = Memory.rooms[room_name].metrics;
            let survey = Memory.rooms[room_name].survey;
            let sightings = Memory.rooms[room_name].sightings;
            if (metrics) {

                // Build visuals
                let text = ["[ Room: " + room_name + " (" + (Game.time - metrics.tick) + ") ]"];

                // Upgrade/controller info
                let progress_total = CONTROLLER_LEVELS[metrics.last.level];
                text.push("RCL " + (metrics.last.level) + ": " + (progress_total - metrics.last.upgrade) +
                    " (" + (Math.round(10000*metrics.last.upgrade/progress_total)/100) + ((metrics.change_mov) ? "%) @ " + Math.round(metrics.change_mov.upgrade_total) +
                    "/t (" + Math.ceil((progress_total- metrics.last.upgrade) / metrics.change_mov.upgrade_total) + " t)" : "%)"));

                // Repair & build info
                if (metrics.last.damage >= 0.01) {text.push(
                    "Repairing: " + metrics.last.damage + " (" + (Math.round(10000*metrics.last.hits/metrics.last.hits_max)/100) + ((metrics.change_mov) ? "%) @ " +
                    Math.round(-1 * metrics.change_mov.damage) + ((metrics.change_mov.damage < 0) ? "/t (" + Math.ceil(metrics.last.damage / (-1 * metrics.change_mov.damage)) + " t)" : "/t") : "%)")
                )}
                if (metrics.last.build_max >= 0.01) {text.push(
                    "Building: " + metrics.last.build + " (" + (Math.round(10000*metrics.last.build_per)/100) + ((metrics.change_mov) ? "%) @ " +
                    Math.round(metrics.change_mov.build) + "/t (" + Math.ceil(metrics.last.build_max / metrics.change_mov.build) + " t)" : "%)")
                )}
                if (metrics.last.dismantle_max >= 0.01) {text.push(
                    "Dismantling: " + metrics.last.dismantle + " (" + (Math.round(10000*metrics.last.dismantle_per)/100) + ((metrics.change_mov) ? "%) @ " +
                    Math.round(metrics.change_mov.dismantle) + "/t (" + Math.ceil(metrics.last.dismantle_max / metrics.change_mov.dismantle) + " t)" : "%)")
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
                    if (inflow_total >= 0.01) {text.push("[ Energy Inflows ]")}
                    if (survey) {

                    } else {

                    }
                    if (metrics.count_mov.harvest[RESOURCE_ENERGY] >= 0.01) {text.push("Harvested: " + (Math.round(100*metrics.count_mov.harvest[RESOURCE_ENERGY])/100) + " (" + (Math.round(1000*metrics.count_mov.harvest[RESOURCE_ENERGY]/inflow_total)/10)
                    + ((survey) ? "%) (" + (Math.round(100*metrics.count_mov.harvest[RESOURCE_ENERGY]/(survey.sources))/10) + "% eff)" : "%)"))}
                    if (transfer <= -0.01) {text.push("Transfer: " + (Math.round(-100*transfer)/100) + " (" + (Math.round(-1000*transfer/inflow_total)/10) + "%)")}
    
                    // Out
                    if (outflow_total >= 0.01 || metrics.last_mov.creeps_cost >= 0.01) {text.push("[ Energy Outflows ]")}
                    if (metrics.count_mov.upgrade_spend >= 0.01) {text.push("Upgrades: " + (Math.round(100*metrics.count_mov.upgrade_spend)/100) + " (" + (Math.round(1000*metrics.count_mov.upgrade_spend/outflow_total)/10) + "%)")}
                    if (metrics.count_mov.repair_spend >= 0.01) {text.push("Repairs: " + (Math.round(100*metrics.count_mov.repair_spend)/100) + " (" + (Math.round(1000*metrics.count_mov.repair_spend/outflow_total)/10) + "%)")}
                    if (metrics.count_mov.build_spend >= 0.01) {text.push("Builds: " + (Math.round(100*metrics.count_mov.build_spend)/100) + " (" + (Math.round(1000*metrics.count_mov.build_spend/outflow_total)/10) + "%)")}
                    if (metrics.count_mov.spawn  >= 0.01|| metrics.last_mov.creeps_cost >= 0.01) {text.push("Creeps: " + (Math.round(100*metrics.count_mov.spawn)/100) + " (" + (Math.round(1000*metrics.count_mov.spawn/outflow_total)/10)
                    + "%) @ " + (Math.round(100*metrics.last_mov.creeps_cost)/100) + " (" + (Math.round(1000*metrics.last_mov.creeps_cost/outflow_total)/10) + "%)")}
                    if (transfer >= 0.01) {text.push("Transfer: " + (Math.round(100*transfer)/100) + " (" + (Math.round(1000*transfer/outflow_total)/10) + "%)")}
                }

                // Apply visuals
                for (let i = 0; i < text.length; i++) {
                    visual.text(text[i], 0, i + 0.5, {align: "left"});
                }
    
                // Update world map
                let time = Game.time - Memory.rooms[room_name].metrics.tick;
                if (Game.rooms[room_name]) { time = 0 }
                Game.map.visual.text(time, new RoomPosition(25,7,room_name), {fontSize: 5, opacity: 0.3})
            } else {
                // Show indicator that metrics are loading
                visual.text("[ Room: " + room_name + " (unscanned) ]", 0, 0.5, {align: "left"});
            }

            // Show sightings
            if (sightings) {
                let sightings = Memory.rooms[room_name].sightings
                let sorted_players;
                if (sightings) {
                    // Build visuals
                    sorted_players = [];
                    for (let player in sightings) { sorted_players.push(player) }
                    sorted_players.sort((a, b) => sightings[a] - sightings[b]);

                    let text = [];
                    for (let i in sorted_players) {
                        let player = sorted_players[i];
                        text.push(player + ": " + (Game.time - sightings[player]));
                    }
                    text.push("[ Sightings ]")
    
                    // Apply visuals
                    for (let i = 0; i < text.length; i++) {
                        visual.text(text[i], 49, 49 - i, {align: "right"});
                    }
                }

                if (sorted_players.length) {
                    let recent = sorted_players.pop()
                    if (Game.time - sightings[recent] < 86000) { Game.map.visual.text(recent + ": " + (Game.time - sightings[recent]), new RoomPosition(25,43,room_name), {fontSize: 5, opacity: 0.3}) }
                }
            }
        }
    },

    // Search nearby rooms
    //
    // queue: Room name search queue. Sets starting room(s). Must be list of strings.
    // limit: Maximum distance to search from a starting room.
    // func: Optional callback function to use on room names. Behavior depends on method. Should accept room name and dist.
    // method: Action to take should a callback succeed:
    //  'first': Return name that passes. Because BFS, this will be the closest passable name.
    //  'best': Recurse to limit and return the name the had the highest return value. Will not count null results.
    //  'check': Recurse to limit and return a list of names that passed.
    //  null: Return all rooms in limit. Func should also be null.
    // dists can optionally be passed in to track src of room
    searchNearbyRooms: function(queue, limit=config.MAX_ROOM_SEARCH, func=null, method=null, dists={}, cur=null, cur_best=null, src=null) {
        // Initialize
        if (cur === null && (method === 'check' || method === null)) { cur = [] }

        let room = queue.shift();

        // Queue exhausted, return cur
        if (!room) { return cur }

        // Add current dist and set src if missing
        if (dists[room] === undefined) {
            dists[room] = [0,room];
            src = room;
        }
        let dist = dists[room][0];

        // Run callback
        if (func) {
            let result = func(room, dist);
            if (method === 'first' && result) { return room }
            if (method === 'best' && (cur_best === null || (result != null && result > cur_best))) { cur = room; cur_best = result }
            if (method === 'check' && result) { cur.push(room) }
        } else {
            cur.push(room)
        }

        // Queue neighbors if distance ok
        if (dist < limit) {
            for (let direction in Game.map.describeExits(room)) {
                let neighbor = Game.map.describeExits(room)[direction];

                // Queue if not duplicate
                if (dists[neighbor] == undefined) {
                    queue.push(neighbor);
                    dists[neighbor] = [dist + 1,src];
                }
            }
        }

        // Recurse
        return utils.searchNearbyRooms(queue, limit, func, method, dists, cur, cur_best, src);
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
                delete memory.survey;
                if (Game.rooms[room_name]) { memory.survey = utils.doSurvey(Game.rooms[room_name]) }
            }
            if (metrics || !memory.metrics) {
                delete memory.metrics;
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
                cpu_start: 0,
                cpu_cleanup: 0,
                cpu_log: 0,
                cpu_defend: 0,
                cpu_metrics: 0,
                cpu_task: 0,
                cpu_order: 0,
                cpu_visual: 0,
                cpu_total: 0,
                cpu_tasks: {}
            }
        }
    },

    // Unassign one or all creeps
    unassign(creep=null) {
        if (creep) {
            if (Game.creeps[creep]) {delete Game.creeps[creep].memory.task}
        } else {
            for (let creep in Game.creeps) { utils.unassign(creep) }
        }
    },

    // Mapping of resources to flags
    resource_flag: {
        "energy": COLOR_YELLOW,
        "H": COLOR_GREY
    },

    // Mapping of flags to resources
    flag_resource: {
        6: RESOURCE_ENERGY,
        9: RESOURCE_HYDROGEN
    }

}

module.exports = utils;