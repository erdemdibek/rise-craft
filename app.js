// XP Grupları Veritabanı
const xpGroups = {
    heavy: [0, 12000, 24000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 192000, 240000, 288000, 360000, 432000, 504000, 600000, 696000, 792000, 912000, 1032000, 1152000, 1296000, 1440000, 1584000, 1752000, 1920000, 2160000, 2400000, 2880000, 3360000, 4080000, 4800000, 5760000, 6720000, 7920000, 9120000, 10560000, 12240000, 14160000, 16800000],
    medium: [0, 9000, 18000, 27000, 36000, 45000, 54000, 72000, 90000, 108000, 144000, 180000, 216000, 270000, 324000, 378000, 450000, 522000, 594000, 684000, 774000, 864000, 972000, 1080000, 1188000, 1314000, 1440000, 1620000, 1800000, 2160000, 2520000, 3060000, 3600000, 4320000, 5040000, 5940000, 6840000, 7920000, 9180000, 10620000, 12600000],
    standard: [0, 6000, 12000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 96000, 120000, 144000, 180000, 216000, 252000, 300000, 348000, 396000, 456000, 516000, 576000, 648000, 720000, 792000, 876000, 960000, 1080000, 1200000, 1440000, 1680000, 2040000, 2400000, 2880000, 3360000, 3960000, 4560000, 5280000, 6120000, 7080000, 8400000],
    easy: [0, 3000, 6000, 9000, 12000, 15000, 18000, 24000, 30000, 36000, 48000, 60000, 72000, 90000, 108000, 126000, 150000, 174000, 198000, 228000, 258000, 288000, 324000, 360000, 396000, 438000, 480000, 540000, 600000, 720000, 840000, 1020000, 1200000, 1440000, 1680000, 1980000, 2280000, 2640000, 3060000, 3600000, 4200000]
};

// Seviye 1-20 Arası Güncellenmiş Tüm Tailoring Reçeteleri ve Girdileri
const recipes = {
    tailoring: [
        { id: "cotton_process", name: "Cotton (İşleme)", levelRequired: 1, xpGiven: 52, isChain: false },
        { id: "cotton_yarn", name: "Cotton Yarn", levelRequired: 1, xpGiven: 104, isChain: false },
        { id: "fabric", name: "Fabric", levelRequired: 1, xpGiven: 208, isChain: false },
        
        // Seviye 4 Üretimleri (Bot ve Kolluklar)
        { id: "lvl4_boots_gloves", name: "Lv4 - Leather Boots / Gloves (Zincirleme)", levelRequired: 4, xpGiven: 1300, isChain: true, fabricNeed: 2, stagNeed: 2, boarNeed: 0, tigerNeed: 0, copperNeed: 0 },
        
        // Seviye 8 Üretimleri (Heavy Bot ve Kolluklar)
        { id: "lvl8_heavy_gear", name: "Lv8 - Heavy Leather Boots / Gloves (Zincirleme)", levelRequired: 8, xpGiven: 2600, isChain: true, fabricNeed: 3, stagNeed: 2, boarNeed: 1, tigerNeed: 0, copperNeed: 1 },
        
        // Seviye 12 Üretimleri (Kafalıklar)
        { id: "lvl12_helmets", name: "Lv12 - Leather Helmets (Zincirleme)", levelRequired: 12, xpGiven: 4160, isChain: true, fabricNeed: 4, stagNeed: 2, boarNeed: 2, tigerNeed: 0, copperNeed: 0 },
        
        // Seviye 16 Üretimleri (Heavy Kafalıklar)
        { id: "lvl16_heavy_helmets", name: "Lv16 - Heavy Leather Helmets (Zincirleme)", levelRequired: 16, xpGiven: 5200, isChain: true, fabricNeed: 4, stagNeed: 2, boarNeed: 1, tigerNeed: 1, copperNeed: 1 }
    ]
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

function getXpRequired(group, currentLvl, targetLvl, currentXp) {
    const table = xpGroups[group];
    let total = 0;
    for (let i = currentLvl; i < targetLvl; i++) {
        total += table[i] || 0;
    }
    total = total - currentXp;
    return total > 0 ? total : 0;
}

function renderProfessions() {
    const container = document.getElementById('professions-container');
    container.innerHTML = '';

    userProgress.forEach((prof, index) => {
        const xpTable = xpGroups[prof.group];
        const nextLevelXp = xpTable[prof.level] || 0;
        const pct = nextLevelXp > 0 ? (prof.currentXp / nextLevelXp) * 100 : 100;

        let recipeOptions = `<option value="">-- Reçete Seçin --</option>`;
        if (recipes[prof.id]) {
            recipes[prof.id].forEach(r => {
                if (prof.level >= r.levelRequired) {
                    recipeOptions += `<option value="${r.id}">${r.name}</option>`;
                }
            });
        }

        const card = document.createElement('div');
        card.className = "bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm hover:border-gray-700 transition duration-200";
        card.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-amber-500">${prof.name}</h3>
                <span class="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Grup: ${prof.group.toUpperCase()}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Mevcut Seviye</label>
                    <input type="number" min="1" max="40" value="${prof.level}" 
                        class="w-full bg-black border border-gray-700 rounded p-2 text-white font-bold"
                        onchange="updateLevel(${index}, this.value)">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Mevcut XP</label>
                    <input type="number" min="0" max="${nextLevelXp}" value="${prof.currentXp}" 
                        class="w-full bg-black border border-gray-700 rounded p-2 text-gray-300"
                        onchange="updateXp(${index}, this.value)">
                </div>
            </div>

            <div class="w-full bg-black rounded-full h-2 overflow-hidden mb-1">
                <div class="bg-amber-500 h-2 rounded-full" style="width: ${pct}%"></div>
            </div>
            <div class="flex justify-between text-xs text-gray-400 mb-4">
                <span>%${pct.toFixed(1)}</span>
                <span>${prof.currentXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP</span>
            </div>

            <div class="bg-black/50 border border-gray-800/80 rounded-lg p-3 mt-2">
                <p class="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">🎯 Üretim Hesaplayıcı</p>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <input type="number" id="target-${index}" min="${prof.level + 1}" max="40" placeholder="Hedef Seviye" 
                        class="bg-black border border-gray-700 rounded p-1 text-xs text-center text-white">
                    <select id="select-${index}" class="bg-black border border-gray-700 rounded p-1 text-xs text-gray-300">
                        ${recipeOptions}
                    </select>
                </div>
                <button onclick="runCalculation(${index})" class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-1.5 px-3 rounded transition">
                    Hesapla
                </button>
                <div id="result-${index}" class="text-xs text-left mt-3 p-2 bg-black/60 rounded border border-gray-800 text-amber-400 font-medium hidden space-y-1"></div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.runCalculation = function(index) {
    const prof = userProgress[index];
    const targetInput = document.getElementById(`target-${index}`).value;
    const recipeId = document.getElementById(`select-${index}`).value;
    const resultDiv = document.getElementById(`result-${index}`);

    const targetLvl = parseInt(targetInput);

    if (!targetLvl || targetLvl <= prof.level || targetLvl > 40) {
        alert("Lütfen geçerli bir hedef seviye girin.");
        return;
    }
    if (!recipeId) {
        alert("Lütfen bir reçete seçin.");
        return;
    }

    const neededXp = getXpRequired(prof.group, prof.level, targetLvl, prof.currentXp);
    const tailoringRecipes = recipes[prof.id] || [];
    const selectedRecipe = tailoringRecipes.find(r => r.id === recipeId);

    if (!selectedRecipe) return;

    // TAILORING PIPELINE (ZİNCİRLEME HESAPLAMA) MOTORU
    if (prof.id === "tailoring" && selectedRecipe.isChain) {
        if (prof.level < selectedRecipe.levelRequired) {
            alert(`Bu reçeteyi üretebilmek için seviyeniz en az ${selectedRecipe.levelRequired} olmalıdır!`);
            return;
        }

        /* Matematiksel Zincirleme Mantığı (Gelişmiş Pipeline v2.3):
           1 Adet Fabric Üretim Döngüsü:
             - 1 Fabric üretimi = 208 XP
             - 3 Cotton Yarn üretimi = 3 * 104 XP = 312 XP
             - 9 Cotton İşleme üretimi = 9 * 52 XP = 468 XP
             ==> Toplam: 1 Fabric sıfırdan üretildiğinde yolda tam 988 XP kazandırır!
             ==> 1 Fabric için gereken ham pamuk: 9 * 3 = 27 adet.
        */
        const xpPerFabricChain = 208 + 312 + 468; // 988 XP
        
        // Seçilen eşyanın toplam Fabric ihtiyacının getireceği ara XP:
        const fabricBonusXpPerCraft = selectedRecipe.fabricNeed * xpPerFabricChain;
        
        // Eşyanın kendi saf üretim XP'si ile Fabric zincirinden gelen XP toplamı:
        const totalXpPerFullChainLoop = selectedRecipe.xpGiven + fabricBonusXpPerCraft;
        
        // Hedefe ulaşmak için kaç tam döngü (üretim) gerekiyor?
        const chainCount = Math.ceil(neededXp / totalXpPerFullChainLoop);
        
        // Toplam Malzeme Girdileri Hesaplaması
        const totalFabric = chainCount * selectedRecipe.fabricNeed;
        const totalYarn = totalFabric * 3;
        const totalProcessedCotton = totalYarn * 3;
        const totalRawCottonInput = totalProcessedCotton * 3;
        
        const totalStag = chainCount * selectedRecipe.stagNeed;
        const totalBoar = chainCount * selectedRecipe.boarNeed;
        const totalTiger = chainCount * selectedRecipe.tigerNeed;
        const totalCopper = chainCount * selectedRecipe.copperNeed;

        // Arayüz Çıktısı Tasarımı
        let materialListHtml = `
            <div class="text-white font-bold border-b border-gray-800 pb-1 mb-1 text-center text-[10px] tracking-wider text-amber-500 uppercase">🔗 Pipelined Üretim Ağacı</div>
            <div>🎯 Hedef Seviyeye Kalan XP: <span class="text-white font-bold">${neededXp.toLocaleString()}</span></div>
            <div class="text-gray-400 mt-1">Gerekli ara üretimler (Kazanılacak tüm ara XP'ler düşülmüştür):</div>
            <div class="pl-2 border-l-2 border-amber-500 my-1.5 space-y-0.5 text-white bg-black/30 p-1.5 rounded">
                • <span class="text-amber-400 font-bold">${chainCount.toLocaleString()} Adet</span> Nihai Eşya Üretimi<br>
                • <span class="text-amber-400 font-bold">${totalFabric.toLocaleString()} Adet</span> Fabric<br>
                • <span class="text-amber-400 font-bold">${totalYarn.toLocaleString()} Adet</span> Cotton Yarn<br>
                • <span class="text-amber-400 font-bold">${totalProcessedCotton.toLocaleString()} Kez</span> Cotton Materyal İşleme
            </div>
            <div class="border-t border-gray-800/80 pt-1.5 mt-1 space-y-1 font-semibold text-gray-300">
                <div class="flex justify-between text-emerald-400">
                    <span>🌿 Toplam Ham Pamuk:</span>
                    <span class="font-extrabold text-white bg-emerald-950 px-1.5 rounded border border-emerald-800/40">${totalRawCottonInput.toLocaleString()} Adet</span>
                </div>
                <div class="flex justify-between">
                    <span>🦌 Tanned Leather (Stag):</span>
                    <span class="font-bold text-white">${totalStag > 0 ? totalStag.toLocaleString() + ' Adet' : '-'}</span>
                </div>`;

        if (totalBoar > 0) {
            materialListHtml += `
                <div class="flex justify-between">
                    <span>🐗 Tanned Leather (Boar):</span>
                    <span class="font-bold text-white">${totalBoar.toLocaleString()} Adet</span>
                </div>`;
        }
        if (totalTiger > 0) {
            materialListHtml += `
                <div class="flex justify-between">
                    <span>🐅 Tanned Leather (Tiger):</span>
                    <span class="font-bold text-white">${totalTiger.toLocaleString()} Adet</span>
                </div>`;
        }
        if (totalCopper > 0) {
            materialListHtml += `
                <div class="flex justify-between text-orange-400">
                    <span>🪙 Copper Plate:</span>
                    <span class="font-bold text-white">${totalCopper.toLocaleString()} Adet</span>
                </div>`;
        }

        materialListHtml += `</div>`;
        resultDiv.innerHTML = materialListHtml;

    } else {
        // Standart Tekli Hesaplama Düzeni (Ara hammaddeler için düz mantık)
        const xpPerCraft = selectedRecipe.xpGiven;
        const craftCount = Math.ceil(neededXp / xpPerCraft);

        resultDiv.innerHTML = `
            <div class="text-white font-bold border-b border-gray-800 pb-1 mb-1 text-center text-[10px] tracking-wider text-gray-400 uppercase">🔨 Tekil Üretim Detayı</div>
            <div>🎯 Hedefe Kalan Net XP: <span class="text-white font-bold">${neededXp.toLocaleString()}</span></div>
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
    renderProfessions();
}

window.updateXp = function(index, value) {
    let xp = parseInt(value) || 0;
    const maxVal = xpGroups[userProgress[index].group][userProgress[index].level] || 0;
    if (xp < 0) xp = 0; if (xp > maxVal) xp = maxVal;
    userProgress[index].currentXp = xp;
    saveProgress();
    renderProfessions();
}

calculateGrandMasterStatus();
renderProfessions();
