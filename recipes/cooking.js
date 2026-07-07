export const cookingRecipes = [
    // Seviye 1 Reçeteleri
    { 
        id: "butter", 
        name: "Butter", 
        levelRequired: 1, 
        xpGiven: 10, 
        isIntermediate: true, // İleride üst seviye yemeklerde kullanılmak üzere ara ürün
        materials: { 
            milk: 2 // Varsayılan ham madde girdi yapısı
        } 
    },
    { 
        id: "roasted_corn", 
        name: "Roasted Corn", 
        levelRequired: 1, 
        xpGiven: 52, 
        isIntermediate: false, 
        materials: { 
            corn: 1,
            salt: 1
        } 
    },
    { 
        id: "roasted_potato", 
        name: "Roasted Potato", 
        levelRequired: 1, 
        xpGiven: 52, 
        isIntermediate: false, 
        materials: { 
            potato: 1,
            butter: 1 // İşte gizli zincir! Üstteki tereyağını isteyebilir
        } 
    },

    // Seviye 4 Reçeteleri
    { 
        id: "carrot_soup", 
        name: "Carrot Soup", 
        levelRequired: 4, 
        xpGiven: 124, 
        isIntermediate: false, 
        materials: { 
            carrot: 2,
            water: 1,
            salt: 1
        } 
    },
    { 
        id: "omlette", 
        name: "Omlette", 
        levelRequired: 4, 
        xpGiven: 124, 
        isIntermediate: false, 
        materials: { 
            egg: 2,
            butter: 1
        } 
    },
    { 
        id: "tomato_soup", 
        name: "Tomato Soup", 
        levelRequired: 4, 
        xpGiven: 124, 
        isIntermediate: false, 
        materials: { 
            tomato: 2,
            water: 1,
            milk: 1
        } 
    }
];
