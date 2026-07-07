export const tailoringRecipes = [
    // Seviye 1 Reçeteleri (Dikey Pamuk Zinciri)
    { 
        id: "cotton_process", 
        name: "Cotton (İşleme)", 
        levelRequired: 1, 
        xpGiven: 52, 
        isIntermediate: true, 
        materials: { 
            raw_cotton: 3 // 1 işleme için 3 ham pamuk (eski fonksiyondaki 3'lü çarpan zinciri baz alındı)
        } 
    },
    { 
        id: "cotton_yarn", 
        name: "Cotton Yarn", 
        levelRequired: 1, 
        xpGiven: 104, 
        isIntermediate: true, 
        materials: { 
            cotton_process: 3 
        } 
    },
    { 
        id: "fabric", 
        name: "Fabric", 
        levelRequired: 1, 
        xpGiven: 208, 
        isIntermediate: true, // Zırh üretimlerinde kullanılacağı için true
        materials: { 
            cotton_yarn: 3 
        } 
    },

    // Seviye 4 Reçeteleri (Çapraz Bağlantılı Üst Ürün)
    { 
        id: "lvl4_boots_gloves", 
        name: "Leather Boots / Gloves", 
        levelRequired: 4, 
        xpGiven: 1300, 
        isIntermediate: false, 
        materials: { 
            fabric: 2,               // Üstteki pamuk zincirine bağlanır
            tanned_leather_stag: 2   // Leatherworking mesleğine bağlanır!
        } 
    }
];
