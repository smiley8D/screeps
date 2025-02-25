const Task = require("task");
const Hauler = require("body.hauler");
const utils = require("utils");

class Supply extends Task {

    static emoji() {
        return '🚚';
    }

    constructor(id, start_pos, end_pos, resource, wanted) {
        super("Supply", id, start_pos.roomName, wanted);
        this.body = new Hauler();
        this.resource = resource;
        this.start = start_pos;
        this.end = end_pos;
        this.detail = id;
        this.max_workers = 3;
    }

    static getTasks() {
        let assignments = new Map();

        // Assign all empty flags
        let flag_queue = Object.values(Game.flags).filter((f) => f.color === COLOR_GREY);
        while (flag_queue.length) {
            let flag = flag_queue.shift();

            // Skip if empty
            let struct = flag.pos.lookFor(LOOK_STRUCTURES);
            if (struct.length && struct[0].store && !struct[0].store.getUsedCapacity()) { continue }

            // Find fill flags
            let closest = flag.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => f.color === COLOR_WHITE && f.secondaryColor === flag.secondaryColor &&
                (!assignments.has(f.name) || assignments.get(f.name)[1] > flag.pos.getRangeTo(f)) &&
                !(f.pos.lookFor(LOOK_STRUCTURES).some((s) => s.store && !s.store.getFreeCapacity()))});
            if (closest) {
                let range = flag.pos.getRangeTo(closest);
                assignments.set(flag.name, [flag, range, closest]);
                if (assignments.has(closest.name)) {
                    let competitor = assignments.get(closest.name)[2];
                    if (!(competitor instanceof StructureStorage)) {
                        assignments.delete(competitor.name);
                        flag_queue.push(competitor);
                    }
                }
                assignments.set(closest.name, [closest, range, flag]);
            } else {
                // Find storage
                let room = utils.searchNearbyRooms([flag.pos.roomName], config.MAX_SEARCH_ROOMS, ((r,d) => Game.rooms[r] && Game.rooms[r].storage && Game.rooms[r].storage.my), 'first');
                if (room) { assignments.set(flag.name, [flag, Game.map.getRoomLinearDistance(flag.pos.roomName,room), Game.rooms[room].storage])}
            }
        }

        // Assign all remaining fill flags
        flag_queue = Object.values(Game.flags).filter((f) => f.color === COLOR_WHITE);
        while (flag_queue.length) {
            let flag = flag_queue.shift();

            // Skip if already assigned
            if (assignments.has(flag.name)) { continue }

            // Skip if inventory full
            let struct = flag.pos.lookFor(LOOK_STRUCTURES);
            if (struct.length && struct[0].store && !struct[0].store.getFreeCapacity()) { continue }

            // Find storage
            let room = utils.searchNearbyRooms([flag.pos.roomName], config.MAX_SEARCH_ROOMS, ((r,d) => Game.rooms[r] && Game.rooms[r].storage && Game.rooms[r].storage.my), 'first');
            if (room) { assignments.set(flag.name, [flag, Game.map.getRoomLinearDistance(flag.pos.roomName,room), Game.rooms[room].storage])}
        }

        // Create tasks
        let tasks = []
        for (let [name, pair] of assignments) {
            let resource = utils.flag_resource[pair[0].secondaryColor];
            if (!resource) { continue }
            let path = PathFinder.search(pair[0].pos, pair[2].pos);
            let wanted = (path.path.length * 2 / 5);
            let struct = pair[0].pos.lookFor(LOOK_STRUCTURES);
            if (struct.length && struct[0].store) {
                if (pair[0].color === COLOR_GREY) { wanted *= (struct[0].store.getUsedCapacity(resource) / struct[0].store.getCapacity()) }
                else if (pair[0].color === COLOR_WHITE) { wanted *= (struct[0].store.getFreeCapacity(resource) / struct[0].store.getCapacity()) }
            }
            let id = name;
            if (pair[2] instanceof Flag) { id += ":" + pair[2].name}
            if (pair[0].color === COLOR_GREY) {
                tasks.push(new Supply(id, pair[0].pos, pair[2].pos, resource, wanted))
            } else if (pair[0].color === COLOR_WHITE && pair[2] instanceof Flag) { continue }
            else {
                tasks.push(new Supply(id, pair[2].pos, pair[0].pos, resource, wanted))
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
            resource: this.resource,
            start: this.start,
            end: this.end
        }
    }

    static doTask(creep) {
        let start = creep.memory.task.start;
        start = new RoomPosition(start.x, start.y, start.roomName);
        let end = creep.memory.task.end;
        end = new RoomPosition(end.x, end.y, end.roomName);
        let resource = creep.memory.task.resource;

        let result = ERR_NOT_FOUND;

        // Inventory contains wrong resource, depo
        if (creep.store.getCapacity() > creep.store.getFreeCapacity() + creep.store.getUsedCapacity(resource)) {
            return utils.doDst(creep, utils.findDst(creep, undefined, {haulers: false}));
        }

        // Set target
        if (!creep.store.getUsedCapacity() || !creep.memory.curTgt) {
            creep.memory.curTgt = start;
        } else if (!creep.store.getFreeCapacity()) {
            creep.memory.curTgt = end;
        }
        let target = creep.memory.curTgt;
        target = new RoomPosition(target.x, target.y, target.roomName);

        // Work
        if (creep.pos.isNearTo(target)) {
            if (!creep.pos.isEqualTo(target)) { creep.moveTo(target, {reusePath: 20, visualizePathStyle: {stroke: (target.isEqualTo(start) ? "#ffa500" : "#1e90ff")}}) }
            let struct = target.lookFor(LOOK_STRUCTURES);
            if (struct.length && struct[0].store) {
                if (target.isEqualTo(start)) {
                    result = creep.withdraw(struct[0], resource);
                } else {
                    result = creep.transfer(struct[0], resource);
                }
            } else {
                result = OK;
            }
        } else {
            result = creep.moveTo(target, {reusePath: 20, visualizePathStyle: {stroke: (target.isEqualTo(start) ? "#ffa500" : "#1e90ff")}});
        }

        return result;
    }
}

module.exports = Supply;