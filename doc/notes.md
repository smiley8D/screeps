## TODO

- Improve caching/src & dst finding
    - Use a clear and consistent approach to caching/cleaning cache for srcs and dsts
    - Consider a Task.assign method to blast away cache on first assignment, including target room
- Logistics
    - See above on improved caching, hopefully would offer improved performance
    - Multi-room logistics
        - Allow findSrc & findDst to search nearby rooms? Probably just look at storage.
        - Automated room resupply? Would it even be needed if above point is added?
    - Flag-based approach still seems ideal, easily to manually control and add automation later
- Tasking
    - Investigate viability of current tasking system (especially logistics)
        - Performance hit of constant rerouting/assignment
        - Is there meat here that isn't needed? Should this be that dynamic? (it does add flexibility and resilience, but also offset by complexity)
        - Consider fixed paths intead? Possibly build roads along them automatically?
- Automated building
- Memory usage is a problem and not sustainable
    - Look into switching to raw memory, compressing repeated keys
    - VERY HIGH PRIORITY, this is currently eating ~7 CPU / tick
- Calculate replacement time from distance to nearest spawn
- Check if creep could up replaced w/ larger size

## Flags

- Grey-Grey: Graveyard, place for unassigned creeps to gather out of the way
- Purple-Purple: Claim/reserve controller in room
- Blue-Blue: Persistent scouting
- White-###: Logistics
    - -Grey: Drain
    - -Yellow: Energy