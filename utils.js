utils = {
    // Fill a creep's inventory from available fills.
    fill: function(creep, mine=false, resource=RESOURCE_ENERGY) {
        // Try current fill
        let fill = Game.getObjectById(creep.memory.curFill)

        // Find new fill
        if (!fill) {
            // Assemble list of candidate fills
            let fills = [];
            if (mine && resource == RESOURCE_ENERGY) { fills = creep.room.find(FIND_SOURCES_ACTIVE) }
            fills = fills.concat(creep.room.find(FIND_DROPPED_RESOURCES, { filter: (o => o.resourceType == resource && o.amount >= creep.store.getFreeCapacity(resource) ) }),
                creep.room.find(FIND_TOMBSTONES, { filter: (o) => o.store.getUsedCapacity(resource) >= creep.store.getFreeCapacity(resource) }),
                creep.room.find(FIND_STRUCTURES, { filter: (o) => (o.structureType == STRUCTURE_CONTAINER || o.structureType == STRUCTURE_STORAGE) &&
                     o.store.getUsedCapacity(resource) >= creep.store.getFreeCapacity(resource) }));

            // Find closest
            fill = creep.pos.findClosestByPath(fills);
        }

        // Try pickup
        let result = creep.pickup(fill);

        // Try withdraw
        if (result != OK && result != ERR_NOT_IN_RANGE) { result = creep.harvest(fill) }

        // Try harvest
        if (result != OK && result != ERR_NOT_IN_RANGE) { result = creep.withdraw(fill, RESOURCE_ENERGY) }

        // Move in range
        if (result == ERR_NOT_IN_RANGE) { result = creep.moveTo(fill, {visualizePathStyle: {stroke: "#ffa500"}}) }

        // Allowed result, return OK
        if (result == OK || result == ERR_NOT_IN_RANGE || result == ERR_TIRED) { return OK }

        // Bad result, unset and return
        creep.memory.curFill = null;
        return result;
    },

    // Empty a creep's inventory to available dsts.
    depo: function(creep, empty=false) {
        // Check creep needs filling
        if (!creep.store.getUsedCapacity(RESOURCE_ENERGY) || (creep.store.getFreeCapacity(RESOURCE_ENERGY) && !creep.memory.curDepo)) {
            creep.memory.curDepo = null;
            return;
        }

        // Set fill
        let depo;

        // Try current depo
        if (depo = Game.getObjectById(creep.memory.curDepo)) {}

        // Try containers/storage
        else if (depo = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: function(o) {return o.store && o.store.getFreeCapacity(RESOURCE_ENERGY)}})) {}

        // No depo found
        else {
            creep.memory.curDepo = null;
            return;
        }

        // Access depo
        let result = creep.transfer(depo, RESOURCE_ENERGY)

        // Handle movement
        if (result == ERR_NOT_IN_RANGE) {
            if (creep.moveTo(depo, {visualizePathStyle: {stroke: "#1e90ff"}}) != OK) {
                // Depo unreachable, unset
                creep.memory.curDepo = null;
                return
            }
        } else if (result != OK) {
            // Invalid depot, unset
            creep.memory.curDepo = null;
            return;
        }

        creep.memory.curDepo = depo.id;
        return depo;
    }
}

module.exports = utils;