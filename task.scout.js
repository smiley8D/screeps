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
                // Only scout unclaimed rooms
                if (!rooms.has(exit) && (!Game.rooms[exit] || !Game.rooms[exit].controller || !Game.rooms[exit].controller.my)) { rooms.set(exit,new Scout(exit)) }
            }
        }
        return rooms.values();
    }

    static doTask(creep) {
        let result = ERR_NOT_FOUND;

        // Move to room center
        result = creep.moveTo(new RoomPosition(25,25,creep.memory.task.tgt), {visualizePathStyle: {}});

        if (result != OK) {
            creep.say("📡" + result);
        } else {
            creep.say("📡");
        };
    }

}

module.exports = Scout;