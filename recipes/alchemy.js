export const alchemyRecipes = [
    // Seviye 1 Reçeteleri
    { 
        id: "small_mp_recovery_mana_potion", 
        name: "Lv1 - Small MP Recovery / Mana Potion (+390 XP)", 
        levelRequired: 1, 
        xpGiven: 390, 
        isChain: false, 
        materials: { holyWater: 1, wormwood: 3 } 
    },
    { 
        id: "small_health_potion", 
        name: "Lv1 - Small Health Potion (+390 XP)", 
        levelRequired: 1, 
        xpGiven: 390, 
        isChain: false, 
        materials: { holyWater: 3, roseship: 1 } 
    },

    // Seviye 4 Reçeteleri
    { 
        id: "small_hp_recovery_potion", 
        name: "Lv4 - Small HP Recovery Potion (+390 XP)", 
        levelRequired: 4, 
        xpGiven: 390, 
        isChain: false, 
        materials: { holyWater: 1, roseship: 3 } 
    },
    { 
        id: "small_rejuvenation_potion", 
        name: "Lv4 - Small Rejuvenation Potion (+624 XP)", 
        levelRequired: 4, 
        xpGiven: 624, 
        isChain: false, 
        materials: { ariusBlessing: 1, roseship: 2, wormwood: 2 } 
    },

    // Seviye 8 Reçeteleri
    { 
        id: "medium_hp_recovery_health_potion", 
        name: "Lv8 - Medium HP Recovery / Health Potion (+1300 XP)", 
        levelRequired: 8, 
        xpGiven: 1300, 
        isChain: false, 
        materials: { holyWater: 1, roseship: 2, rosePetals: 1 } 
    },
    { 
        id: "medium_mp_recovery_mana_potion", 
        name: "Lv8 - Medium MP Recovery / Mana Potion (+1300 XP)", 
        levelRequired: 8, 
        xpGiven: 1300, 
        isChain: false, 
        materials: { holyWater: 1, wormwood: 2, dill: 1 } 
    }
];
