export const leatherworkingRecipes = [
    // Seviye 1 Reçeteleri
    { 
        id: "raw_leather_zebra", 
        name: "Raw Leather (Zebra)", 
        levelRequired: 1, 
        xpGiven: 1092, 
        isIntermediate: true, // Ara ürün
        materials: { 
            zebra_hide: 3 
        } 
    },
    { 
        id: "tanned_leather_zebra", 
        name: "Tanned Leather (Zebra)", 
        levelRequired: 1, 
        xpGiven: 2184, 
        isIntermediate: false, 
        materials: { 
            raw_leather_zebra: 3 
        } 
    },
    { 
        id: "raw_leather_stag", 
        name: "Raw Leather (Stag)", 
        levelRequired: 1, 
        xpGiven: 312, 
        isIntermediate: true, 
        materials: { 
            stag_hide: 3 
        } 
    },
    { 
        id: "tanned_leather_stag", 
        name: "Tanned Leather (Stag)", 
        levelRequired: 1, 
        xpGiven: 624, 
        isIntermediate: true, // Zırh üretimlerinde kullanılacağı için true!
        materials: { 
            raw_leather_stag: 3 
        } 
    },

    // Seviye 10 Reçeteleri
    { 
        id: "raw_leather_boar", 
        name: "Raw Leather (Boar)", 
        levelRequired: 10, 
        xpGiven: 468, 
        isIntermediate: true, 
        materials: { 
            boar_hide: 3 
        } 
    },
    { 
        id: "tanned_leather_boar", 
        name: "Tanned Leather (Boar)", 
        levelRequired: 10, 
        xpGiven: 936, 
        isIntermediate: true, // Warrior zırhında kullanılacağı için true!
        materials: { 
            raw_leather_boar: 3 
        } 
    },
    { 
        id: "raw_leather_wolf", 
        name: "Raw Leather (Wolf)", 
        levelRequired: 10, 
        xpGiven: 1664, 
        isIntermediate: true, 
        materials: { 
            wolf_hide: 3 
        } 
    },
    { 
        id: "tanned_leather_wolf", 
        name: "Tanned Leather (Wolf)", 
        levelRequired: 10, 
        xpGiven: 3328, 
        isIntermediate: false, 
        materials: { 
            raw_leather_wolf: 3 
        } 
    },

    // Zırhlar (Çapraz Bağlantılı Üst Ürünler)
    { 
        id: "mage_rogue_priest_plate_item", 
        name: "Mage/Rogue/Priest Plate Gauntlets & Boots", 
        levelRequired: 10, 
        xpGiven: 2600, 
        isIntermediate: false, 
        materials: { 
            tanned_leather_stag: 4, 
            copper_plate: 2,   // Blacksmithing'den gelecek!
            iron_plate: 1,     // Blacksmithing'den gelecek!
            rare_armor_shard: 1 
        } 
    },
    { 
        id: "warrior_plate_item", 
        name: "Warrior Plate Gauntlets & Boots", 
        levelRequired: 10, 
        xpGiven: 2600, 
        isIntermediate: false, 
        materials: { 
            tanned_leather_stag: 4, 
            tanned_leather_boar: 1, 
            copper_plate: 2,   // Blacksmithing'den gelecek!
            iron_plate: 1,     // Blacksmithing'den gelecek!
            rare_armor_shard: 1 
        } 
    }
];
