const getSiblingsOf = (entity) => {
    return Object.values(parent.entities).filter(e => e.owner === entity.owner);
}

const extremumBy = (extremum) => (pluck, arr) => {
    return arr.length ? arr.reduce(function (best, next) {
        var pair = [pluck(next), next];
        if (!best) {
            return pair;
        } else if (extremum.apply(null, [best[0], pair[0]]) == best[0]) {
            return best;
        } else {
            return pair;
        }
    }, null)[1] : null;
}

function on_party_invite(name) {
    if (getSiblingsOf(character).some(s => s.id === name)) {
        accept_party_invite(name)
    } else {
        log(`declining invite from ${name}`);
    }
}

function on_party_request(name) {
    if (getSiblingsOf(character).some(s => s.id === name)) {
        accept_party_request(name)
    } else {
        log(`declining request from ${name}`);
    }
}

function on_combined_damage() {
    if (!getPartyInfo().isLeader) {
        move(character.real_x+5, character.real_y);        
    }
}

const minBy = extremumBy(Math.min);
const maxBy = extremumBy(Math.max);

const gatherParty = () => {
    if (character.party)
        return;
    const allies = getSiblingsOf(character);
    if (allies.length === 0) {
        log("no allies found");
        return;
    }
    for (const ally of allies) {
        if (!ally.party) {
            set_message("Inviting");
            send_party_invite(ally.id);
        } else {
            send_party_request(ally.id);
        }
    }
}

const getParty = () => {
    return character.party
        ? Object.values(parent.entities).filter(e => e.party === character.party).concat(character)
        : [character];
}

const getHealTarget = () => {
    const party = getParty();
    const healTarget = minBy(p => p.hp / p.max_hp, party);
    if (healTarget.hp < healTarget.max_hp && can_heal(healTarget) && character.ctype === "priest") {
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

const nullIfEmpty = arr => arr.length === 0 ? null : arr;

const getAttackTarget = () => {
    const monsters = Object
        .values(parent.entities)
        .filter(e => e.type === "monster" && !e.dead && e.visible);
    if (monsters.length === 0)
        return null;
    const { party, leader, isLeader } = getPartyInfo();
    const partyIds = new Set(party.map(p => p.id));
    const attackingMonsters = monsters.filter(m => partyIds.has(m.target));
    const safeMonsters = monsters
		.filter(m => m.attack < config.maxDmg && (m.evasion || 0) < config.maxEvasion);
    return isLeader
        ? minBy(m => parent.distance(character, m), nullIfEmpty(attackingMonsters) || safeMonsters)
        : parent.entities[leader.target];
}

const config = {
    maxDmg: 120,
	maxEvasion: 90,
};

function act() {
    gatherParty();
    loot();
    const { party, leader, isLeader } = getPartyInfo();
    if (character.rip) {
        respawn();
    } else if (party.length < 3) {
        set_message("Gathering");
    } else {
        if (character.hp < character.max_hp - 1000) {
            use('use_hp');
        }
        if (character.mp < character.max_mp - 200) {
            use('use_mp');
        }
        var target = getAttackTarget();
        if (target && target.id !== character.target) {
            change_target(target);
        }
        const healTarget = getHealTarget();
        const moveTarget = healTarget || target || leader;
        if (moveTarget && !is_in_range(moveTarget)) {
            set_message("Moving");
            move(moveTarget.x, moveTarget.y);
        } else if (healTarget && is_in_range(healTarget)) {
            set_message("Healing");
            heal(healTarget);
        } else if (can_attack(target)) {
            set_message(isLeader ? "Attacking" : "Supporting");
            attack(target);
        } else {
            set_message("Idle");
        }
    }
    setTimeout(act, 300)
}
act()

