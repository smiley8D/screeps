const Task = require("task");
const Hauler = require("body.hauler");
const utils = require("utils");

class Supply extends Task {

    static emoji() {
        return '🚚';
    }

    constructor(start_name, end_name, start_pos, end_pos, resource, wanted) {
        super("Supply", start_name + ":" + end_name, start_pos.roomName, wanted);
        this.body = new Hauler();
        this.resource = resource;
        this.start = start_pos;
        this.end = end_pos;
        this.detail = start_name + ":" + end_name;
        this.max_workers = 2;
    }

    static getTasks() {
        let assignments = new Map();

        // // Assign all empty flags
        // let flag_queue = Object.values(Game.flags).filter((f) => f.room && f.color === COLOR_GREY);
        // while (flag_queue.length) {
        //     let flag = flag_queue.shift();

        //     // Skip if empty
        //     let struct = flag.pos.lookFor(LOOK_STRUCTURES, {filter: (s) => s.store});
        //     if (struct.length && struct[0].store && !struct[0].store.getUsedCapacity()) { continue }

        //     // Find fill flags
        //     let closest = flag.pos.findClosestByRange(FIND_FLAGS, {filter: (f) => f.room && f.color === COLOR_WHITE && f.secondaryColor === flag.secondaryColor &&
        //         (!assignments.has(f.name) || assignments.get(f.name)[1] > flag.pos.getRangeTo(f)) &&
        //         !(f.pos.lookFor(LOOK_STRUCTURES).filter((s) => s.store).some((s) => !s.store.getFreeCapacity()))});
        //     if (closest) {
        //         let range = flag.pos.getRangeTo(closest);
        //         assignments.set(flag.name, [flag, range, closest]);
        //         if (assignments.has(closest.name)) {
        //             let competitor = assignments.get(closest.name)[2];
        //             if (!(competitor instanceof StructureStorage)) {
        //                 assignments.delete(competitor.name);
        //                 flag_queue.push(competitor);
        //             }
        //         }
        //         assignments.set(closest.name, [closest, range, flag]);
        //     } else {
        //         // Find storage
        //         let room = utils.searchNearbyRooms([flag.pos.roomName], undefined, ((r,d) => Game.rooms[r] && Game.rooms[r].storage && Game.rooms[r].storage.my), 'first');
        //         if (room) { assignments.set(flag.name, [flag, Game.map.getRoomLinearDistance(flag.pos.roomName,room), Game.rooms[room].storage])}
        //     }
        // }

        // // Assign all remaining fill flags
        // flag_queue = Object.values(Game.flags).filter((f) => f.color === COLOR_WHITE);
        // while (flag_queue.length) {
        //     let flag = flag_queue.shift();

        //     // Skip if already assigned
        //     if (assignments.has(flag.name)) { continue }

        //     // Skip if inventory full
        //     let struct = flag.pos.lookFor(LOOK_STRUCTURES).filter((s) => s.store);
        //     if (struct.length && !struct[0].store.getFreeCapacity()) { continue }

        //     // Find storage
        //     let room = utils.searchNearbyRooms([flag.pos.roomName], undefined, ((r,d) => Game.rooms[r] && Game.rooms[r].storage && Game.rooms[r].storage.my), 'first');
        //     if (room) { assignments.set(flag.name, [flag, Game.map.getRoomLinearDistance(flag.pos.roomName,room), Game.rooms[room].storage])}
        // }

        // // Create tasks
        // let tasks = []
        // for (let [name, pair] of assignments) {
        //     let resource = utils.flag_resource[pair[0].secondaryColor];
        //     if (!resource) { continue }
        //     let path = PathFinder.search(pair[0].pos, pair[2].pos);
        //     let wanted = (path.path.length * 2 / 5);
        //     let struct = pair[0].pos.lookFor(LOOK_STRUCTURES).filter((s) => s.store);
        //     if (struct.length) {
        //         if (pair[0].color === COLOR_GREY) { wanted *= (struct[0].store.getUsedCapacity(resource) / struct[0].store.getCapacity()) }
        //         else if (pair[0].color === COLOR_WHITE) { wanted *= (struct[0].store.getFreeCapacity(resource) / struct[0].store.getCapacity()) }
        //     }
        //     let id = name;
        //     if (pair[2] instanceof Flag) { id += ":" + pair[2].name}
        //     if (pair[0].color === COLOR_GREY) {
        //         tasks.push(new Supply(id, pair[0].pos, pair[2].pos, resource, wanted))
        //     } else if (pair[0].color === COLOR_WHITE && pair[2] instanceof Flag) { continue }
        //     else {
        //         tasks.push(new Supply(id, pair[2].pos, pair[0].pos, resource, wanted))
        //     }
        // }

        let tasks = [];

        for (let flag of Object.values(Game.flags).filter((f) => f.color === COLOR_WHITE || f.color === COLOR_GREY)) {
            // Get resource
            let resource = utils.flag_resource[flag.secondaryColor];
            if (!resource) { continue }

            // Skip if flag reasonably fulfilled
            let struct;
            let fill;
            if (flag.room) { struct = flag.pos.lookFor(LOOK_STRUCTURES).filter((s) => s.store) }
            if (struct && struct.length && struct[0].store) {
                fill = struct[0].store.getUsedCapacity(resource) / struct[0].store.getCapacity(resource)
                if ((flag.color === COLOR_WHITE && fill > 0.9) || (flag.color === COLOR_GREY && fill < 0.1)) { continue }
            } else if (flag.color === COLOR_WHITE) {
                fill = 0;
            } else if (flag.color === COLOR_GREY) {
                fill = 1;
            }

            // Find storage
            let room = utils.searchNearbyRooms([flag.pos.roomName], undefined, ((r,d) => (Game.rooms[r] && Game.rooms[r].storage && Game.rooms[r].storage.my) ? ((
                (flag.color === COLOR_WHITE) ? Game.rooms[r].storage.store.getUsedCapacity(resource) : Game.rooms[r].storage.store.getFreeCapacity(resource)
            ) / ((d+1)**2)) : null), 'best');
            if (room) {
                // Compute wanted
                let storage = Game.rooms[room].storage;
                let path = PathFinder.search(flag.pos, storage.pos);
                let wanted = (path.path.length * 2 / 5);

                // Create tasks
                if (flag.color === COLOR_GREY) {
                    // wanted *= fill
                    tasks.push(new Supply(flag.name, storage.room.name, flag.pos, storage.pos, resource, wanted));
                } else if (flag.color === COLOR_WHITE) {
                    // wanted *= (1 - fill)
                    tasks.push(new Supply(storage.room.name, flag.name, storage.pos, flag.pos, resource, wanted));
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
            let struct = target.lookFor(LOOK_STRUCTURES).filter((s) => s.store);
            if (struct.length) {
                if (target.isEqualTo(start)) {
                    result = creep.withdraw(struct[0], resource);
                } else {
                    result = creep.transfer(struct[0], resource);
                }
            } else {
                if (!creep.pos.isEqualTo(target)) { creep.moveTo(target, {reusePath: 20, visualizePathStyle: {stroke: (target.isEqualTo(start) ? "#ffa500" : "#1e90ff")}}) }
                result = OK;
            }
        } else {
            result = creep.moveTo(target, {reusePath: 50, visualizePathStyle: {stroke: (target.isEqualTo(start) ? "#ffa500" : "#1e90ff")}});
        }

        return result;
    }
}

module.exports = Supply;