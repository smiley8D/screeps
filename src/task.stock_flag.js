const config = require("config");
const utils = require('utils');

const Task = require("task");
const Hauler = require("body.hauler");

class StockFlag extends Task {

    static emoji = '📦';

    constructor(flag, wanted) {
        super("StockFlag", flag.name, flag.pos.roomName, wanted);
        this.body = new Hauler();
        this.max_workers = 1;
    }

    static getTasks() {
        // Search for logistics flags
        let tasks = []

        for (let flag in Game.flags) {
            flag = Game.flags[flag];
            if (flag.color != COLOR_WHITE) { continue }

            // Default for no/non-visible inventory
            let wanted = 5;
            let resource = utils.flag_resource[flag.secondaryColor];

            // Check for inventory
            let structs = flag.pos.lookFor(LOOK_STRUCTURES).filter((s) => s.store);
            if (structs.length) {
                if (resource) {
                    wanted = Math.max(0, Math.log(structs[0].store.getFreeCapacity(resource)));
                } else {
                    wanted = Math.max(0, Math.log(structs[0].store.getUsedCapacity()));
                }
            }

            tasks.push(new StockFlag(flag, wanted))
        }

        return tasks
    }

    static doTask(creep) {
        // Get flag
        let flag = Game.flags[creep.memory.task.tgt];
        if (!flag) {
            creep.memory.task = null
            return ERR_INVALID_TARGET
        }
        let resource = utils.flag_resource[flag.secondaryColor];

        // Check for wrong resources
        if (resource && creep.store.getUsedCapacity(resource) + creep.store.getFreeCapacity() != creep.store.getCapacity()) {
            creep.memory.curTgt = null;
            return utils.doDst(creep, utils.findDst(creep));
        }

        // Update action lock
        if ((resource && !creep.store.getFreeCapacity()) || (!resource && !creep.store.getUsedCapacity())) {
            // Inv full and resource wanted, or inv empty and space wanted, enage lock
            creep.memory.task.lock = true;
            creep.memory.curSrc = null;
            creep.memory.curDst = null;
        } else if ((resource && !creep.store.getUsedCapacity()) || (!resource && !creep.store.getFreeCapacity())) {
            // Inv empty and resource wanted, or inv full and space wanted, disengage lock
            creep.memory.task.lock = false;
        }

        if (creep.memory.task.lock) {
            let structs = flag.pos.lookFor(LOOK_STRUCTURES).filter((s) => s.store);
            // Primary objective
            if (structs.length && resource) {
                // Fill storage
                return utils.doDst(creep, structs[0], resource);
            } else if (structs.length) {
                // Empty storage
                return utils.doSrc(creep, structs[0]);
            } else {
                // Move to position
                return creep.moveTo(flag, {visualizePathStyle: {stroke: (resource ? "#1e90ff" : "#ffa500")}});
            }
        } else {
            // Secondary objective
            if (resource) {
                // Fill with resource
                return utils.doSrc(creep, utils.findSrc(creep, resource), resource);
            } else {
                // Depo
                return utils.doDst(creep, utils.findDst(creep));
            }
        }
    }

}

module.exports = StockFlag;