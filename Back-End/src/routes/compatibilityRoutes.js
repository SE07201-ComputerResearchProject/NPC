import express from 'express';
import mongoose from 'mongoose';
import Component, { COMPONENT_CATEGORIES } from '../models/Component.js';
import { normalizeBuildParts } from '../utils/commerceUtils.js';

const router = express.Router();

const REQUIRED_CATEGORIES = ['case', 'cpu', 'motherboard', 'ram', 'storage', 'psu'];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function normalizeTextList(value) {
  if (Array.isArray(value)) {
    return value.map(item => toText(item)).filter(Boolean);
  }

  const text = toText(value);
  return text ? [text] : [];
}

function addCheck(checks, status, title, detail) {
  checks.push({ status, title, detail });
}

function getSocket(part) {
  return toText(part?.specs?.socket || part?.aiCompatibility?.socket).toUpperCase();
}

function getRamType(part) {
  return toText(part?.specs?.ramType || part?.aiCompatibility?.ramType).toUpperCase();
}

function getFormFactor(part) {
  return toText(part?.specs?.formFactor || part?.aiCompatibility?.formFactor).toUpperCase();
}

async function resolveSelectedParts(rawParts) {
  const normalized = normalizeBuildParts(rawParts || {});
  const resolved = {};

  await Promise.all(
    COMPONENT_CATEGORIES.map(async category => {
      const snapshot = normalized[category];
      if (!snapshot) {
        resolved[category] = null;
        return;
      }

      let dbPart = null;
      if (snapshot.componentId && mongoose.Types.ObjectId.isValid(snapshot.componentId)) {
        dbPart = await Component.findById(snapshot.componentId).lean();
      }

      if (!dbPart) {
        dbPart = await Component.findOne({
          category: snapshot.category,
          name: snapshot.name,
        }).lean();
      }

      if (dbPart) {
        resolved[category] = {
          source: 'database',
          _id: String(dbPart._id),
          category: dbPart.category,
          name: dbPart.name,
          brand: dbPart.brand || '',
          price: toNumber(dbPart.price),
          power: toNumber(dbPart.power),
          specs: dbPart.specs || {},
          aiCompatibility: dbPart.aiCompatibility || {},
        };
        return;
      }

      resolved[category] = {
        source: 'snapshot',
        _id: snapshot.componentId || '',
        category: snapshot.category,
        name: snapshot.name,
        brand: snapshot.brand || '',
        price: toNumber(snapshot.price),
        power: toNumber(snapshot.power),
        specs: {},
        aiCompatibility: {},
      };
    })
  );

  return resolved;
}

function evaluateCompatibility(parts) {
  const checks = [];

  const missingRequired = REQUIRED_CATEGORIES.filter(category => !parts[category]);
  if (missingRequired.length > 0) {
    missingRequired.forEach(category => {
      addCheck(checks, 'fail', 'Required part missing', `${category.toUpperCase()} is required.`);
    });
  } else {
    addCheck(checks, 'pass', 'Required parts', 'All required categories are present.');
  }

  const totalPowerDrawW = COMPONENT_CATEGORIES.reduce((sum, category) => {
    if (category === 'psu') return sum;
    return sum + toNumber(parts[category]?.power);
  }, 0);

  const psuWattage = toNumber(parts.psu?.power);
  if (parts.psu) {
    if (psuWattage >= totalPowerDrawW) {
      addCheck(
        checks,
        'pass',
        'Power draw vs PSU',
        `Estimated draw ${totalPowerDrawW}W is within PSU capacity ${psuWattage}W.`
      );
    } else {
      addCheck(
        checks,
        'fail',
        'Power draw vs PSU',
        `Estimated draw ${totalPowerDrawW}W exceeds PSU capacity ${psuWattage}W.`
      );
    }
  }

  const cpuRecommendedPsu = toNumber(parts.cpu?.aiCompatibility?.minRecommendedPsuW);
  const gpuRecommendedPsu = Math.max(
    toNumber(parts.gpu?.specs?.recommendedPsuW),
    toNumber(parts.gpu?.aiCompatibility?.recommendedPsuW)
  );
  const recommendedPsuW = Math.max(totalPowerDrawW + 120, cpuRecommendedPsu, gpuRecommendedPsu);

  if (parts.psu && recommendedPsuW > 0) {
    if (psuWattage >= recommendedPsuW) {
      addCheck(checks, 'pass', 'Recommended PSU headroom', `PSU ${psuWattage}W meets recommendation ${recommendedPsuW}W.`);
    } else {
      addCheck(
        checks,
        'warn',
        'Recommended PSU headroom',
        `PSU ${psuWattage}W is below recommended ${recommendedPsuW}W (it may still run but with less headroom).`
      );
    }
  }

  const cpuSocket = getSocket(parts.cpu);
  const motherboardSocket = getSocket(parts.motherboard);

  if (parts.cpu && parts.motherboard) {
    if (!cpuSocket || !motherboardSocket) {
      addCheck(checks, 'warn', 'CPU/Motherboard socket', 'Socket metadata is incomplete for CPU or motherboard.');
    } else if (cpuSocket === motherboardSocket) {
      addCheck(checks, 'pass', 'CPU/Motherboard socket', `Both parts use ${cpuSocket}.`);
    } else {
      addCheck(checks, 'fail', 'CPU/Motherboard socket', `CPU socket ${cpuSocket} does not match motherboard socket ${motherboardSocket}.`);
    }
  }

  const motherboardRamType = getRamType(parts.motherboard);
  const ramType = getRamType(parts.ram);

  if (parts.motherboard && parts.ram) {
    if (!motherboardRamType || !ramType) {
      addCheck(checks, 'warn', 'RAM type', 'RAM type metadata is incomplete for motherboard or RAM.');
    } else if (motherboardRamType === ramType) {
      addCheck(checks, 'pass', 'RAM type', `Motherboard and RAM both use ${ramType}.`);
    } else {
      addCheck(checks, 'fail', 'RAM type', `Motherboard requires ${motherboardRamType} but RAM kit is ${ramType}.`);
    }
  }

  if (parts.cpu && parts.cooler) {
    const coolerSupportedSockets = normalizeTextList(parts.cooler?.specs?.supportedSockets).map(item => item.toUpperCase());
    const cpuTdpW = toNumber(parts.cpu?.specs?.tdpW);
    const coolerMaxTdpW = toNumber(parts.cooler?.specs?.maxTdpW);

    if (coolerSupportedSockets.length && cpuSocket) {
      if (coolerSupportedSockets.includes(cpuSocket)) {
        addCheck(checks, 'pass', 'Cooler socket support', `Cooler supports CPU socket ${cpuSocket}.`);
      } else {
        addCheck(checks, 'fail', 'Cooler socket support', `Cooler does not list support for CPU socket ${cpuSocket}.`);
      }
    } else {
      addCheck(checks, 'warn', 'Cooler socket support', 'Cooler socket compatibility metadata is incomplete.');
    }

    if (cpuTdpW > 0 && coolerMaxTdpW > 0) {
      if (coolerMaxTdpW >= cpuTdpW) {
        addCheck(checks, 'pass', 'Cooler thermal capacity', `Cooler max TDP ${coolerMaxTdpW}W covers CPU TDP ${cpuTdpW}W.`);
      } else {
        addCheck(checks, 'fail', 'Cooler thermal capacity', `Cooler max TDP ${coolerMaxTdpW}W is below CPU TDP ${cpuTdpW}W.`);
      }
    }
  }

  if (parts.case && parts.motherboard) {
    const caseFormFactors = normalizeTextList(
      parts.case?.specs?.formFactorSupport || parts.case?.aiCompatibility?.supportedMotherboardFormFactors
    ).map(item => item.toUpperCase());
    const motherboardFormFactor = getFormFactor(parts.motherboard);

    if (caseFormFactors.length && motherboardFormFactor) {
      if (caseFormFactors.includes(motherboardFormFactor)) {
        addCheck(checks, 'pass', 'Case/Motherboard form factor', `Case supports motherboard form factor ${motherboardFormFactor}.`);
      } else {
        addCheck(
          checks,
          'fail',
          'Case/Motherboard form factor',
          `Case support list does not include motherboard form factor ${motherboardFormFactor}.`
        );
      }
    } else {
      addCheck(checks, 'warn', 'Case/Motherboard form factor', 'Case or motherboard form-factor metadata is incomplete.');
    }
  }

  if (parts.case && parts.gpu) {
    const caseMaxGpuLengthMm = toNumber(parts.case?.specs?.maxGpuLengthMm || parts.case?.aiCompatibility?.maxGpuLengthMm);
    const gpuLengthMm = toNumber(parts.gpu?.specs?.lengthMm || parts.gpu?.aiCompatibility?.maxCaseLengthMm);

    if (caseMaxGpuLengthMm > 0 && gpuLengthMm > 0) {
      if (gpuLengthMm <= caseMaxGpuLengthMm) {
        addCheck(checks, 'pass', 'GPU length clearance', `GPU length ${gpuLengthMm}mm fits case max ${caseMaxGpuLengthMm}mm.`);
      } else {
        addCheck(checks, 'fail', 'GPU length clearance', `GPU length ${gpuLengthMm}mm exceeds case max ${caseMaxGpuLengthMm}mm.`);
      }
    } else {
      addCheck(checks, 'warn', 'GPU length clearance', 'GPU length or case max length metadata is incomplete.');
    }
  }

  if (parts.case && parts.cooler) {
    const caseMaxCoolerHeightMm = toNumber(parts.case?.specs?.maxCpuCoolerHeightMm);
    const coolerHeightMm = toNumber(parts.cooler?.specs?.heightMm);

    if (caseMaxCoolerHeightMm > 0 && coolerHeightMm > 0) {
      if (coolerHeightMm <= caseMaxCoolerHeightMm) {
        addCheck(
          checks,
          'pass',
          'CPU cooler height clearance',
          `Cooler height ${coolerHeightMm}mm fits case limit ${caseMaxCoolerHeightMm}mm.`
        );
      } else {
        addCheck(
          checks,
          'fail',
          'CPU cooler height clearance',
          `Cooler height ${coolerHeightMm}mm exceeds case limit ${caseMaxCoolerHeightMm}mm.`
        );
      }
    }
  }

  const failedCount = checks.filter(check => check.status === 'fail').length;
  const warningCount = checks.filter(check => check.status === 'warn').length;
  const score = Math.max(0, Math.min(100, 100 - failedCount * 22 - warningCount * 8));
  const compatible = failedCount === 0;

  const summary = compatible
    ? warningCount
      ? 'Build is compatible, but there are warnings worth reviewing.'
      : 'Build is fully compatible based on current metadata.'
    : 'Build has critical incompatibilities that should be fixed.';

  return {
    compatible,
    score,
    summary,
    totalPowerDrawW,
    recommendedPsuW,
    missingRequired,
    checks,
  };
}

router.post('/check', async (req, res) => {
  try {
    if (!req.body || typeof req.body.parts !== 'object' || req.body.parts === null) {
      return res.status(400).json({ message: 'parts must be an object' });
    }

    const resolvedParts = await resolveSelectedParts(req.body.parts);
    const analysis = evaluateCompatibility(resolvedParts);

    return res.status(200).json(analysis);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to evaluate compatibility', error: error.message });
  }
});

export default router;
