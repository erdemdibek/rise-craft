export const carpentryRecipes = [
    // Seviye 1 (Oak Grubu)
    { id: "oak_timber", name: "Lv1 - Oak Timber (+41 XP)", levelRequired: 1, xpGiven: 41, isChain: false, materials: { oakWood: 3 } },
    { id: "oak_plank", name: "Lv1 - Oak Plank (🔗 Zincir Hesaplama)", levelRequired: 1, xpGiven: 83, isChain: true, parentTimberId: "oak_timber", timberMultiplier: 3 },
    { id: "charcoal_lv1", name: "Lv1 - 2x Charcoal (+31 XP)", levelRequired: 1, xpGiven: 31, isChain: false, materials: { oakTimber: 1 } },

    // Seviye 10 (Pine & Holy Grubu)
    { id: "pine_timber", name: "Lv10 - Pine Timber (+124 XP)", levelRequired: 10, xpGiven: 124, isChain: false, materials: { pineWood: 3 } },
    { id: "pine_plank", name: "Lv10 - Pine Plank (🔗 Zincir Hesaplama)", levelRequired: 10, xpGiven: 249, isChain: true, parentTimberId: "pine_timber", timberMultiplier: 3 },
    { id: "charcoal_lv10", name: "Lv10 - 4x Charcoal (+83 XP)", levelRequired: 10, xpGiven: 83, isChain: false, materials: { pineTimber: 1 } },
    { id: "holy_lumber", name: "Lv10 - Holy Lumber (+9360 XP)", levelRequired: 10, xpGiven: 9360, isChain: false, materials: { holyWood: 5 } }
];

export function calculateCarpentryChain(neededXp, selectedRecipe, allRecipes) {
    const parentTimber = allRecipes.find(r => r.id === selectedRecipe.parentTimberId);
    
    // 1 adet Plank döngüsünün getireceği toplam XP (Plank XP + 3 adet Timber XP)
    const xpPerTimberLoop = parentTimber.xpGiven * selectedRecipe.timberMultiplier;
    const totalLoopXp = selectedRecipe.xpGiven + xpPerTimberLoop;

    const craftCount = Math.ceil(neededXp / totalLoopXp);
    const totalTimberNeeded = craftCount * selectedRecipe.timberMultiplier;
    
    // Ham odun çarpanı (Her timber için 3 adet wood gerekiyor)
    const totalWoodNeeded = totalTimberNeeded * 3; // <-- Doğru tanım
    
    const isOak = selectedRecipe.id === "oak_plank";
    const woodName = isOak ? "Oak Wood" : "Pine Wood";
    const timberName = isOak ? "Oak Timber" : "Pine Timber";
    const plankName = isOak ? "Oak Plank" : "Pine Plank";

    return `
        <div class="text-white font-bold border-b border-gray-950 pb-1.5 mb-2 text-center text-[10px] tracking-wider text-amber-500 uppercase">🪓 Marangozluk Zincir Hattı</div>
        <div class="mb-2">🎯 Hedefe Kalan Net XP: <span class="text-white font-bold">${neededXp.toLocaleString()} XP</span></div>
        <div class="p-2.5 bg-black/50 rounded-xl border border-gray-950 my-2 space-y-1 text-gray-300">
            <div class="text-white font-bold text-[10px] uppercase text-amber-400 tracking-wider">🔥 Kazanılacak Gizli XP Özetleri:</div>
            <div>• <span class="text-white font-black">${craftCount.toLocaleString()}</span> ${plankName} Üretiminden: <span class="text-emerald-400 font-bold">+${(craftCount * selectedRecipe.xpGiven).toLocaleString()} XP</span></div>
            <div>• <span class="text-white font-black">${totalTimberNeeded.toLocaleString()}</span> Ara Kereste Üretiminden: <span class="text-emerald-400 font-bold">+${(totalTimberNeeded * parentTimber.xpGiven).toLocaleString()} XP</span></div>
        </div>
        <div class="space-y-1 text-xs text-gray-400 pt-1">
            <div class="flex justify-between border-b border-gray-900/40 pb-1"><span>🪵 Üretilecek Son Ürün:</span> <span class="font-bold text-white">${craftCount.toLocaleString()} Adet</span></div>
            <div class="flex justify-between border-b border-gray-900/40 pb-1 text-amber-500/80"><span>🪵 Hazırlanacak Ara Ürün (${timberName}):</span> <span class="font-bold text-white">${totalTimberNeeded.toLocaleString()} Adet</span></div>
            <div class="flex justify-between text-orange-300"><span>🌲 Gerekli Ham Tomruk (${woodName}):</span> <span class="font-bold text-emerald-400">${totalWoodNeeded.toLocaleString()} Adet</span></div>
        </div>
    `; // <-- woodNeeded yerine totalWoodNeeded olarak düzeltildi!
}
