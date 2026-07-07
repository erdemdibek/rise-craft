export const blacksmithingRecipes = [
    // Seviye 1 Reçeteleri
    { 
        id: "copper_plate", 
        name: "Copper Plate", 
        levelRequired: 1, 
        xpGiven: 41, 
        isIntermediate: true, // Ara ürün, Stick yapımında veya pazarda satılabilir
        materials: { 
            copper_ore: 3, 
            charcoal: 3 
        } 
    },
    { 
        id: "copper_stick", 
        name: "Copper Stick", 
        levelRequired: 1, 
        xpGiven: 83, 
        isIntermediate: false, 
        materials: { 
            copper_plate: 3 // Doğrudan üstteki ara ürünü girdi olarak alıyor
        } 
    },

    // Seviye 10 Reçeteleri
    { 
        id: "iron_plate", 
        name: "Iron Plate", 
        levelRequired: 10, 
        xpGiven: 124, 
        isIntermediate: true, 
        materials: { 
            iron_ore: 3, 
            charcoal: 3 
        } 
    },
    { 
        id: "iron_stick", 
        name: "Iron Stick", 
        levelRequired: 10, 
        xpGiven: 249, 
        isIntermediate: false, 
        materials: { 
            iron_plate: 3 // Üstteki ara ürüne bağlı zincir
        } 
    },
    { 
        id: "iron_bar", 
        name: "Iron Bar", 
        levelRequired: 10, 
        xpGiven: 208, 
        isIntermediate: true, // Armor Smithing ve Weapon Smithing'de kullanılacak kritik bar!
        materials: { 
            iron_ore: 5, 
            charcoal: 5 
        } 
    },
    { 
        id: "silver", 
        name: "Silver", 
        levelRequired: 10, 
        xpGiven: 12480, 
        isIntermediate: false, 
        materials: { 
            silver_dust: 5, 
            charcoal: 1 
        } 
    }
];
