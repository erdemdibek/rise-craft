export const leatherworkingRecipes = [
    // Seviye 1 Reçeteleri
    { id: "raw_leather_zebra", name: "Lv1 - Raw Leather (Zebra) (+1092 XP)", levelRequired: 1, xpGiven: 1092, isChain: false, materials: { zebraHide: 3 } },
    { id: "tanned_leather_zebra", name: "Lv1 - Tanned Leather (Zebra) (🔗 Zincir)", levelRequired: 1, xpGiven: 2184, isChain: true, parentRawId: "raw_leather_zebra", rawMultiplier: 3 },
    
    { id: "raw_leather_stag", name: "Lv1 - Raw Leather (Stag) (+312 XP)", levelRequired: 1, xpGiven: 312, isChain: false, materials: { stagHide: 3 } },
    { id: "tanned_leather_stag", name: "Lv1 - Tanned Leather (Stag) (🔗 Zincir)", levelRequired: 1, xpGiven: 624, isChain: true, parentRawId: "raw_leather_stag", rawMultiplier: 3 },

    // Seviye 10 Reçeteleri
    { id: "raw_leather_boar", name: "Lv10 - Raw Leather (Boar) (+468 XP)", levelRequired: 10, xpGiven: 468, isChain: false, materials: { boarHide: 3 } },
    { id: "tanned_leather_boar", name: "Lv10 - Tanned Leather (Boar) (🔗 Zincir)", levelRequired: 10, xpGiven: 936, isChain: true, parentRawId: "raw_leather_boar", rawMultiplier: 3 },
    
    { id: "raw_leather_wolf", name: "Lv10 - Raw Leather (Wolf) (+1664 XP)", levelRequired: 10, xpGiven: 1664, isChain: false, materials: { wolfHide: 3 } },
    { id: "tanned_leather_wolf", name: "Lv10 - Tanned Leather (Wolf) (🔗 Zincir)", levelRequired: 10, xpGiven: 3328, isChain: true, parentRawId: "raw_leather_wolf", rawMultiplier: 3 },

    // Zırhlar
    { id: "mage_rogue_priest_plate_item", name: "Lv10 - Mage/Rogue/Priest Plate Gauntlets & Boots (+2600 XP)", levelRequired: 10, xpGiven: 2600, isChain: false, materials: { tannedLeatherStag: 4, copperPlate: 2, ironPlate: 1, rareArmorShard: 1 } },
    { id: "warrior_plate_item", name: "Lv10 - Warrior Plate Gauntlets & Boots (+2600 XP)", levelRequired: 10, xpGiven: 2600, isChain: false, materials: { tannedLeatherStag: 4, tannedLeatherBoar: 1, copperPlate: 2, ironPlate: 1, rareArmorShard: 1 } }
];

// Zincir Hesaplama Fonksiyonu
export function calculateLeatherworkingChain(neededXp, selectedRecipe, allRecipes) {
    const parentRaw = allRecipes.find(r => r.id === selectedRecipe.parentRawId) || { xpGiven: 0 };
    
    // 1 adet Tanned Leather döngüsünün getireceği toplam XP (Tanned XP + 3 adet Raw XP)
    const xpPerRawLoop = parentRaw.xpGiven * selectedRecipe.rawMultiplier;
    const totalLoopXp = selectedRecipe.xpGiven + xpPerRawLoop;

    const craftCount = Math.ceil(neededXp / totalLoopXp);
    const totalRawNeeded = craftCount * selectedRecipe.rawMultiplier;
    const totalHideNeeded = totalRawNeeded * 3; // Her raw leather için 3 hide gidiyor
    
    // Dinamik isim yakalama
    const animalType = selectedRecipe.id.split('_')[2]; // zebra, stag, boar, wolf
    const capitalizedAnimal = animalType.charAt(0).toUpperCase() + animalType.slice(1);

    return `
        <div class="text-white font-bold border-b border-gray-950 pb-1.5 mb-2 text-center text-[10px] tracking-wider text-amber-500 uppercase">🧳 Dericilik Zincir Hattı</div>
        <div class="mb-2">🎯 Hedefe Kalan Net XP: <span class="text-white font-bold">${neededXp.toLocaleString()} XP</span></div>
        <div class="p-2.5 bg-black/50 rounded-xl border border-gray-950 my-2 space-y-1 text-gray-300">
            <div class="text-white font-bold text-[10px] uppercase text-amber-400 tracking-wider">🔥 Kazanılacak Gizli XP Özetleri:</div>
            <div>• <span class="text-white font-black">${craftCount.toLocaleString()}</span> Tanned Leather (${capitalizedAnimal}) : <span class="text-emerald-400 font-bold">+${(craftCount * selectedRecipe.xpGiven).toLocaleString()} XP</span></div>
            <div>• <span class="text-white font-black">${totalRawNeeded.toLocaleString()}</span> Raw Leather (${capitalizedAnimal}) : <span class="text-emerald-400 font-bold">+${(totalRawNeeded * parentRaw.xpGiven).toLocaleString()} XP</span></div>
        </div>
        <div class="space-y-1 text-xs text-gray-400 pt-1">
            <div class="flex justify-between border-b border-gray-900/40 pb-1"><span>📦 İşlenmiş Son Ürün (Tanned):</span> <span class="font-bold text-white">${craftCount.toLocaleString()} Adet</span></div>
            <div class="flex justify-between border-b border-gray-900/40 pb-1 text-amber-500/80"><span>📦 Hazırlanacak Ara Ürün (Raw):</span> <span class="font-bold text-white">${totalRawNeeded.toLocaleString()} Adet</span></div>
            <div class="flex justify-between text-orange-300"><span>🦁 Gerekli Ham Hayvan Derisi (${capitalizedAnimal} Hide):</span> <span class="font-bold text-emerald-400">${totalHideNeeded.toLocaleString()} Adet</span></div>
        </div>
    `;
}
