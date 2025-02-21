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
        // this.max_search = 50;
        this.search_rooms = [room, spawn_room];
    }

    static getTasks() {
        let start = Game.cpu.getUsed();
        let rooms = new Map();
        let flagged_rooms = new Map();
        // Add scout flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];

            // Only match scout flags
            if (flag.color == COLOR_BLUE) { flagged_rooms.set(flag.pos.roomName,flag) }
        }

        // // Check for rooms that need a refresh
        // for (let room in Memory.rooms) {
        //     let metrics = Memory.rooms[room].metrics;
        //     let sightings = Memory.rooms[room].sightings;


        // }

        // // Check neighbors
        // for (let room in Game.rooms) {
        //     for (let dir in Game.map.describeExits(room)) {
        //         let exit = Game.map.describeExits(room)[exit]
        //     }
        // }

        for (let spawner in Game.spawns) {
            spawner = Game.spawns[spawner];

            // Get rooms in range that need scanning
            let found_rooms = utils.searchNearbyRooms([spawner.room.name],
                (r) => !rooms.has(r) && (flagged_rooms.has(r) || !Memory.rooms[r] || !Memory.rooms[r].metrics || (Memory.rooms[r].metrics.tick < (Game.time - config.SCOUT_TICK) ||
                (Memory.rooms[r].sightings && Object.keys(Memory.rooms[r].sightings).some((k) => k != 'Invader' && Memory.rooms[r].sightings[k] >= Memory.rooms[r].metrics.tick / 5)))),
                30,0);
            
            for (let i in found_rooms) {
                if (!rooms.has(found_rooms[i])) { rooms.set(found_rooms[i], new Scout(found_rooms[i], spawner.room.name)) }
            }
        }

        console.log("Scout CPU:",Game.cpu.getUsed()-start);
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