const config = require("config");

class Body {

    constructor() {
        this.base = [WORK,CARRY,MOVE];
        this.add = [WORK,CARRY,MOVE];

        this.name = "Worker";
    }

    spawn(spawner, task, limit=null) {
        // Get maximum affordable size
        let i = 1;
        let body = this.base;
        let name = this.name + "-" + Game.time;
        if (this.add) {
            for (; i < limit || limit === null; i++) {
                let result = spawner.spawnCreep(body.concat(this.add), name, {dryRun: true});
                if (result === OK) {
                    body = body.concat(this.add)
                } else {
                    break;
                }
            }
        }

        // Determine cost
        let cost = 0;
        for (let i in body) {
            cost += BODYPART_COST[body[i]];
        }

        let result = spawner.spawnCreep(body, name, {memory: {task: task.compress(), body: this.name, size: i, cost: cost}});
        if (result === OK) {
            // Update cost metrics
            if (spawner.room.memory.metrics && spawner.room.memory.metrics.count) { spawner.room.memory.metrics.count.spawn += cost }
            console.log("Spawning " + name + " size " + i + " for " + task.id + " at " + spawner.room.name + ":" + spawner.name);
            return [name, i];
        }
        return [null, null];
    }

}

module.exports = Body;