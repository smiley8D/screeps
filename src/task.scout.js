const Task = require("task");
const config = require("config");
const utils = require("utils");
const ScoutBody = require("body.scout");

class Scout extends Task {

    static emoji = '📡';

    constructor(room, spawn_room) {
        super("Scout", room, room, 1);
        this.body = new ScoutBody();
        this.max_workers = 1;
        this.search_rooms = [room, spawn_room];
    }

    static getTasks() {
        let tasks = [];
        let flagged_rooms = new Map();
        // Add scout flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];

            // Only match scout flags
            if (flag.color === COLOR_PURPLE && flag.secondaryColor === COLOR_PURPLE) { flagged_rooms.set(flag.pos.roomName,flag) }
        }

        // Assemble spawner rooms
        let spawn_rooms = []
        for (let spawner in Game.spawns) {
            spawn_rooms.push(Game.spawns[spawner].room.name);
        }

        // Get rooms in range that need scanning
        let dists = {}
        let found_rooms = utils.searchNearbyRooms(spawn_rooms, 50, (r,d) => flagged_rooms.has(r) && (!Memory.rooms[r] || !Memory.rooms[r].metrics ||
            (Memory.rooms[r].metrics.tick < (Game.time - config.SCOUT_TICK) ||
            (Memory.rooms[r].sightings && Object.keys(Memory.rooms[r].sightings).some((k) =>
                k != 'Power Bank' && k != 'Invader' && k != 'Source Keeper' && Memory.rooms[r].sightings[k] >= Memory.rooms[r].metrics.tick / 5)))),
            'check', dists);

        // Create tasks
        for (let i in found_rooms) {
            tasks.push(new Scout(found_rooms[i], dists[found_rooms[i]][1]));
        }

        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            return  creep.memory.task.room;
        }

        return OK;
    }

}

module.exports = Scout;