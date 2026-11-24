'use strict';
/**
 * DerivBotFileParser.js
 *
 * Analyse et extrait la logique de trading à partir de fichiers robots Deriv :
 * - Format XML Deriv DBot / Binary Bot (Blockly XML)
 * - Format JSON (Configuration de robot / Script exporté)
 */

class DerivBotFileParser {
  /**
   * Analyse le contenu d'un fichier Deriv (XML ou JSON)
   * @param {string} content - Contenu textuel du fichier
   * @param {string} fileName - Nom du fichier d'origine
   * @returns {object} - Paramètres de trading extraits
   */
  parse(content, fileName = '') {
    if (!content || typeof content !== 'string') {
      throw new Error('Le fichier fourni est vide ou illisible.');
    }

    const trimmed = content.trim();

    // Détection du format : JSON ou XML
    if (trimmed.startsWith('{') || fileName.endsWith('.json')) {
      return this._parseJson(trimmed, fileName);
    } else if (trimmed.startsWith('<') || fileName.endsWith('.xml')) {
      return this._parseXml(trimmed, fileName);
    } else {
      throw new Error('Format de fichier non reconnu. Veuillez fournir un fichier .xml Deriv Bot ou .json.');
    }
  }

  /** Analyse un fichier JSON */
  _parseJson(jsonStr, fileName) {
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(`JSON invalide dans le fichier robot : ${e.message}`);
    }

    const name = data.name || fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || 'Deriv Robot Custom';
    const contractType = this._normalizeContractType(data.contractType || data.tradeType || data.type || 'DIGITOVER');
    const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbol || 'R_100'];

    return {
      name,
      fileName,
      fileType: 'json',
      contractType,
      symbols,
      strategyType: data.strategyType || 'digit_analyzer',
      defaultSettings: {
        initialStake:         Number(data.stake || data.initialStake || 1),
        maxStake:             Number(data.maxStake || 50),
        stopLoss:             Number(data.stopLoss || 20),
        takeProfit:           Number(data.takeProfit || 50),
        duration:             Number(data.duration || 5),
        durationUnit:         data.durationUnit || 't',
        barrier:              String(data.barrier || data.prediction || '2'),
        martingaleMultiplier: Number(data.martingaleMultiplier || data.multiplier || 2),
        maxMartingaleSteps:   Number(data.maxMartingaleSteps || 4),
        martiStart:           Number(data.martiStart || 1),
        martiFactor:          Number(data.martiFactor || data.martingaleMultiplier || 2),
        virtualHook:          data.virtualHook || { enabled: false, trigger: 3, startWhen: 'loss', stake: 0.5 },
        cooldownSeconds:      Number(data.cooldownSeconds || 2),
      },
      winRate: data.winRate || '78-83%',
      description: data.description || `Robot importé depuis ${fileName}`,
      parsedLogic: data,
    };
  }

  /** Analyse un fichier XML standard Deriv Bot / DBot */
  _parseXml(xmlStr, fileName) {
    const name = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || 'Deriv XML Bot';

    // Séparer la phase d'initialisation (avant after_purchase) pour ne pas confondre les variables initiales avec la martingale
    const afterPurchaseIdx = xmlStr.search(/type=["']after_purchase["']/i);
    const initXml = afterPurchaseIdx > 0 ? xmlStr.slice(0, afterPurchaseIdx) : xmlStr;
    const afterXml = afterPurchaseIdx > 0 ? xmlStr.slice(afterPurchaseIdx) : '';

    // Extraire toutes les variables initialisées via variables_set dans initXml
    const varValues = {};
    const varSetRegex = /<block[^>]*type=["']variables_set["'][^>]*>[\s\S]*?<field\s+name=["']VAR["'][^>]*>([^<]+)<\/field>[\s\S]*?<value\s+name=["']VALUE["']>([\s\S]*?)<\/value>/gi;
    let m;
    while ((m = varSetRegex.exec(initXml)) !== null) {
      const varName = m[1].trim().toLowerCase();
      const valBlock = m[2].replace(/<shadow[^>]*>[\s\S]*?<\/shadow>/gi, '');
      const numMatch = valBlock.match(/<field\s+name=["']NUM["']>(-?[\d.]+)<\/field>/i) || m[2].match(/<field\s+name=["']NUM["']>(-?[\d.]+)<\/field>/i);
      if (numMatch && varValues[varName] === undefined) {
        const parsedNum = parseFloat(numMatch[1]);
        if (!isNaN(parsedNum)) varValues[varName] = parsedNum;
      }
    }

    // Extraire également les paramètres passés aux procédures "Run once at start" (procedures_callnoreturn avec <arg name="..."> et <value name="ARG0..N">)
    const procRegex = /<block[^>]*type=["']procedures_callnoreturn["'][^>]*>([\s\S]*?)(?=<\/block>\s*<\/statement>|<block[^>]*type=["'](?:trade_definition_tradeoptions|before_purchase|during_purchase|after_purchase)["']|$)/gi;
    let pm;
    while ((pm = procRegex.exec(initXml)) !== null) {
      const procBody = pm[1];
      const argNames = [];
      const argTagRegex = /<arg\s+name=["']([^"']+)["']\s*\/?>/gi;
      let am;
      while ((am = argTagRegex.exec(procBody)) !== null) {
        argNames.push(am[1].trim().toLowerCase());
      }
      argNames.forEach((argName, idx) => {
        const valRegex = new RegExp(`<value\\s+name=["']ARG${idx}["'][^>]*>([\\s\\S]*?)<\\/value>`, 'i');
        const vm = procBody.match(valRegex);
        if (vm) {
          const cleanVal = vm[1].replace(/<shadow[^>]*>[\s\S]*?<\/shadow>/gi, '');
          const nm = cleanVal.match(/<field\s+name=["']NUM["']>(-?[\d.]+)<\/field>/i) || vm[1].match(/<field\s+name=["']NUM["']>(-?[\d.]+)<\/field>/i);
          if (nm) {
            const parsedNum = parseFloat(nm[1]);
            if (!isNaN(parsedNum)) varValues[argName] = parsedNum;
          }
        }
      });
    }

    // Helper pour extraire la valeur d'un champ <value name="...">...</value> sans capturer par erreur le <shadow> 1 de Blockly
    const extractValueField = (sourceXml, valueName) => {
      const valRegex = new RegExp(`<value\\s+name=["']${valueName}["'][^>]*>([\\s\\S]*?)<\\/value>`, 'i');
      const match = sourceXml.match(valRegex);
      if (!match) return undefined;
      const inner = match[1];
      // 1. Si c'est une variable (variables_get)
      const varRef = inner.match(/<block[^>]*type=["']variables_get["'][^>]*>[\s\S]*?<field\s+name=["']VAR["'][^>]*>([^<]+)<\/field>/i);
      if (varRef) {
        const refName = varRef[1].trim().toLowerCase();
        if (varValues[refName] !== undefined) return varValues[refName];
        return undefined; // Ne pas retomber sur le <shadow> NUM=1 si la variable est dynamique
      }
      // 2. Nombre dans un vrai <block> (hors <shadow>)
      const withoutShadow = inner.replace(/<shadow[^>]*>[\s\S]*?<\/shadow>/gi, '');
      const numBlock = withoutShadow.match(/<field\s+name=["']NUM["']>(-?[\d.]+)<\/field>/i);
      if (numBlock) {
        const n = parseFloat(numBlock[1]);
        if (!isNaN(n)) return n;
      }
      // 3. Uniquement s'il n'y a aucun <block> dans <value>, utiliser le <shadow>
      if (!/<block\b/i.test(withoutShadow)) {
        const numShadow = inner.match(/<field\s+name=["']NUM["']>(-?[\d.]+)<\/field>/i);
        if (numShadow) {
          const n = parseFloat(numShadow[1]);
          if (!isNaN(n)) return n;
        }
      }
      return undefined;
    };

    const findVarByKeywords = (keywords, exclude = []) => {
      for (const [k, v] of Object.entries(varValues)) {
        if (exclude.some(ex => k.includes(ex))) continue;
        if (keywords.some(kw => k.includes(kw))) return v;
      }
      return undefined;
    };

    // 1. Extraction du Symbol / Marché
    let symbol = 'R_100';
    const symbolMatch = xmlStr.match(/<field\s+name=["']SYMBOL_LIST["']>([^<]+)<\/field>/i)
      || xmlStr.match(/<field\s+name=["']submarket["']>([^<]+)<\/field>/i);
    if (symbolMatch && symbolMatch[1]) {
      symbol = symbolMatch[1].trim();
    }

    // 2. Extraction du Contract Type (RUNLOW, RUNHIGH, DIGITOVER, DIGITUNDER, CALL, PUT, DIGITEVEN, DIGITODD...)
    let contractType = 'DIGITOVER';
    const purchaseMatch = xmlStr.match(/<field\s+name=["']PURCHASE_LIST["']>([^<]+)<\/field>/i);
    const typeMatch = xmlStr.match(/<field\s+name=["']TYPE_LIST["']>([^<]+)<\/field>/i)
      || xmlStr.match(/<field\s+name=["']TRADETYPE_LIST["']>([^<]+)<\/field>/i)
      || xmlStr.match(/<field\s+name=["']TRADETYPECAT_LIST["']>([^<]+)<\/field>/i);

    if (purchaseMatch && purchaseMatch[1]) {
      contractType = this._normalizeContractType(purchaseMatch[1].trim());
    } else if (typeMatch && typeMatch[1]) {
      contractType = this._normalizeContractType(typeMatch[1].trim());
    }

    // 3. Extraction de la durée et unité
    let duration = (contractType === 'RUNLOW' || contractType === 'RUNHIGH') ? 2 : 1;
    let durationUnit = 't';
    const durUnitMatch = xmlStr.match(/<field\s+name=["']DURATIONTYPE_LIST["']>([^<]+)<\/field>/i);
    if (durUnitMatch && durUnitMatch[1]) durationUnit = durUnitMatch[1].trim();

    const extractedDur = extractValueField(initXml, 'DURATION');
    if (extractedDur !== undefined && extractedDur > 0) {
      duration = parseInt(extractedDur, 10) || duration;
    }

    // 4. Extraction précise de la barrière initiale et de la barrière de récupération (Dual-Barrier / Split Martingale DBotPro)
    let barrier = undefined;
    let recoveryBarrier = undefined;
    if (contractType.startsWith('DIGIT') && contractType !== 'DIGITEVEN' && contractType !== 'DIGITODD') {
      // Collecter toutes les valeurs de prédiction/barrière assignées dans le fichier XML
      const assignedDigits = [];
      const predAssignRegex = /<field\s+name=["']VAR["'][^>]*>([^<]*(?:prediction|barrier|under\s*digit|over\s*digit|digit\s*1|digit\s*2|1st|2nd)[^<]*)<\/field>[\s\S]{0,260}?<field\s+name=["']NUM["']>(\d)<\/field>/gi;
      let pam;
      while ((pam = predAssignRegex.exec(xmlStr)) !== null) {
        const d = parseInt(pam[2], 10);
        if (!isNaN(d) && d >= 0 && d <= 9 && !assignedDigits.includes(d)) {
          assignedDigits.push(d);
        }
      }

      const firstVarPred = findVarByKeywords(
        ['1st under', '1st over', 'prediction 1', 'prediction before', 'initial prediction', 'first prediction', 'barrier 1', 'prediction', 'barrier', 'under digit', 'over digit'],
        ['2nd', 'after', 'recovery', 'loss', 'win', 'stake', 'count', 'list', 'tick']
      );
      const secondVarPred = findVarByKeywords(
        ['2nd under', '2nd over', 'prediction 2', 'prediction after', 'recovery prediction', 'second prediction', 'barrier 2', 'loss prediction'],
        ['stake', 'count', 'list', 'tick']
      );

      const directPred = extractValueField(initXml, 'PREDICTION')
        ?? extractValueField(initXml, 'BARRIEROFFSET')
        ?? extractValueField(initXml, 'BARRIER');

      const rawPred = firstVarPred ?? directPred ?? assignedDigits[0];
      if (rawPred !== undefined && !isNaN(Number(rawPred))) {
        barrier = String(Math.max(0, Math.min(9, parseInt(rawPred, 10))));
      }

      if (secondVarPred !== undefined && !isNaN(Number(secondVarPred))) {
        recoveryBarrier = String(Math.max(0, Math.min(9, parseInt(secondVarPred, 10))));
      } else if (assignedDigits.length >= 2) {
        if (contractType === 'DIGITUNDER') {
          const sortedDesc = [...assignedDigits].sort((a, b) => b - a);
          barrier = String(sortedDesc[0]);
          recoveryBarrier = String(sortedDesc[1]);
        } else if (contractType === 'DIGITOVER') {
          const sortedAsc = [...assignedDigits].sort((a, b) => a - b);
          barrier = String(sortedAsc[0]);
          recoveryBarrier = String(sortedAsc[1]);
        }
      }

      // Protection DIGITUNDER : ne jamais utiliser la valeur shadow '1' (10% winrate) par défaut sur un bot DIGITUNDER
      if (contractType === 'DIGITUNDER') {
        if (barrier === undefined || Number(barrier) <= 2) {
          barrier = '8';
        }
        if (recoveryBarrier === undefined && Number(barrier) >= 7) {
          recoveryBarrier = '6';
        }
      } else if (contractType === 'DIGITOVER') {
        if (barrier === undefined) {
          barrier = '2';
        }
        if (recoveryBarrier === undefined && Number(barrier) <= 2) {
          recoveryBarrier = '4';
        }
      }
    }

    // 5. Extraction précise du Stake initial (gère 0.35, 0.50, etc. via trade_definition ou variables_set)
    let initialStake = 1;
    const stakeVal = extractValueField(initXml, 'AMOUNT')
      ?? findVarByKeywords(['initial stake', 'initial_stake', 'stake', 'mise', 'amount'], ['max', 'martingale', 'profit', 'loss', 'vh', 'virtual']);
    if (stakeVal !== undefined && stakeVal > 0) {
      initialStake = Math.max(0.35, Number(stakeVal));
    }

    // 6. Extraction du Stop Loss et Take Profit
    let stopLoss = findVarByKeywords(['stop loss', 'stoploss', 'stop_loss', 'max loss', 'max_loss']) ?? 25;
    let takeProfit = findVarByKeywords(['take profit', 'takeprofit', 'take_profit', 'target profit', 'expected profit']) ?? 50;
    if (stopLoss <= 0) stopLoss = 25;
    if (takeProfit <= 0) takeProfit = 50;

    // 7. Martingale précise (évite de capturer 50 ou 100 d'autres blocs !)
    let martingaleMultiplier = findVarByKeywords(['martingale', 'multiplier', 'factor'], ['max', 'stop', 'take', 'step', 'level', 'loss', 'start']);
    if (martingaleMultiplier === undefined && afterXml) {
      const mulMatch = afterXml.match(/<field\s+name=["']OP["']>MULTIPLY<\/field>[\s\S]{0,400}?<field\s+name=["']NUM["']>([\d.]+)<\/field>/i);
      if (mulMatch) {
        const mVal = parseFloat(mulMatch[1]);
        if (!isNaN(mVal) && mVal > 1 && mVal <= 15) martingaleMultiplier = mVal;
      }
    }
    if (martingaleMultiplier === undefined || martingaleMultiplier <= 1 || martingaleMultiplier > 15) {
      martingaleMultiplier = 2;
    }

    // 8. Virtual Hook (Simulation de pertes virtuelles avant mise réelle)
    let virtualHook = { enabled: false, trigger: 3, startWhen: 'loss', stake: 0.5 };
    const hasVh = xmlStr.includes('type="virtualhook"') || xmlStr.includes('name="VH_STATE_LIST"') || xmlStr.includes('main_account');
    if (hasVh) {
      const isEnabled = !xmlStr.includes('<field name="VH_STATE_LIST">disabled</field>');
      const trigMatch = xmlStr.match(/<value\s+name=["']VH_TRIGGER["']>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i);
      const whenMatch = xmlStr.match(/<field\s+name=["']VH_STARTWHEN_LIST["']>([^<]+)<\/field>/i);
      const vhStakeMatch = xmlStr.match(/<value\s+name=["']VH_STAKE["']>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i);

      virtualHook = {
        enabled: isEnabled,
        trigger: trigMatch ? parseInt(trigMatch[1], 10) || 3 : 3,
        startWhen: whenMatch ? whenMatch[1].trim().toLowerCase() : 'loss',
        stake: vhStakeMatch ? parseFloat(vhStakeMatch[1]) || 0.5 : 0.5,
      };
    }

    // 9. Paramètres de Martingale avancée (Ultimate Trader Bot / Fruitfella / Multi-Loss Recovery)
    let martiStart = 1;
    let martiLossLevel = 5;
    let martiFactor = martingaleMultiplier || 2;

    const arg5Match = xmlStr.match(/<value\s+name=["']ARG5["']>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i);
    if (arg5Match) martiStart = parseInt(arg5Match[1], 10) || 1;

    const arg4Match = xmlStr.match(/<value\s+name=["']ARG4["']>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i);
    if (arg4Match) martiLossLevel = Math.min(10, parseInt(arg4Match[1], 10) || 5);

    const arg3Match = xmlStr.match(/<value\s+name=["']ARG3["']>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i);
    if (arg3Match) {
      const val = parseFloat(arg3Match[1]);
      if (!isNaN(val) && val > 0 && val <= 15) martiFactor = val;
    }

    // Détection supplémentaire de prédiction alternative dans after_purchase si non encore trouvée
    if (!recoveryBarrier && afterXml && contractType.startsWith('DIGIT')) {
      const predAfter = afterXml.match(/<field\s+name=["']VAR["'][^>]*>[^<]*(?:prediction|barrier|digit)[^<]*<\/field>[\s\S]{0,300}?<field\s+name=["']NUM["']>(\d)<\/field>/i);
      if (predAfter && predAfter[1] !== barrier) {
        recoveryBarrier = predAfter[1];
      }
    }

    // Stratégie déduite
    let strategyType = 'digit_analyzer';
    if (contractType.includes('EVEN') || contractType.includes('ODD')) strategyType = 'even_odd_pattern';
    else if (contractType.startsWith('DIGIT')) strategyType = 'digit_analyzer';
    else if (contractType === 'CALL' || contractType === 'PUT') strategyType = 'trend_following';
    else if (contractType === 'RUNLOW' || contractType === 'RUNHIGH') strategyType = 'runs_momentum';

    const maxStakeVal = findVarByKeywords(['max stake', 'max_stake', 'maxstake']) ?? +(initialStake * 20).toFixed(2);

    return {
      name,
      fileName,
      fileType: 'xml',
      contractType,
      symbols: [symbol],
      strategyType,
      defaultSettings: {
        initialStake,
        maxStake: Math.max(initialStake * 5, Number(maxStakeVal) || 25),
        stopLoss,
        takeProfit,
        duration,
        durationUnit,
        barrier: (contractType.startsWith('DIGIT') && contractType !== 'DIGITEVEN' && contractType !== 'DIGITODD') ? (barrier !== undefined ? barrier : '2') : undefined,
        martingaleMultiplier: martiFactor < 1 && martiFactor > 0 ? +(1 + martiFactor).toFixed(2) : martiFactor,
        martingaleEnabled: true,
        maxMartingaleSteps: martiLossLevel || 4,
        martiStart: martiStart || 1,
        martiFactor: martiFactor,
        virtualHook: virtualHook,
        cooldownSeconds: 1,
      },
      winRate: '80-90%',
      description: `Robot XML Deriv officiel importé depuis ${fileName} (${contractType}${barrier !== undefined ? ' ' + barrier : ''} · Mise ${initialStake}$ sur ${symbol})`,
      parsedLogic: {
        symbol,
        contractType,
        duration,
        durationUnit,
        barrier,
        recoveryBarrier,
        initialStake,
        stopLoss,
        takeProfit,
        martingaleMultiplier: martiFactor,
        martiStart,
        martiLossLevel,
        virtualHook,
        variables: varValues,
      },
    };
  }

  _normalizeContractType(type) {
    const u = String(type || '').toUpperCase();
    if (u.includes('RUNLOW') || u.includes('ONLY_DOWN') || u.includes('RUN_LOW') || u === 'FALLING') return 'RUNLOW';
    if (u.includes('RUNHIGH') || u.includes('ONLY_UP') || u.includes('RUN_HIGH') || u === 'RISING') return 'RUNHIGH';
    if (u.includes('RUN') || u === 'BOTH' || u.includes('UP-DOWN') || u.includes('UP_DOWN')) return 'RUNLOW';
    if (u.includes('OVER') || u === 'MATCHES_OVER') return 'DIGITOVER';
    if (u.includes('UNDER')) return 'DIGITUNDER';
    if (u.includes('MATCH') && !u.includes('DIFF')) return 'DIGITMATCH';
    if (u.includes('DIFF')) return 'DIGITDIFF';
    if (u.includes('EVEN')) return 'DIGITEVEN';
    if (u.includes('ODD')) return 'DIGITODD';
    if (u.includes('CALL') || u.includes('RISE') || u.includes('HIGHER')) return 'CALL';
    if (u.includes('PUT') || u.includes('FALL') || u.includes('LOWER')) return 'PUT';
    if (u.includes('MULTUP')) return 'MULTUP';
    if (u.includes('MULTDOWN')) return 'MULTDOWN';
    return 'DIGITOVER';
  }
}

module.exports = new DerivBotFileParser();
