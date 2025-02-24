const config = require("config");

class Body {

    constructor() {
        this.base = [WORK,CARRY,MOVE];
        this.add = [WORK,CARRY,MOVE];

        this.name = "Worker";
    }

    spawn(spawner, task, limit=null) {
        // Compute costs
        let cost = 0;
        for (let part of this.base) {
            cost += BODYPART_COST[part];
        }
        let add_cost = 0;
        for (let part of this.add) {
            add_cost += BODYPART_COST[part];
        }

        // Get maximum affordable size
        let i = 1;
        let body = this.base;
        let name = this.name + "-" + Game.time;
        if (this.add) {
            for (; i < limit || limit === null; i++) {
                let result = spawner.spawnCreep(body.concat(this.add), name, {dryRun: true});
                if (result === OK) {
                    body = body.concat(this.add)
                    cost += add_cost;
                } else {
                    break;
                }
            }
        }

        let result = spawner.spawnCreep(body, name, {memory: {task: task.compress(), body: this.name, size: i, cost: cost, spawn: spawner.name}});
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