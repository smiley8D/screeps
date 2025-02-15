utils = {
    // Fill a creep's inventory from available fills.
    fill: function(creep, mine=false, full=false) {
        // Check creep needs filling
        if (!creep.store.getFreeCapacity(RESOURCE_ENERGY) || (creep.store.getUsedCapacity(RESOURCE_ENERGY) && !creep.memory.curFill)) {
            creep.memory.curFill = null;
            return;
        }

        // Set fill
        let fill;

        // Try current fill
        if (fill = Game.getObjectById(creep.memory.curFill)) {}

        // Try drops
        else if (fill = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES,
            {filter: {resourceType: RESOURCE_ENERGY}})) {}

        // Try tombstones
        else if (fill = creep.pos.findClosestByPath(FIND_TOMBSTONES,
            {filter: function(o) {return o.store.getUsedCapacity(RESOURCE_ENERGY)}})) {}

        // Try storage/containers (if restocking, can only take from yellow-flagged containers)
        else if (fill = creep.pos.findClosestByPath(FIND_STRUCTURES,
            {filter: function(o) { return ((o.structureType == STRUCTURE_STORAGE || o.structureType == STRUCTURE_CONTAINER) && o.store.getUsedCapacity(RESOURCE_ENERGY)) }})) {}

        // Try mining if allowed
        else if (fill = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)) {
            if (!mine) {
                creep.memory.curFill = null;
                return;
            }
        }

        // No fill found
        else {
            creep.memory.curFill = null;
            return;
        }

        // Access fill
        let result;

        // Pickup drops
        if (fill.amount) { result = creep.pickup(fill); }

        // Harvest source
        else if (fill.energy) { result = creep.harvest(fill); }

        // Withdraw
        else if (fill.store) { result = creep.withdraw(fill, RESOURCE_ENERGY) }

        // Invalid fill
        else {
            creep.memory.curFill = null;
            return;
        }

        if (result == ERR_NOT_IN_RANGE) {
            // Move to fill
            if (creep.moveTo(fill, {visualizePathStyle: {stroke: "#ffa500"}}) != OK) {
                // Fill unreachable, unset
                creep.memory.curFill = null;
                return
            }
        } else if (result != OK) {
            // Invalid fill
            creep.memory.curFill = null;
            return;
        }

        creep.memory.curFill = fill.id;
        return fill;
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