export const stonemasonryRecipes = [
    // Seviye 1 Reçeteleri
    { 
        id: "stone_block", 
        name: "Stone Block", 
        levelRequired: 1, 
        xpGiven: 260, 
        isIntermediate: true, // Jewel Crafting'de (Rare Obsidian) kullanıldığı için true!
        materials: { 
            rough_stone: 5 
        } 
    },

    // Seviye 20 Reçeteleri
    { 
        id: "marble_block", 
        name: "Marble Block", 
        levelRequired: 20, 
        xpGiven: 1560, 
        isIntermediate: false, 
        materials: { 
            marble: 5 
        } 
    },

    // Seviye 30 Reçeteleri
    { 
        id: "granite_block", 
        name: "Granite Block", 
        levelRequired: 30, 
        xpGiven: 7800, 
        isIntermediate: false, 
        materials: { 
            granite: 5 
        } 
    }
];
