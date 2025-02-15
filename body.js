class Body {

    constructor() {
        this.base = [WORK,CARRY,CARRY,MOVE,MOVE];
        this.add = [WORK,CARRY,MOVE];
        this.limit = 5;

        this.name = "Worker";
    }

    spawn(spawner, task) {
        // Get maximum affordable size
        let i = 0;
        let body = this.base;
        let name = this.name + "-" + Game.time;
        for (; i < this.limit; i++) {
            let result = spawner.spawnCreep(body.concat(this.add), name, {dryRun: true});
            if (result != ERR_NOT_ENOUGH_RESOURCES) {
                body = body.concat(this.add)
            } else {
                break;
            }
        }

        let result = spawner.spawnCreep(body, name, {memory: {task: task.compress(), body: this.name}});
        if (result == OK) {
            console.log("Spawning " + name + " size " + i + " for " + task.id + " at " + spawner.room.name + ":" + spawner.name);
            return name;
        }
    }

}

module.exports = Body;