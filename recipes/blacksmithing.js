export const blacksmithingRecipes = [
    { id: "copper_plate", name: "Lv1 - Copper Plate (+41 XP)", levelRequired: 1, xpGiven: 41, isChain: false, materials: { copperOre: 3, charcoal: 3 } },
    { id: "copper_stick", name: "Lv1 - Copper Stick (🔗 Zincir)", levelRequired: 1, xpGiven: 83, isChain: true, parentPlateId: "copper_plate", plateMultiplier: 3 },
    { id: "iron_plate", name: "Lv10 - Iron Plate (+124 XP)", levelRequired: 10, xpGiven: 124, isChain: false, materials: { ironOre: 3, charcoal: 3 } },
    { id: "iron_stick", name: "Lv10 - Iron Stick (🔗 Zincir)", levelRequired: 10, xpGiven: 249, isChain: true, parentPlateId: "iron_plate", plateMultiplier: 3 },
    { id: "iron_bar", name: "Lv10 - Iron Bar (+208 XP)", levelRequired: 10, xpGiven: 208, isChain: false, materials: { ironOre: 5, charcoal: 5 } },
    { id: "silver", name: "Lv10 - Silver (+12480 XP)", levelRequired: 10, xpGiven: 12480, isChain: false, materials: { silverDust: 5, charcoal: 1 } }
];

export function calculateBlacksmithingChain(neededXp, selectedRecipe, allRecipes) {
    const parentPlate = allRecipes.find(r => r.id === selectedRecipe.parentPlateId);
    const xpPerPlateLoop = parentPlate.xpGiven * selectedRecipe.plateMultiplier;
    const totalLoopXp = selectedRecipe.xpGiven + xpPerPlateLoop;

    const craftCount = Math.ceil(neededXp / totalLoopXp);
    const totalPlatesNeeded = craftCount * selectedRecipe.plateMultiplier;
    
    const totalOre = totalPlatesNeeded * parentPlate.materials[Object.keys(parentPlate.materials)[0]];
    const totalCharcoal = totalPlatesNeeded * parentPlate.materials.charcoal;
    const oreName = selectedRecipe.id === "copper_stick" ? "Copper Ore" : "Iron Ore";
    const plateName = selectedRecipe.id === "copper_stick" ? "Copper Plate" : "Iron Plate";

    return `
        <div class="text-white font-bold border-b border-gray-950 pb-1.5 mb-2 text-center text-[10px] tracking-wider text-amber-500 uppercase">🔗 Zincirleme Üretim Hattı</div>
        <div class="mb-2">🎯 Hedefe Kalan Net XP: <span class="text-white font-bold">${neededXp.toLocaleString()} XP</span></div>
        <div class="p-2.5 bg-black/50 rounded-xl border border-gray-950 my-2 space-y-1 text-gray-300">
            <div class="text-white font-bold text-[10px] uppercase text-amber-400 tracking-wider">🔥 Kazanılacak Gizli XP Özetleri:</div>
            <div>• <span class="text-white font-black">${craftCount.toLocaleString()}</span> Stick Üretiminden: <span class="text-emerald-400 font-bold">+${(craftCount * selectedRecipe.xpGiven).toLocaleString()} XP</span></div>
            <div>• <span class="text-white font-black">${totalPlatesNeeded.toLocaleString()}</span> Ara Plaka Üretiminden: <span class="text-emerald-400 font-bold">+${(totalPlatesNeeded * parentPlate.xpGiven).toLocaleString()} XP</span></div>
        </div>
        <div class="space-y-1 text-xs text-gray-400 pt-1">
            <div class="flex justify-between border-b border-gray-900/40 pb-1"><span>🔨 Üretilecek Son Ürün:</span> <span class="font-bold text-white">${craftCount.toLocaleString()} Adet</span></div>
            <div class="flex justify-between border-b border-gray-900/40 pb-1 text-amber-500/80"><span>🪙 Hazırlanacak Ara Ürün (${plateName}):</span> <span class="font-bold text-white">${totalPlatesNeeded.toLocaleString()} Adet</span></div>
            <div class="flex justify-between border-b border-gray-900/40 pb-1 text-orange-300"><span>🪨 Gerekli Ham Maden (${oreName}):</span> <span class="font-bold text-emerald-400">${totalOre.toLocaleString()} Adet</span></div>
            <div class="flex justify-between text-gray-400"><span>🪵 Gerekli Toplam Charcoal:</span> <span class="font-bold text-emerald-400">${totalCharcoal.toLocaleString()} Adet</span></div>
        </div>`;
}
