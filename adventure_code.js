const getSiblingsOf = (entity) => {
    return Object.values(parent.entities).filter(e => e.owner === entity.owner);
}

const extremumBy = (extremum) => (pluck, arr) => {
    return arr.reduce(function (best, next) {
        var pair = [pluck(next), next];
        if (!best) {
            return pair;
        } else if (extremum.apply(null, [best[0], pair[0]]) == best[0]) {
            return best;
        } else {
            return pair;
        }
    }, null)[1];
}

const minBy = extremumBy(Math.min);
const maxBy = extremumBy(Math.max);


const gatherParty = () => {
    const allies = getSiblingsOf(character);
    const fattest = maxBy(a => a.max_hp, allies);
    if (character.max_hp > fattest.max_hp) {
        set_message("Inviting");
        for (const ally of allies) {
            if (ally.id !== character.id) {
                send_party_invite(ally.id);
            }
        }
    } else {
        set_message("Accepting invites");
        accept_party_invite(fattest.id);
    }
}

const getParty = () => {
    return character.party ? Object.values(parent.entities).filter(e => e.party === character.party).concat(character) : [character];
}

const getHealTarget = () => {
    const party = getParty();
    const healTarget = minBy(p => p.hp / p.max_hp, party);
    if (healTarget.hp < healTarget.max_hp && can_heal(healTarget)) {
        return healTarget;
    }
    return null;
}

const getPartyInfo = () => {
    const party = getParty();
    const leader = maxBy(a => a.max_hp, party);
    const isLeader = leader.id === character.id;
    return { party, leader, isLeader };
}

const getAttackTarget = () => {
    const monsters = Object
        .values(parent.entities)
        .filter(e => e.type === "monster" && !e.dead && e.visible);
    if (monsters.length === 0)
        return null;
    const { party, leader, isLeader } = getPartyInfo();
    const partyIds = new Set(party.map(p => p.id));
    const attackingMonsters = monsters.filter(m => partyIds.has(m.target));
    return isLeader
        ? minBy(m => parent.distance(character, m), attackingMonsters.length > 0 ? attackingMonsters : monsters)
        : parent.entities[leader.target];
}

var attack_mode = true
var interval = attack_mode && setInterval(function () {
    if (!character.party && getSiblingsOf(character).length > 0) {
        gatherParty();
        return;
    }
    if (character.rip) {
        respawn();
        return;
    }
    const { party, leader, isLeader } = getPartyInfo();
    if (character.hp < 100)
        use('use_hp');
    if (character.mp < character.max_mp - 200)
        use('use_mp');
    loot();

    if (character.rip || is_moving(character)) return;

    var target = getAttackTarget();
    if (target && target.id !== character.target) {
        set_message(target ? "Attacking" : "No target");
        change_target(target);
    }
    const healTarget = getHealTarget();    
    const moveTarget = healTarget || target;
    if (!is_in_range(moveTarget)) {
        xmove(moveTarget.x, moveTarget.y);
    } else if (healTarget) {
        set_message("Healing");
        heal(healTarget);
    } else if (can_attack(target)) {
        set_message(isLeader ? "Attacking" : "Supporting");
        attack(target);
    }
}, 1000 / 4);

