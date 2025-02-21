## TODO

- Performance
    - Look into switching to raw memory, compressing repeated keys
    - Automatically decrease metrics & tasking frequency? Base on bucket usage?
- Calculate replacement time from distance to nearest spawn
    - Store creep's spawn and calculate current linear distance?
- Metrics on survey
- Metrics on last sighted (including in game map), add other events?
- Spawn reserves/failsafe procotols
    - Some system should already be in to spawn haulers w/ work part if no other creeps
    - Maintain a reserve, determine when it should be used (ex. no more spawn energy + trying to spawn an energy stocker?)
    - can have tasks flag if they are allowed to eat reserve, and/or create specific boot-up task? (could double as pioneers and reuse logic for new/underdeveloped rooms, specialize in 0 to 1)
- Often dramatic difference in energy change & transfers, probably to do with counters being slightly off, look in to
- Creep behaviors
    - Consider/test GTFOTR again
    - Combat stance (aggressive, neutral, avoid?), add to room cost function
    - Room traversing (already in)
- Diplomacy (integrate w/ behaviors)
    - Player stance (ally, neutral, enemy?)
    - Ignore neutrals in neutral territory, engage in owned
    - Always engage enemies
    - Ignore allies in all territory
    - Switch neutral to enemy if attacked (consider territory?)
    - Switch ally to enemy if attacked a sufficient amount (probably using a moving average) (consider territory?)
    - Configurable no scouting of allies? Would be nice to set
    - Per-room overrides? Ex some rooms always treat everyone/someones hostiles, etc.

## Scouting notes
- CPU when searching ~30 range from 1 spawn: ~1, total usage ~10%
- Modify current method to just cache results

## Logistics notes
- All logistically-relevant creeps have a primary purpose, they perform logistics in whatever fashion most quickly serves that purpose
- For most creeps, this is "i need resource x now" or (ex miners) "i need room to dump x resource now"
- Stock is more complicated bc it tries to balance out resources, and it's current focus is ~50% split between sourcing and depoing
- Modify findSrc/Dst to search by rooms, grabbing first w/ avail resource or avail space, moving there, then running like normal
    - Would be really killer if could combine possible srcs/dsts from all adjacent rooms and search like that
- Modify bestSrc/Dst to search by room, grabbing by highest % filled w/ resource or lowest % filled (depending on search)?
    - this sounds complicated and possibly not ideal, need to rethink
- Add ability for all src/dsts methods to interact w/ haulers, especially those on flags
- Flag changes, keep as separate task but match appearance of stock (use flagname as tgt)
    - Recognize if no container, then be the container
    - If container, assign as log of amount filled (if flag empty) or amount missing (if flag resource)
    - This is diff from stock, it has a primary task and uses the findSrc/Dst for fastest fulfillment
    - Flags can be basis for auto building
        - eventually a container should be placed there (see above behavior for assigned creep(s))
        - eventually roads mapped from there
        - spawn/storage positions picked to minimize total distance between all logi flags?
    - Since I'll have tasks dedicated to flags, I shouldn't need to give them special treatment in bestSrc/Dst
        - This means tash should have a higher priority which would be good

## Scouting notes
- CPU when searching ~30 range from 1 spawn: ~1

## Flags

- Grey-Grey: Graveyard, place for unassigned creeps to gather out of the way
- Purple-Purple: Claim/reserve controller in room
- Blue-Blue: Persistent scouting
- White-###: Logistics
    - -Grey: Drain
    - -Yellow: Energy