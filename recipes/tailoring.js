export const tailoringRecipes = [
    { id: "cotton_process", name: "Cotton (İşleme)", levelRequired: 1, xpGiven: 52, isChain: false },
    { id: "cotton_yarn", name: "Cotton Yarn", levelRequired: 1, xpGiven: 104, isChain: false },
    { id: "fabric", name: "Fabric", levelRequired: 1, xpGiven: 208, isChain: false },
    { id: "lvl4_boots_gloves", name: "Lv4 - Leather Boots / Gloves (+1300 XP)", levelRequired: 4, xpGiven: 1300, isChain: true, fabricNeed: 2, stagNeed: 2, boarNeed: 0, tigerNeed: 0, copperNeed: 0 }
];

export function calculateTailoringChain(neededXp, selectedRecipe) {
    const xpPerFabricChain = 208 + 312 + 468;
    const fabricBonusXpPerCraft = selectedRecipe.fabricNeed * xpPerFabricChain;
    const totalXpPerFullChainLoop = selectedRecipe.xpGiven + fabricBonusXpPerCraft;
    const chainCount = Math.ceil(neededXp / totalXpPerFullChainLoop);
    
    const totalFabric = chainCount * selectedRecipe.fabricNeed;
    const totalYarn = totalFabric * 3;
    const totalProcessedCotton = totalYarn * 3;
    const totalRawCottonInput = totalProcessedCotton * 3;
    
    const totalStag = chainCount * selectedRecipe.stagNeed;

    return `
        <div class="text-white font-bold border-b border-gray-950 pb-1.5 mb-2 text-center text-[10px] tracking-widest text-amber-500 uppercase">🔗 Pipelined Üretim Ağacı</div>
        <div class="mb-2">🎯 Eksik Kalan Deneyim: <span class="text-white font-extrabold">${neededXp.toLocaleString()} XP</span></div>
        <div class="pl-2 border-l-2 border-amber-500 my-2 space-y-1 text-white bg-black/40 p-2 rounded-lg">
            • <span class="text-amber-400 font-bold">${chainCount.toLocaleString()} Adet</span> Nihai Üretim<br>
            • <span class="text-amber-400 font-bold">${totalFabric.toLocaleString()} Adet</span> Fabric<br>
            • <span class="text-amber-400 font-bold">${totalYarn.toLocaleString()} Adet</span> Cotton Yarn<br>
            • <span class="text-amber-400 font-bold">${totalProcessedCotton.toLocaleString()} Kez</span> Cotton İşleme
        </div>
        <div class="border-t border-gray-950 pt-2 mt-2 space-y-1.5 font-semibold text-gray-400">
            <div class="flex justify-between text-emerald-400 items-center">
                <span>🌿 Toplam Ham Pamuk:</span>
                <span class="font-black text-white bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-900/30">${totalRawCottonInput.toLocaleString()} Adet</span>
            </div>
            <div class="flex justify-between items-center text-xs text-gray-300">
                <span>🦌 Tanned Leather (Stag):</span>
                <span class="font-bold text-white">${totalStag > 0 ? totalStag.toLocaleString() + ' Adet' : '-'}</span>
            </div>
        </div>`;
}
