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
            fills = fills.concat(creep.room.find(FIND_DROPPED_RESOURCES, { filter: (o => o.resourceType == resource && o.amount >= creep.store.getFreeCapacity(resource) || (partial && o.store.getUsedCapacity(resource))) }),
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
    }
}

module.exports = utils;