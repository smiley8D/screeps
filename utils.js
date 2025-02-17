const config = require("config");

utils = {
    // Fill a creep's inventory from available fills.
    fill: function(creep, mine=false, trash_only=false, partial=false, resource=RESOURCE_ENERGY) {
        // Check capacity
        if (!creep.store.getFreeCapacity(resource)) {
            creep.memory.curFill = null;
            return;
        }

        // Try current fill
        let fill = Game.getObjectById(creep.memory.curFill);

        // Find new fill
        if (!fill || trash_only) {
            // Assemble list of candidate fills
            let fills = [];
            if (mine && creep.body.some((b) => b.type == WORK) && resource == RESOURCE_ENERGY) { fills = creep.room.find(FIND_SOURCES_ACTIVE) }
            if (!trash_only) { fills = fills.concat(creep.room.find(FIND_STRUCTURES, { filter: (o) => (o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE) &&
                    (o.store.getUsedCapacity(resource) >= creep.store.getFreeCapacity(resource) || (partial && o.store.getUsedCapacity(resource))) })) }
            fills = fills.concat(creep.room.find(FIND_DROPPED_RESOURCES, { filter: (o => o.resourceType == resource && o.amount >= creep.store.getFreeCapacity(resource) || partial) }),
                creep.room.find(FIND_TOMBSTONES, { filter: (o) => o.store.getUsedCapacity(resource) >= creep.store.getFreeCapacity(resource) || (partial && o.store.getUsedCapacity(resource)) }));

            // Find closest
            fill = creep.pos.findClosestByPath(fills);
            if (fill) {
                creep.memory.curFill = fill.id;
            } else {
                creep.memory.curFill = null;
                return;
            }
        }

        // Try pickup
        let result = creep.pickup(fill);

        // Try withdraw
        if (result != OK && result != ERR_NOT_IN_RANGE) { result = creep.harvest(fill) }

        // Try harvest
        if (result != OK && result != ERR_NOT_IN_RANGE) { result = creep.withdraw(fill, RESOURCE_ENERGY) }

        // Move in range
        if (result == ERR_NOT_IN_RANGE) { creep.moveTo(fill, {visualizePathStyle: {stroke: "#ffa500"}}) }

        // Allowed result, return OK
        if (result != OK && result != ERR_NOT_IN_RANGE) { 
            // Cannot fill
            creep.memory.curFill = null;
        }
    },

    // Empty a creep's inventory to available dsts.
    depo: function(creep, resource=RESOURCE_ENERGY) {
        // Check capacity
        if (!creep.store.getUsedCapacity()) {
            creep.memory.curDepo = null;
            return;
        }
        // Try current depo
        let depo = Game.getObjectById(creep.memory.curDepo)

        // Find new depo
        if (!depo) {
            // Find closest
            depo = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: (o) => (o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE) &&
                o.store.getFreeCapacity(resource) >= creep.store.getUsedCapacity(resource) });

            if (depo) {
                creep.memory.curDepo = depo.id;
            } else {
                creep.memory.curDepo = null;
                return;
            }
        }

        // Try transfer
        let result = creep.transfer(depo, RESOURCE_ENERGY);

        // Move in range
        if (result == ERR_NOT_IN_RANGE) { creep.moveTo(depo, {visualizePathStyle: {stroke: "#1e90ff"}}) }

        // Allowed result, return OK
        if (result != OK && result != ERR_NOT_IN_RANGE) { 
            // Cannot depo
            creep.memory.curDepo = null;
        }
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
            },
            hits: 0,
            hits_max: 0,
            hits_per: 0,
            build: 0,
            build_max: 0,
            build_per: 0,
            upgrade: 0,
        }
        for (let resource of RESOURCES_ALL) {
            metrics.resources.total[resource] = 0;
            metrics.resources.over[resource] = 0;
            metrics.resources.under[resource] = 0;
            metrics.resources.fill[resource] = 0;
            metrics.resources.fill_max[resource] = 0;
            metrics.resources.extracted[resource] = 0;
        }
        return metrics;
    },

    doChange: function(prev, cur) {
        let result = {};
        for (let i in prev) {
            if (typeof prev[i] == "object") { result[i] = utils.doChange(prev[i], cur[i])}
            else { result[i] = (cur[i] - prev[i]) / config.TASK_TICK }
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

    stringMetrics: function(metrics, cur="") {
        let result = "";
        for (let i in metrics) {
            if (typeof metrics[i] == "object") {
                result += utils.stringMetrics(metrics[i], cur + i + ":");
            } else if (metrics[i]) { 
                result += cur + i + " = " + metrics[i] + "\n";
            }
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
                metrics.hits_max += structure.hitsMax;
                if (structure.hits < structure.hitsMax * config.DMG_THRESHOLD) {
                    metrics.hits += structure.hits;
                } else {
                    metrics.hits += structure.hitsMax;
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
                    if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_YELLOW).length) {
                        // Flagged as empty
                        if (structure.store.getUsedCapacity()) { room.memory.visuals.push(["⬇︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                        for (let resource of RESOURCES_ALL) {
                            metrics.resources.over[resource] += structure.store.getUsedCapacity(resource);
                        }
                    } else if (structure.pos.lookFor(LOOK_FLAGS).filter((f) => f.color == COLOR_BLUE).length) {
                        // Flagged as fill
                        if (structure.store.getUsedCapacity()) { room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                        for (let resource of RESOURCES_ALL) {
                            metrics.resources.under[resource] += structure.store.getFreeCapacity(resource);
                        }
                    } else {
                        // Non-flagged container/storage, build average
                        for (let resource of RESOURCES_ALL) {
                            metrics.resources.fill[resource] += structure.store.getUsedCapacity(resource);
                            metrics.resources.fill_max[resource] += structure.store.getCapacity(resource);
                        }
                    }
                } else {
                    // Not a container or storage, always fill
                    for (let resource of RESOURCES_ALL) {
                        metrics.resources.under[resource] += structure.store.getFreeCapacity(resource);
                        if (structure.store.getFreeCapacity()) { room.memory.visuals.push(["⬆︎", structure.pos.x, structure.pos.y, config.TASK_TICK]) }
                    }
                }
            }
        }

        // Process over/under averages
        for (let resource of RESOURCES_ALL) {
            metrics.resources.fill_avg[resource] = metrics.resources.fill[resource] / metrics.resources.fill_max[resource];
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
        }
        for (let structure of room.find(FIND_TOMBSTONES).concat(room.find(FIND_RUINS))) {
            for (let resource of RESOURCES_ALL) {
                metrics.resources.total[resource] += structure.store.getUsedCapacity(resource);
                metrics.resources.over[resource] += structure.store.getUsedCapacity(resource);
            }
        }

        // Process creeps
        for (let creep of room.find(FIND_MY_CREEPS)) {
            for (let resource of RESOURCES_ALL) {
                metrics.resources.total[resource] += creep.store.getUsedCapacity(resource);
            }
        }

        // Process construction sites
        for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            metrics.build += site.progress;
            metrics.build_max += site.progressTotal;
        }

        // Process controller
        let controller = room.controller;
        if (controller.my) {
            for (let i = 1; i < controller.level - 1; i++) {
                metrics.upgrade += CONTROLLER_LEVELS[i];
            }
            metrics.upgrade += controller.progress;
        }

        // Ignore non-present resources
        for (let resource in metrics.resources.fill_max) {
            if (!metrics.resources.fill[resource]) {
                metrics.resources.fill_max[resource] = 0;
            }
        }

        // Process percentages
        metrics.build_per = metrics.build / metrics.build_max;
        metrics.hits_per = metrics.hits / metrics.hits_max;

        // Calculcate changes
        let mov_change;
        let mov;
        let change;
        let prev_metrics = room.memory.metrics;
        if (!prev_metrics) { prev_metrics = {
            // Initialize metrics
            last: JSON.parse(JSON.stringify(metrics)),
            mov_change: utils.freshMetrics(),
            mov: JSON.parse(JSON.stringify(metrics)),
            change: utils.freshMetrics(),
        } }
        change = utils.doChange(prev_metrics.last, metrics);
        mov_change = utils.doMov(prev_metrics.mov_change, change)
        mov = utils.doMov(prev_metrics.mov, metrics);

        // Submit visuals
        let text = ["Room: " + room.name];
        if (metrics.build) { text.push(
            "Build: " + (metrics.build_max - metrics.build) + " (" + Math.round(mov_change.build) + ") " + (Math.round(1000 * metrics.build_per)/10) + "% (" + (Math.round(1000 * mov_change.build_per)/10) + "%)"
        ) }
        if (metrics.hits < metrics.hits_max) {text.push(
            "Damage: " + (metrics.hits_max - metrics.hits) + " (" + Math.round(mov_change.hits) + ") " + (Math.round(1000 * metrics.hits_per)/10) + "% (" + (Math.round(1000 * mov_change.hits_per)/10) + "%)"
        ) }
        for (let resource in RESOURCES_ALL) {
            if (metrics.resources.total[resource]) {text.push(
                resouce + ": " + metrics.resources.total[resource] + " (" + Math.round(mov_change.resources.total[resource]) + ")"
            )}
        }
        text.push("Upgrade: " + metrics.upgrade + " (" + Math.round(mov_change.upgrade) + ")")
        text.push("Energy: " + metrics.resources.total[RESOURCE_ENERGY] + " (" + Math.round(mov_change.resources.total[RESOURCE_ENERGY]) + ")")
        room.memory.visuals.push([text, 0, 0, config.TASK_TICK, {align: "left"}]);

        // Update memory
        room.memory.metrics = {
            last: metrics,
            mov_change: mov_change,
            mov: mov,
            change:change
        }
    }
}

module.exports = utils;