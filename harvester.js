module.exports = function(creep) {
    // Determine task
    if (creep.store.getFreeCapacity() == 0) {
        creep.memory["harvest"] = false;
    } else if (creep.store.getUsedCapacity() == 0) {
        creep.memory["harvest"] = true;
    }

    // Conduct task
    if (creep.memory["harvest"]) {
        let source = creep.pos.findClosestByPath(FIND_SOURCES)
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source)
        }
    } else {
        let controller = creep.room.controller;
        if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(controller)
        }
    }
}