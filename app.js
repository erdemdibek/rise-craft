// XP Grupları Veritabanı
const xpGroups = {
    heavy: [0, 12000, 24000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 192000, 240000, 288000, 360000, 432000, 504000, 600000, 696000, 792000, 912000, 1032000, 1152000, 1296000, 1440000, 1584000, 1752000, 1920000, 2160000, 2400000, 2880000, 3360000, 4080000, 4800000, 5760000, 6720000, 7920000, 9120000, 10560000, 12240000, 14160000, 16800000],
    medium: [0, 9000, 18000, 27000, 36000, 45000, 54000, 72000, 90000, 108000, 144000, 180000, 216000, 270000, 324000, 378000, 450000, 522000, 594000, 684000, 774000, 864000, 972000, 1080000, 1188000, 1314000, 1440000, 1620000, 1800000, 2160000, 2520000, 3060000, 3600000, 4320000, 5040000, 5940000, 6840000, 7920000, 9180000, 10620000, 12600000],
    standard: [0, 6000, 12000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 180000, 216000, 252000, 300000, 348000, 396000, 456000, 516000, 576000, 648000, 720000, 792000, 876000, 960000, 1080000, 1200000, 1440000, 1680000, 2040000, 2400000, 2880000, 3360000, 3960000, 4560000, 5280000, 6120000, 7080000, 8400000],
    easy: [0, 3000, 6000, 9000, 12000, 15000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 90000, 108000, 126000, 150000, 174000, 198000, 228000, 258000, 288000, 324000, 360000, 396000, 438000, 480000, 540000, 600000, 720000, 840000, 1020000, 1200000, 1440000, 1680000, 1980000, 2280000, 2640000, 3060000, 3600000, 4200000]
};

// Reçeteler Veritabanı
const recipes = {
    tailoring: [
        { id: "cotton_process", name: "Cotton (İşleme)", levelRequired: 1, xpGiven: 52, isChain: false },
        { id: "cotton_yarn", name: "Cotton Yarn", levelRequired: 1, xpGiven: 104, isChain: false },
        { id: "fabric", name: "Fabric", levelRequired: 1, xpGiven: 208, isChain: false },
        { id: "lvl4_boots_gloves", name: "Lv4 - Leather Boots / Gloves (+1300 XP)", levelRequired: 4, xpGiven: 1300, isChain: true, fabricNeed: 2, stagNeed: 2, boarNeed: 0, tigerNeed: 0, copperNeed: 0 }
    ],
    cooking: [
        { id: "butter", name: "Lv1 - Butter (+10 XP)", levelRequired: 1, xpGiven: 10, isChain: false },
        { id: "roasted_corn", name: "Lv1 - Roasted Corn (+52 XP)", levelRequired: 1, xpGiven: 52, isChain: false },
        { id: "roasted_potato", name: "Lv1 - Roasted Potato (+52 XP)", levelRequired: 1, xpGiven: 52, isChain: false },
        { id: "carrot_soup", name: "Lv4 - Carrot Soup (+124 XP)", levelRequired: 4, xpGiven: 124, isChain: false },
        { id: "omlette", name: "Lv4 - Omlette (+124 XP)", levelRequired: 4, xpGiven: 124, isChain: false },
        { id: "tomato_soup", name: "Lv4 - Tomato Soup (+124 XP)", levelRequired: 4, xpGiven: 124, isChain: false }
    ],
    armor_smithing: [
        { id: "lvl1_elite_gear", name: "Lv1 - Elite Boots / Gloves (+13000 XP)", levelRequired: 1, xpGiven: 13000, isChain: false, materials: { stag: 4, boar: 0, zebra: 0, copper: 4, iron: 0, baseItem: 1 } },
        { id: "lvl10_imperial_gear", name: "Lv10 - Imperial Boots / Gloves (+26000 XP)", levelRequired: 10, xpGiven: 26000, isChain: false, materials: { stag: 4, boar: 2, zebra: 1, copper: 4, iron: 2, baseItem: 1 } }
    ],
    blacksmithing: [
        // Seviye 1
        { id: "copper_plate", name: "Lv1 - Copper Plate (+41 XP)", levelRequired: 1, xpGiven: 41, isChain: false, materials: { copperOre: 3, charcoal: 3 } },
        { id: "copper_stick", name: "Lv1 - Copper Stick (+83 XP)", levelRequired: 1, xpGiven: 83, isChain: false, materials: { copperPlate: 3 } },
        // Seviye 10
        { id: "iron_plate", name: "Lv10 - Iron Plate (+124 XP)", levelRequired: 10, xpGiven: 124, isChain: false, materials: { ironOre: 3, charcoal: 3 } },
        { id: "iron_stick", name: "Lv10 - Iron Stick (+249 XP)", levelRequired: 10, xpGiven: 249, isChain: false, materials: { ironPlate: 3 } },
        { id: "iron_bar", name: "Lv10 - Iron Bar (+208 XP)", levelRequired: 10, xpGiven: 208, isChain: false, materials: { ironOre: 5, charcoal: 5 } },
        { id: "silver", name: "Lv10 - Silver (+12480 XP)", levelRequired: 10, xpGiven: 12480, isChain: false, materials: { silverDust: 5, charcoal: 1 } }
    ]
};

// İkon Eşleştirmeleri
const professionIcons = {
    alchemy: "fa-flask", armor_smithing: "fa-shield-halved", blacksmithing: "fa-fire",
    carpentry: "fa-tree", cooking: "fa-utensils", jewel_crafting: "fa-gem",
    leatherworking: "fa-shoe-prints", stonemasonry: "fa-mountain", tailoring: "fa-shirt",
    weapon_smithing: "fa-sword"
};

const initialProfessions = [
    { id: 'alchemy', name: 'Alchemy', group: 'standard' },
    { id: 'armor_smithing', name: 'Armor Smithing', group: 'heavy' },
    { id: 'blacksmithing', name: 'Blacksmithing', group: 'standard' },
    { id: 'carpentry', name: 'Carpentry', group: 'easy' },
    { id: 'cooking', name: 'Cooking', group: 'standard' },
    { id: 'jewel_crafting', name: 'Jewel Crafting', group: 'heavy' },
    { id: 'leatherworking', name: 'Leatherworking', group: 'medium' },
    { id: 'stonemasonry', name: 'Stonemasonry', group: 'easy' },
    { id: 'tailoring', name: 'Tailoring', group: 'standard' },
    { id: 'weapon_smithing', name: 'Weapon Smithing', group: 'heavy' }
];

let userProgress = JSON.parse(localStorage.getItem('rise_craft_progress')) || 
    initialProfessions.map(p => ({ ...p, level: 1, currentXp: 0 }));

let selectedProfessionId = null;

function saveProgress() {
    localStorage.setItem('rise_craft_progress', JSON.stringify(userProgress));
    calculateGrandMasterStatus();
}

function calculateGrandMasterStatus() {
    const levels = userProgress.map(p => p.level);
    const minLevel = Math.min(...levels);
    let statusText = "Normal Üye";
    if (minLevel >= 40) statusText = "🏆 GrandMaster 4";
    else if (minLevel >= 30) statusText = "🥇 GrandMaster 3";
    else if (minLevel >= 20) statusText = "🥈 GrandMaster 2";
    else if (minLevel >= 10) statusText = "🥉 GrandMaster 1";
    else statusText = `Gelişmekte (En düşük: ${minLevel}/10)`;
    document.getElementById('gm-status').innerText = statusText;
}

function renderGridDashboard() {
    const gridContainer = document.getElementById('professions-grid');
    gridContainer.innerHTML = '';

    userProgress.forEach((prof) => {
        const xpTable = xpGroups[prof.group];
        const nextLevelXp = xpTable[prof.level] || 0;
        const pct = nextLevelXp > 0 ? (prof.currentXp / nextLevelXp) * 100 : 100;
        const icon = professionIcons[prof.id] || "fa-gavel";
        const isSelected = selectedProfessionId === prof.id;

        const card = document.createElement('button');
        card.onclick = () => selectProfession(prof.id);
        card.className = `w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
            isSelected 
            ? 'bg-amber-600/10 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
            : 'bg-gray-900/40 border-gray-900 hover:border-gray-800 hover:bg-gray-900/80'
        }`;

        card.innerHTML = `
            <div class="flex items-center justify-between w-full mb-2">
                <div class="flex items-center space-x-2">
                    <i class="fa-solid ${icon} text-xs ${isSelected ? 'text-amber-400' : 'text-gray-500'}"></i>
                    <span class="text-xs font-bold text-gray-200">${prof.name}</span>
                </div>
                <span class="text-[11px] font-black ${isSelected ? 'text-amber-400' : 'text-gray-400'} bg-black/40 px-1.5 py-0.5 rounded">
                    Lvl ${prof.level}
                </span>
            </div>
            <div class="w-full bg-black/60 rounded-full h-1 overflow-hidden">
                <div class="bg-amber-500 h-1 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
            </div>
        `;
        gridContainer.appendChild(card);
    });
}

function selectProfession(id) {
    selectedProfessionId = id;
    renderGridDashboard();

    const detailPanel = document.getElementById('active-detail-panel');
    const profIndex = userProgress.findIndex(p => p.id === id);
    const prof = userProgress[profIndex];
    
    const xpTable = xpGroups[prof.group];
    const nextLevelXp = xpTable[prof.level] || 0;

    let recipeOptions = `<option value="">-- Reçete Seçin --</option>`;
    if (recipes[prof.id]) {
        recipes[prof.id].forEach(r => {
            if (prof.level >= r.levelRequired) {
                recipeOptions += `<option value="${r.id}">${r.name}</option>`;
            }
        });
    } else {
        recipeOptions = `<option value="">Bu meslek için reçete yüklenmedi (Yakında)</option>`;
    }

    detailPanel.innerHTML = `
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg animate-fadeIn">
            <div class="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
                <div class="flex items-center space-x-2">
                    <i class="fa-solid ${professionIcons[prof.id]} text-amber-500"></i>
                    <h3 class="text-md font-black text-white">${prof.name} Yönetimi</h3>
                </div>
                <button onclick="closeDetailPanel()" class="text-gray-500 hover:text-gray-300 text-xs">
                    <i class="fa-solid fa-xmark text-sm"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label class="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">Mevcut Seviye</label>
                    <input type="number" min="1" max="40" value="${prof.level}" 
                        class="w-full bg-black border border-gray-800 rounded-lg p-2 text-white font-black text-sm text-center focus:border-amber-500 outline-none"
                        onchange="updateLevel(${profIndex}, this.value)">
                </div>
                <div>
                    <label class="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">Mevcut XP</label>
                    <input type="number" min="0" max="${nextLevelXp}" value="${prof.currentXp}" 
                        class="w-full bg-black border border-gray-800 rounded-lg p-2 text-gray-300 text-sm text-center focus:border-amber-500 outline-none"
                        onchange="updateXp(${profIndex}, this.value)">
                </div>
            </div>

            <div class="bg-black/40 border border-gray-950 rounded-xl p-3.5">
                <p class="text-[9px] font-bold text-gray-500 mb-2.5 uppercase tracking-widest">🎯 İlerleme Hesaplayıcı</p>
                <div class="grid grid-cols-2 gap-2 mb-3">
                    <input type="number" id="target-${profIndex}" min="${prof.level + 1}" max="40" placeholder="Hedef Lvl" 
                        class="bg-black border border-gray-800 rounded-lg p-2 text-xs text-center text-white focus:border-amber-500 outline-none">
                    <select id="select-${profIndex}" class="bg-black border border-gray-800 rounded-lg p-2 text-xs text-gray-300 focus:border-amber-500 outline-none">
                        ${recipeOptions}
                    </select>
                </div>
                <button onclick="runCalculation(${profIndex})" class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2 rounded-lg transition duration-150 shadow-md">
                    Hesaplamayı Başlat
                </button>
                <div id="result-${profIndex}" class="text-xs text-left mt-3 p-3 bg-black/80 rounded-xl border border-gray-950 text-amber-400 font-medium hidden space-y-1"></div>
            </div>
        </div>
    `;
    detailPanel.classList.remove('hidden');
}

window.closeDetailPanel = function() {
    selectedProfessionId = null;
    document.getElementById('active-detail-panel').classList.add('hidden');
    renderGridDashboard();
}

window.runCalculation = function(index) {
    const prof = userProgress[index];
    const targetInput = document.getElementById(`target-${index}`).value;
    const recipeId = document.getElementById(`select-${index}`).value;
    const resultDiv = document.getElementById(`result-${index}`);
    const targetLvl = parseInt(targetInput);

    if (!targetLvl || targetLvl <= prof.level || targetLvl > 40) {
        alert("Lütfen geçerli bir hedef seviye girin."); return;
    }
    if (!recipeId) {
        alert("Lütfen bir reçete seçin."); return;
    }

    const table = xpGroups[prof.group];
    let neededXp = 0;
    for (let i = prof.level; i < targetLvl; i++) { neededXp += table[i] || 0; }
    neededXp = neededXp - prof.currentXp;
    if (neededXp < 0) neededXp = 0;

    const currentRecipes = recipes[prof.id] || [];
    const selectedRecipe = currentRecipes.find(r => r.id === recipeId);
    if (!selectedRecipe) return;

    if (prof.id === "tailoring" && selectedRecipe.isChain) {
        const xpPerFabricChain = 208 + 312 + 468;
        const fabricBonusXpPerCraft = selectedRecipe.fabricNeed * xpPerFabricChain;
        const totalXpPerFullChainLoop = selectedRecipe.xpGiven + fabricBonusXpPerCraft;
        const chainCount = Math.ceil(neededXp / totalXpPerFullChainLoop);
        
        const totalFabric = chainCount * selectedRecipe.fabricNeed;
        const totalYarn = totalFabric * 3;
        const totalProcessedCotton = totalYarn * 3;
        const totalRawCottonInput = totalProcessedCotton * 3;
        
        const totalStag = chainCount * selectedRecipe.stagNeed;
        const totalBoar = chainCount * selectedRecipe.boarNeed;
        const totalTiger = chainCount * selectedRecipe.tigerNeed;
        const totalCopper = chainCount * selectedRecipe.copperNeed;

        let materialListHtml = `
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
                </div>`;

        if (totalBoar > 0) materialListHtml += `<div class="flex justify-between items-center text-xs text-gray-300"><span>🐗 Tanned Leather (Boar):</span><span class="font-bold text-white">${totalBoar.toLocaleString()} Adet</span></div>`;
        if (totalTiger > 0) materialListHtml += `<div class="flex justify-between items-center text-xs text-gray-300"><span>🐅 Tanned Leather (Tiger):</span><span class="font-bold text-white">${totalTiger.toLocaleString()} Adet</span></div>`;
        if (totalCopper > 0) materialListHtml += `<div class="flex justify-between items-center text-xs text-orange-400"><span>🪙 Copper Plate:</span><span class="font-bold text-white">${totalCopper.toLocaleString()} Adet</span></div>`;

        materialListHtml += `</div>`;
        resultDiv.innerHTML = materialListHtml;
    } 
    else if ((prof.id === "armor_smithing" || prof.id === "blacksmithing") && selectedRecipe.materials) {
        const craftCount = Math.ceil(neededXp / selectedRecipe.xpGiven);
        const mats = selectedRecipe.materials;

        let dynamicMatsHtml = "";
        
        // Blacksmithing & Armor Smithing Materyal Çarpanları Dağılımı
        if (mats.copperOre) dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1 text-orange-300"><span>🪨 Copper Ore:</span> <span class="font-bold text-white">${(mats.copperOre * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.copperPlate) dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1 text-orange-400"><span>🪙 Copper Plate:</span> <span class="font-bold text-white">${(mats.copperPlate * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.ironOre) dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1 text-blue-300"><span>🪨 Iron Ore:</span> <span class="font-bold text-white">${(mats.ironOre * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.ironPlate) dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1 text-blue-400"><span>⛓️ Iron Plate:</span> <span class="font-bold text-white">${(mats.ironPlate * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.silverDust) dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1 text-slate-300"><span>✨ Silver Dust:</span> <span class="font-bold text-white">${(mats.silverDust * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.charcoal) dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1 text-gray-400"><span>🪵 Charcoal:</span> <span class="font-bold text-white">${(mats.charcoal * craftCount).toLocaleString()} Adet</span></div>`;
        
        // Armor Smithing Derileri & Temel Parça
        if (mats.stag) dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1"><span>🦌 Tanned Leather (Stag):</span> <span class="font-bold text-white">${(mats.stag * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.boar) dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1"><span>🐗 Tanned Leather (Boar):</span> <span class="font-bold text-white">${(mats.boar * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.zebra) dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1"><span>🦓 Tanned Leather (Zebra):</span> <span class="font-bold text-white">${(mats.zebra * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.copper && prof.id === "armor_smithing") dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1 text-orange-400"><span>🪙 Copper Plate:</span> <span class="font-bold text-white">${(mats.copper * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.iron && prof.id === "armor_smithing") dynamicMatsHtml += `<div class="flex justify-between border-b border-gray-900/40 pb-1 text-blue-400"><span>⛓️ Iron Plate:</span> <span class="font-bold text-white">${(mats.iron * craftCount).toLocaleString()} Adet</span></div>`;
        if (mats.baseItem) dynamicMatsHtml += `<div class="flex justify-between text-amber-500 font-bold mt-1 pt-1 border-t border-gray-950"><span>📦 Craftsız Temel Eşya (+1):</span> <span class="text-white font-black">${(mats.baseItem * craftCount).toLocaleString()} Adet</span></div>`;

        resultDiv.innerHTML = `
            <div class="text-white font-bold border-b border-gray-950 pb-1.5 mb-2 text-center text-[10px] tracking-wider text-amber-500 uppercase">🛠️ Gereken Toplam Materyaller</div>
            <div class="mb-2">🎯 Hedefe Kalan Net XP: <span class="text-white font-bold">${neededXp.toLocaleString()} XP</span></div>
            <div class="mb-3 flex justify-between items-center bg-gray-950 p-2 rounded border border-gray-800">
                <span class="text-gray-400 text-xs">Toplam Üretim Adedi:</span>
                <span class="text-sm font-black text-amber-400">${craftCount.toLocaleString()} Adet</span>
            </div>
            <div class="space-y-1 text-xs text-gray-300">
                ${dynamicMatsHtml}
            </div>
        `;
    } 
    else {
        const xpPerCraft = selectedRecipe.xpGiven;
        const craftCount = Math.ceil(neededXp / xpPerCraft);
        resultDiv.innerHTML = `
            <div class="text-white font-bold border-b border-gray-950 pb-1 mb-1 text-center text-[10px] tracking-wider text-amber-500 uppercase">🍳 Üretim Detayı</div>
            <div class="mb-2">🎯 Hedefe Kalan Net XP: <span class="text-white font-bold">${neededXp.toLocaleString()} XP</span></div>
            <div class="mt-1 flex justify-between items-center bg-gray-950 p-2 rounded border border-gray-800">
                <span class="text-gray-400">Gereken Toplam Üretim:</span>
                <span class="text-sm font-extrabold text-amber-400">${craftCount.toLocaleString()} Adet</span>
            </div>
        `;
    }
    resultDiv.classList.remove('hidden');
}

window.updateLevel = function(index, value) {
    let lvl = parseInt(value) || 1;
    if (lvl < 1) lvl = 1; if (lvl > 40) lvl = 40;
    userProgress[index].level = lvl;
    saveProgress();
    renderGridDashboard();
    selectProfession(userProgress[index].id);
}

window.updateXp = function(index, value) {
    let xp = parseInt(value) || 0;
    const maxVal = xpGroups[userProgress[index].group][userProgress[index].level] || 0;
    if (xp < 0) xp = 0; if (xp > maxVal) xp = maxVal;
    userProgress[index].currentXp = xp;
    saveProgress();
    renderGridDashboard();
}

calculateGrandMasterStatus();
renderGridDashboard();
