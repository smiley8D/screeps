const Task = require("task");
const config = require("config");
const ScoutBody = require("body.scout");

class Scout extends Task {

    constructor(room) {
        super("Scout", room, room, 1 / config.PART_MULT, 1);
        this.body = new ScoutBody();
    }

    static getTasks() {
        let rooms = new Map();
        for (let room in Game.rooms) {
            for (let direction in Game.map.describeExits(room)) {
                let exit = Game.map.describeExits(room)[direction];
                // Avoid duplicates
                if (rooms.has(exit)) {continue}

                // Scout if metrics outdated
                let exit_room = Game.rooms[exit];
                if (!exit_room && (!Memory.rooms[exit] || !Memory.rooms[exit].metrics || Memory.rooms[exit].metrics.tick < (Game.time - config.SCOUT_TICK))) {
                    rooms.set(exit,new Scout(exit))
                    continue;
                }

                // Scout if hostiles recently sighted
                if (Memory.rooms[exit] && Memory.rooms[exit].sightings) {
                    for (let player in Memory.rooms[exit].sightings) {
                        if (Memory.rooms[exit].sightings[player] >= (Game.time - config.SCOUT_TICK)) {
                            rooms.set(exit,new Scout(exit));
                            break
                        }
                    }
                }
            }
        }
        return rooms.values();
    }

    static doTask(creep) {
        let result = ERR_NOT_FOUND;

        // Move to room
        if (creep.room.name != creep.memory.task.room || creep.pos.x == 0 || creep.pos.y == 0 || creep.pos.x == 49 || creep.pos.y == 49) {
            result = creep.moveTo(new RoomPosition(25,25,creep.memory.task.room), {reusePath: 50, visualizePathStyle: {}});
        } else {
            result = OK;
        }

        if (result != OK) {
            creep.say("📡" + result);
        } else {
            creep.say("📡");
        };
    }

}

module.exports = Scout;