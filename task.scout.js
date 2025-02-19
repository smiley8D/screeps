const Task = require("task");
const config = require("config");
const ScoutBody = require("body.scout");

class Scout extends Task {

    constructor(room) {
        super("Scout", room, 1 / config.PART_MULT, 1);
        this.body = new ScoutBody();
    }

    static getTasks(room) {
        let rooms = new Map();
        for (let room in Game.rooms) {
            for (let exit of Game.map.describeExits(room)) {
                if (!Game.rooms[exit] && !rooms.has(exit)) { room.set(exit,newScout(exit)) }
            }
        }
        return rooms.values();
    }

    static doTask(creep) {
        // Move to room
        result = creep.moveTo(RoomPosition(25,25,creep.memory.task.tgt), {visualizePathStyle: {}});

        if (result != OK) {
            creep.say("📡" + result);
        } else {
            creep.say("📡");
        };
    }

}

module.exports = Scout;