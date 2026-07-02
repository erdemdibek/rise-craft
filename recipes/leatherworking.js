export const leatherworkingRecipes = [
    // Seviye 1 Reçeteleri
    { 
        id: "raw_leather_zebra", 
        name: "Lv1 - Raw Leather (Zebra) (+1092 XP)", 
        levelRequired: 1, 
        xpGiven: 1092, 
        isChain: false, 
        materials: { zebraHide: 3 } 
    },
    { 
        id: "tanned_leather_zebra", 
        name: "Lv1 - Tanned Leather (Zebra) (+2184 XP)", 
        levelRequired: 1, 
        xpGiven: 2184, 
        isChain: false, 
        materials: { rawLeatherZebra: 3 } 
    },
    { 
        id: "raw_leather_stag", 
        name: "Lv1 - Raw Leather (Stag) (+312 XP)", 
        levelRequired: 1, 
        xpGiven: 312, 
        isChain: false, 
        materials: { stagHide: 3 } 
    },
    { 
        id: "tanned_leather_stag", 
        name: "Lv1 - Tanned Leather (Stag) (+624 XP)", 
        levelRequired: 1, 
        xpGiven: 624, 
        isChain: false, 
        materials: { rawLeatherStag: 3 } 
    },

    // Seviye 10 Reçeteleri
    { 
        id: "raw_leather_boar", 
        name: "Lv10 - Raw Leather (Boar) (+468 XP)", 
        levelRequired: 10, 
        xpGiven: 468, 
        isChain: false, 
        materials: { boarHide: 3 } 
    },
    { 
        id: "raw_leather_wolf", 
        name: "Lv10 - Raw Leather (Wolf) (+1664 XP)", 
        levelRequired: 10, 
        xpGiven: 1664, 
        isChain: false, 
        materials: { wolfHide: 3 } 
    },
    { 
        id: "tanned_leather_boar", 
        name: "Lv10 - Tanned Leather (Boar) (+9360 XP)", // Not: 936 XP yazılmış, oyun dinamiğine göre (Boar Raw * 2) veya senin verdiğin 936 değerine sabitlendi.
        levelRequired: 10, 
        xpGiven: 936, 
        isChain: false, 
        materials: { rawLeatherBoar: 3 } 
    },
    { 
        id: "tanned_leather_wolf", 
        name: "Lv10 - Tanned Leather (Wolf) (+3328 XP)", 
        levelRequired: 10, 
        xpGiven: 3328, 
        isChain: false, 
        materials: { rawLeatherWolf: 3 } 
    },
    { 
        id: "mage_rogue_priest_plate_item", 
        name: "Lv10 - Mage/Rogue/Priest Plate Gauntlets & Boots (+2600 XP)", 
        levelRequired: 10, 
        xpGiven: 2600, 
        isChain: false, 
        materials: { tannedLeatherStag: 4, copperPlate: 2, ironPlate: 1, rareArmorShard: 1 } 
    },
    { 
        id: "warrior_plate_item", 
        name: "Lv10 - Warrior Plate Gauntlets & Boots (+2600 XP)", 
        levelRequired: 10, 
        xpGiven: 2600, 
        isChain: false, 
        materials: { tannedLeatherStag: 4, tannedLeatherBoar: 1, copperPlate: 2, ironPlate: 1, rareArmorShard: 1 } 
    }
];
