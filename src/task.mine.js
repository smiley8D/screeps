const Task = require("task");
const Drudge = require("body.drudge");

const utils = require("utils");
const config = require("config");

class Mine extends Task {

    static emoji = '⛏️';

    constructor(pos, room, wanted, spots) {
        super("Mine", room + ":" + pos.x + ":" + pos.y, room, wanted);
        if (Game.rooms[room] && Game.rooms[room].controller && Game.rooms[room].controller.my) {
            this.body = new Drudge();
        }
        this.max_workers = spots;
        this.x = pos.x,
        this.y = pos.y
    }

    static getTasks() {
        let tasks = []
        // Exploit energy in owned rooms
        for (let room in Game.rooms) {
            room = Game.rooms[room];

            // Check room owned
            if (!room.controller || !room.controller.my) { continue }

            // Find mineables
            for (let source of room.find(FIND_SOURCES)) {
                // Determine spots
                let spots = utils.spots(source.pos);

                // Determine wanted
                let wanted = 1 + (source.energyCapacity / 600);

                tasks.push(new Mine(source.pos, room.name, wanted, spots));
            }
        }

        // Process exploit flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];
            if (flag.color != COLOR_YELLOW) { continue }

            // Some checks
            if (flag.secondaryColor === COLOR_YELLOW && flag.room && flag.room.controller && flag.room.controller.my) {
                flag.remove();
                continue;
            }

            // Get survey data
            if (!Memory.rooms[flag.pos.roomName] || !Memory.rooms[flag.pos.roomName].metrics) { continue }
            let survey = Memory.rooms[flag.pos.roomName].metrics.survey;

            // Flag types
            if (flag.secondaryColor === COLOR_BROWN) {
                // Create tasks or non-sources
                for (let i in survey.minerals) {
                    let mineral = survey.minerals[i];

                    tasks.push(new Mine(new RoomPosition(mineral.x, mineral.y, flag.pos.roomName), flag.pos.roomName, 1, mineral.spots));
                }
                for (let i in survey.deposits) {
                    tasks.push(new Mine(new RoomPosition(deposit.x, deposit.y, flag.pos.roomName), flag.pos.roomName, 1, 1));
                }
            } else if (flag.secondaryColor === COLOR_YELLOW) {
                // Don't double-tap owned rooms
                if (flag.room && flag.room.controller && flag.room.controller.my) { continue }

                // Create tasks for sources
                for (let i in survey.sources) {
                    let source = survey.sources[i];

                    let wanted = 1 + (source.capacity / 600);

                    tasks.push(new Mine(new RoomPosition(source.x, source.y, flag.pos.roomName), flag.pos.roomName, wanted, source.spots));
                }
            }
        }

        return tasks;
    }

    // Compress tasks for memory storage
    compress() {
        return {
            id: this.id,
            name: this.name,
            tgt: this.tgt,
            room: this.room,
            detail: this.detail,
            x: this.x,
            y: this.y
        }
    }

    static doTask(creep) {
        // Get target
        let target = Game.getObjectById(creep.memory.curTgt);
        let pos;
        if (!target && creep.store.getUsedCapacity()) {
            // First round, empty inventory
            return utils.doDst(creep, utils.findDst(creep));
        } else if (!target) {
            pos = creep.room.getPositionAt(creep.memory.task.x, creep.memory.task.y);
            target = creep.room.lookForAt(LOOK_SOURCES, pos);
            let look_result = creep.room.lookForAt(LOOK_SOURCES, pos);
            if (look_result.length) { target = look_result[0] }
        }
        if (!target) {
            let look_result = creep.room.lookForAt(LOOK_MINERALS, pos);
            if (look_result.length) { target = look_result[0] }
        }
        if (!target) {
            let look_result = creep.room.lookForAt(LOOK_DEPOSITS, pos);
            if (look_result.length) { target = look_result[0] }
        }
        if (!target) { return ERR_NOT_FOUND }
        creep.memory.curTgt = target.id;

        // Get resource
        let resource = RESOURCE_ENERGY;
        if (target instanceof Mineral ) { resource = target.mineralType }
        if (target instanceof Deposit ) { resource = target.depositType }

        let result;
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(resource)) {
            // Inventory contains wrong resource, depo
            if (creep.memory.body === "Drudge") {
                result = utils.doDst(creep, utils.findDst(creep, {limit: 3}));
            } else {
                result = utils.doDst(creep, utils.findDst(creep));
            }
        } else if (creep.store.getFreeCapacity() >= 2 * (2 * (creep.memory.size - 1) + 1)) {
            // Space in inventory, mine
            delete creep.memory.curDst;
            result = creep.harvest(target)
            if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(target, { visualizePathStyle: {} }) }
        } else {
            // Full inventory, depo
            let dst;
            if (creep.memory.body === "Drudge") {
                dst = utils.findDst(creep, resource, {limit: 3});
            } else {
                dst = utils.findDst(creep, resource);
            }
            if (!dst) {
                creep.moveTo(target, { visualizePathStyle: {} });
                result = ERR_NOT_FOUND;
            } else {
                result = utils.doDst(creep, dst, resource);
            }
        }

        return result;
    }

}

module.exports = Mine;