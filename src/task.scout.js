const Task = require("task");
const config = require("config");
const utils = require("utils");
const ScoutBody = require("body.scout");

class Scout extends Task {

    constructor(room, spawn_room) {
        super("Scout", room, room, 1);
        this.body = new ScoutBody();
        this.max_workers = 1;
        this.emoji = '📡';
        this.search_rooms = [room, spawn_room];
    }

    static getTasks() {
        let rooms = new Map();
        let flagged_rooms = new Map();
        // Add scout flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];

            // Only match scout flags
            if (flag.color == COLOR_BLUE) { flagged_rooms.set(flag.pos.roomName,flag) }
        }

        // Check all spawners
        for (let spawner in Game.spawns) {
            spawner = Game.spawns[spawner];

            // Get rooms in range that need scanning
            let found_rooms = utils.searchNearbyRooms([spawner.room.name],
                (r) => !rooms.has(r) && (flagged_rooms.has(r) || !Memory.rooms[r] || !Memory.rooms[r].metrics || (Memory.rooms[r].metrics.tick < (Game.time - config.SCOUT_TICK) ||
                (Memory.rooms[r].sightings && Object.values(Memory.rooms[r].sightings).some((t) => t >= Game.time - config.SCOUT_TICK)))),
                30,0);
            
            for (let i in found_rooms) {
                if (!rooms.has(found_rooms[i])) { rooms.set(found_rooms[i], new Scout(found_rooms[i], spawner.room.name)) }
            }
        }

        return rooms.values();
    }

    static doTask(creep) {
    // Move to room
    if (creep.room.name != creep.memory.task.tgt) {
        creep.memory.room = creep.memory.task.tgt;
        creep.say("📡" + creep.memory.task.tgt);
        return;
    }

    creep.say("📡");
}

}

module.exports = Scout;