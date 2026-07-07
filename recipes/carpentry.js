export const carpentryRecipes = [
    // Seviye 1 (Oak Grubu)
    { 
        id: "oak_timber", 
        name: "Oak Timber", 
        levelRequired: 1, 
        xpGiven: 41, 
        isIntermediate: true, // Ara ürün; Plank, Charcoal yapımında veya pazarda kullanılır
        materials: { 
            oak_wood: 3 
        } 
    },
    { 
        id: "oak_plank", 
        name: "Oak Plank", 
        levelRequired: 1, 
        xpGiven: 83, 
        isIntermediate: true, // İleride Weapon Smithing gibi mesleklerde kullanılabilir
        materials: { 
            oak_timber: 3 
        } 
    },
    { 
        id: "charcoal_lv1", 
        name: "Charcoal (Lv1 - 2x)", 
        levelRequired: 1, 
        xpGiven: 31, 
        isIntermediate: true, // Blacksmithing'in ana yakıtı!
        materials: { 
            oak_timber: 1 
        } 
    },

    // Seviye 10 (Pine & Holy Grubu)
    { 
        id: "pine_timber", 
        name: "Pine Timber", 
        levelRequired: 10, 
        xpGiven: 124, 
        isIntermediate: true, 
        materials: { 
            pine_wood: 3 
        } 
    },
    { 
        id: "pine_plank", 
        name: "Pine Plank", 
        levelRequired: 10, 
        xpGiven: 249, 
        isIntermediate: false, 
        materials: { 
            pine_timber: 3 
        } 
    },
    { 
        id: "charcoal_lv10", 
        name: "Charcoal (Lv10 - 4x)", 
        levelRequired: 10, 
        xpGiven: 83, 
        isIntermediate: true, 
        materials: { 
            pine_timber: 1 
        } 
    },
    { 
        id: "holy_lumber", 
        name: "Holy Lumber", 
        levelRequired: 10, 
        xpGiven: 9360, 
        isIntermediate: false, 
        materials: { 
            holy_wood: 5 
        } 
    }
];
