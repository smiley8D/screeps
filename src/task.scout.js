const Task = require("task");
const config = require("config");
const utils = require("utils");
const ScoutBody = require("body.scout");

class Scout extends Task {

    static emoji() {
        return '📡';
    }

    constructor(room) {
        super("Scout", room, room, 1);
        this.body = new ScoutBody();
        this.search_rooms = [room, Game.spawns[config.SCOUT_SPAWN].room.name];
    }

    static getTasks() {
        let tasks = [];
        let spawn = Game.spawns[config.SCOUT_SPAWN];
        if (!spawn) { return [] }

        // Check scout flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];
            if (flag.color != COLOR_PURPLE || flag.secondaryColor != COLOR_PURPLE) { continue }

            tasks.push(new Scout(flag.pos.roomName));
        }

        // Get closest room in range that needs scanning every 5 task ticks
        if (Game.time % (5 * config.TASK_TICK) === 0) {
            let found_room = utils.searchNearbyRooms([spawn.room.name], 50, ((r,d) => !Memory.rooms[r] || !Memory.rooms[r].metrics ||
                (Memory.rooms[r].metrics.tick < (Game.time - config.SCOUT_TICK))), 'first');

            if (found_room) {
                Memory.scout_room = found_room;
            }
        }

        if (Memory.scout_room) {
            tasks.push(new Scout(Memory.scout_room));
        }

        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            creep.memory.room = creep.memory.task.room;
            return  ERR_NOT_IN_RANGE;
        }

        return OK;
    }

}

module.exports = Scout;