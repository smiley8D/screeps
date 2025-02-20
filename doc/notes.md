## TODO

- Improve caching/src & dst finding
    - Use a clear and consistent approach to caching/cleaning cache for srcs and dsts
    - Consider a Task.assign method to blast away cache on first assignment, including target room
- Logistics
    - See above on improved caching, hopefully would offer improved performance
    - Multi-room logistics
        - Allow findSrc & findDst to search nearby rooms? Probably just look at storage.
        - Automated room resupply? Would it even be needed if above point is added?
- Tasking
    - Investigate viability of current tasking system (especially logistics)
        - Performance hit of constant rerouting/assignment
        - Is there meat here that isn't needed? Should this be that dynamic? (it does add flexibility and resilience, but also offset by complexity)
        - Consider fixed paths intead? Possibly build roads along them automatically?
- Automated building
- Memory usage is a problem and not sustainable