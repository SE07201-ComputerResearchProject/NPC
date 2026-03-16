import { COMPONENT_CATEGORIES } from '../models/Component.js';

const MIN_ITEMS_PER_CATEGORY = 5;
const DEFAULT_COMPONENT_IMAGE_URL = '';

export const DEFAULT_COMPONENTS = [
  {
    category: 'cpu',
    name: 'Intel Core i5-13400F',
    brand: 'Intel',
    price: 4850000,
    power: 65,
    stock: 18,
    description: 'Balanced 10-core processor for mainstream gaming and office workloads.',
    highlights: ['10 cores / 16 threads', 'LGA1700', 'Turbo up to 4.6GHz'],
    specs: {
      socket: 'LGA1700',
      cores: 10,
      threads: 16,
      baseClockGHz: 2.5,
      boostClockGHz: 4.6,
      tdpW: 65,
      memorySupport: 'DDR4/DDR5',
      integratedGraphics: false,
    },
    aiCompatibility: {
      socket: 'LGA1700',
      recommendedChipsets: ['B760', 'Z690', 'Z790'],
      minRecommendedPsuW: 550,
    },
  },
  {
    category: 'cpu',
    name: 'Intel Core i7-13700K',
    brand: 'Intel',
    price: 10490000,
    power: 125,
    stock: 10,
    description: 'High-end hybrid-core CPU for heavy gaming and creator workflows.',
    highlights: ['16 cores / 24 threads', 'Unlocked', 'Turbo up to 5.4GHz'],
    specs: {
      socket: 'LGA1700',
      cores: 16,
      threads: 24,
      baseClockGHz: 3.4,
      boostClockGHz: 5.4,
      tdpW: 125,
      memorySupport: 'DDR4/DDR5',
      integratedGraphics: true,
    },
    aiCompatibility: {
      socket: 'LGA1700',
      recommendedChipsets: ['Z790', 'Z690', 'B760'],
      minRecommendedPsuW: 650,
    },
  },
  {
    category: 'cpu',
    name: 'AMD Ryzen 5 7600',
    brand: 'AMD',
    price: 6190000,
    power: 65,
    stock: 15,
    description: 'Efficient AM5 gaming CPU with strong single-core performance.',
    highlights: ['6 cores / 12 threads', 'AM5', 'Turbo up to 5.1GHz'],
    specs: {
      socket: 'AM5',
      cores: 6,
      threads: 12,
      baseClockGHz: 3.8,
      boostClockGHz: 5.1,
      tdpW: 65,
      memorySupport: 'DDR5',
      integratedGraphics: true,
    },
    aiCompatibility: {
      socket: 'AM5',
      recommendedChipsets: ['B650', 'X670', 'A620'],
      minRecommendedPsuW: 550,
    },
  },
  {
    category: 'cpu',
    name: 'AMD Ryzen 7 7700X',
    brand: 'AMD',
    price: 8990000,
    power: 105,
    stock: 11,
    description: '8-core AM5 CPU tuned for high FPS gaming and multitasking.',
    highlights: ['8 cores / 16 threads', 'AM5', 'Turbo up to 5.4GHz'],
    specs: {
      socket: 'AM5',
      cores: 8,
      threads: 16,
      baseClockGHz: 4.5,
      boostClockGHz: 5.4,
      tdpW: 105,
      memorySupport: 'DDR5',
      integratedGraphics: true,
    },
    aiCompatibility: {
      socket: 'AM5',
      recommendedChipsets: ['B650', 'X670', 'X670E'],
      minRecommendedPsuW: 650,
    },
  },
  {
    category: 'cpu',
    name: 'Intel Core i9-14900K',
    brand: 'Intel',
    price: 14990000,
    power: 253,
    stock: 7,
    description: 'Flagship Intel processor for extreme gaming and workstation use.',
    highlights: ['24 cores / 32 threads', 'Unlocked', 'Turbo up to 6.0GHz'],
    specs: {
      socket: 'LGA1700',
      cores: 24,
      threads: 32,
      baseClockGHz: 3.2,
      boostClockGHz: 6.0,
      tdpW: 253,
      memorySupport: 'DDR4/DDR5',
      integratedGraphics: true,
    },
    aiCompatibility: {
      socket: 'LGA1700',
      recommendedChipsets: ['Z790'],
      minRecommendedPsuW: 850,
    },
  },

  {
    category: 'motherboard',
    name: 'MSI PRO B760M-A DDR4',
    brand: 'MSI',
    price: 3390000,
    power: 25,
    stock: 14,
    description: 'Cost-effective Intel board for DDR4 gaming systems.',
    highlights: ['mATX', 'DDR4', 'PCIe 4.0'],
    specs: {
      socket: 'LGA1700',
      chipset: 'B760',
      formFactor: 'mATX',
      ramType: 'DDR4',
      ramSlots: 4,
      maxRamGB: 128,
      pcieVersion: '4.0',
      m2Slots: 2,
    },
    aiCompatibility: {
      socket: 'LGA1700',
      ramType: 'DDR4',
      formFactor: 'mATX',
    },
  },
  {
    category: 'motherboard',
    name: 'ASUS TUF B760-PLUS WIFI',
    brand: 'ASUS',
    price: 5690000,
    power: 30,
    stock: 9,
    description: 'Durable ATX board with Wi-Fi and DDR5 support for Intel builds.',
    highlights: ['ATX', 'DDR5', 'Wi-Fi 6'],
    specs: {
      socket: 'LGA1700',
      chipset: 'B760',
      formFactor: 'ATX',
      ramType: 'DDR5',
      ramSlots: 4,
      maxRamGB: 192,
      pcieVersion: '5.0',
      m2Slots: 3,
    },
    aiCompatibility: {
      socket: 'LGA1700',
      ramType: 'DDR5',
      formFactor: 'ATX',
    },
  },
  {
    category: 'motherboard',
    name: 'Gigabyte B650 AORUS ELITE AX',
    brand: 'Gigabyte',
    price: 6490000,
    power: 30,
    stock: 8,
    description: 'Well-rounded AM5 board with robust VRM and modern connectivity.',
    highlights: ['ATX', 'AM5', 'PCIe 5.0 M.2'],
    specs: {
      socket: 'AM5',
      chipset: 'B650',
      formFactor: 'ATX',
      ramType: 'DDR5',
      ramSlots: 4,
      maxRamGB: 192,
      pcieVersion: '4.0/5.0',
      m2Slots: 3,
    },
    aiCompatibility: {
      socket: 'AM5',
      ramType: 'DDR5',
      formFactor: 'ATX',
    },
  },
  {
    category: 'motherboard',
    name: 'ASRock B550M Steel Legend',
    brand: 'ASRock',
    price: 3190000,
    power: 24,
    stock: 13,
    description: 'Reliable AM4 motherboard suitable for budget-performance builds.',
    highlights: ['mATX', 'AM4', 'PCIe 4.0'],
    specs: {
      socket: 'AM4',
      chipset: 'B550',
      formFactor: 'mATX',
      ramType: 'DDR4',
      ramSlots: 4,
      maxRamGB: 128,
      pcieVersion: '4.0',
      m2Slots: 2,
    },
    aiCompatibility: {
      socket: 'AM4',
      ramType: 'DDR4',
      formFactor: 'mATX',
    },
  },
  {
    category: 'motherboard',
    name: 'MSI MAG X670E Tomahawk WiFi',
    brand: 'MSI',
    price: 8990000,
    power: 35,
    stock: 6,
    description: 'Premium AM5 motherboard for enthusiast-level Ryzen systems.',
    highlights: ['ATX', 'X670E', 'Gen5 ready'],
    specs: {
      socket: 'AM5',
      chipset: 'X670E',
      formFactor: 'ATX',
      ramType: 'DDR5',
      ramSlots: 4,
      maxRamGB: 192,
      pcieVersion: '5.0',
      m2Slots: 4,
    },
    aiCompatibility: {
      socket: 'AM5',
      ramType: 'DDR5',
      formFactor: 'ATX',
    },
  },

  {
    category: 'gpu',
    name: 'NVIDIA GeForce RTX 4060 8GB',
    brand: 'NVIDIA',
    price: 8990000,
    power: 115,
    stock: 15,
    description: 'Efficient 1080p card with DLSS 3 support.',
    highlights: ['8GB GDDR6', 'DLSS 3', 'Ray tracing'],
    specs: {
      vramGB: 8,
      boostClockMHz: 2460,
      memoryBusBit: 128,
      lengthMm: 242,
      slotWidth: 2,
      recommendedPsuW: 550,
      powerConnector: '1x8-pin',
    },
    aiCompatibility: {
      recommendedPsuW: 550,
      maxCaseLengthMm: 242,
    },
  },
  {
    category: 'gpu',
    name: 'NVIDIA GeForce RTX 4070 SUPER 12GB',
    brand: 'NVIDIA',
    price: 16990000,
    power: 220,
    stock: 9,
    description: 'High-refresh 1440p card with strong ray tracing performance.',
    highlights: ['12GB GDDR6X', 'DLSS 3.5', 'AV1 encoder'],
    specs: {
      vramGB: 12,
      boostClockMHz: 2475,
      memoryBusBit: 192,
      lengthMm: 300,
      slotWidth: 2.5,
      recommendedPsuW: 650,
      powerConnector: '1x16-pin',
    },
    aiCompatibility: {
      recommendedPsuW: 650,
      maxCaseLengthMm: 300,
    },
  },
  {
    category: 'gpu',
    name: 'AMD Radeon RX 7600 8GB',
    brand: 'AMD',
    price: 7690000,
    power: 165,
    stock: 11,
    description: 'Value-focused 1080p GPU for esports and AAA titles.',
    highlights: ['8GB GDDR6', 'FSR 3', 'PCIe 4.0'],
    specs: {
      vramGB: 8,
      boostClockMHz: 2655,
      memoryBusBit: 128,
      lengthMm: 267,
      slotWidth: 2.2,
      recommendedPsuW: 550,
      powerConnector: '1x8-pin',
    },
    aiCompatibility: {
      recommendedPsuW: 550,
      maxCaseLengthMm: 267,
    },
  },
  {
    category: 'gpu',
    name: 'AMD Radeon RX 7800 XT 16GB',
    brand: 'AMD',
    price: 14990000,
    power: 263,
    stock: 8,
    description: 'Powerful 1440p card with large VRAM headroom.',
    highlights: ['16GB GDDR6', 'FSR 3', 'DisplayPort 2.1'],
    specs: {
      vramGB: 16,
      boostClockMHz: 2430,
      memoryBusBit: 256,
      lengthMm: 320,
      slotWidth: 2.8,
      recommendedPsuW: 700,
      powerConnector: '2x8-pin',
    },
    aiCompatibility: {
      recommendedPsuW: 700,
      maxCaseLengthMm: 320,
    },
  },
  {
    category: 'gpu',
    name: 'NVIDIA GeForce RTX 4090 24GB',
    brand: 'NVIDIA',
    price: 46990000,
    power: 450,
    stock: 4,
    description: 'Ultra-high-end GPU for 4K gaming and AI-heavy workloads.',
    highlights: ['24GB GDDR6X', 'DLSS 3.5', 'Extreme performance'],
    specs: {
      vramGB: 24,
      boostClockMHz: 2520,
      memoryBusBit: 384,
      lengthMm: 340,
      slotWidth: 3.5,
      recommendedPsuW: 850,
      powerConnector: '1x16-pin',
    },
    aiCompatibility: {
      recommendedPsuW: 850,
      maxCaseLengthMm: 340,
    },
  },

  {
    category: 'ram',
    name: 'Corsair Vengeance LPX 16GB DDR4-3200',
    brand: 'Corsair',
    price: 1090000,
    power: 4,
    stock: 22,
    description: 'Entry gaming memory kit with solid stability.',
    highlights: ['2x8GB', 'DDR4', '3200MHz'],
    specs: {
      ramType: 'DDR4',
      totalCapacityGB: 16,
      modules: 2,
      speedMHz: 3200,
      casLatency: 16,
      voltage: 1.35,
    },
    aiCompatibility: {
      ramType: 'DDR4',
      preferredSlots: 2,
    },
  },
  {
    category: 'ram',
    name: 'G.Skill Ripjaws V 32GB DDR4-3600',
    brand: 'G.Skill',
    price: 2190000,
    power: 6,
    stock: 18,
    description: 'Large DDR4 kit suited for multitasking and editing.',
    highlights: ['2x16GB', 'DDR4', '3600MHz'],
    specs: {
      ramType: 'DDR4',
      totalCapacityGB: 32,
      modules: 2,
      speedMHz: 3600,
      casLatency: 18,
      voltage: 1.35,
    },
    aiCompatibility: {
      ramType: 'DDR4',
      preferredSlots: 2,
    },
  },
  {
    category: 'ram',
    name: 'Kingston Fury Beast 32GB DDR5-5600',
    brand: 'Kingston',
    price: 3390000,
    power: 6,
    stock: 16,
    description: 'Reliable DDR5 memory for modern Intel and AMD platforms.',
    highlights: ['2x16GB', 'DDR5', '5600MHz'],
    specs: {
      ramType: 'DDR5',
      totalCapacityGB: 32,
      modules: 2,
      speedMHz: 5600,
      casLatency: 40,
      voltage: 1.25,
    },
    aiCompatibility: {
      ramType: 'DDR5',
      preferredSlots: 2,
    },
  },
  {
    category: 'ram',
    name: 'TeamGroup T-Force Delta RGB 32GB DDR5-6000',
    brand: 'TeamGroup',
    price: 3890000,
    power: 7,
    stock: 13,
    description: 'High-speed RGB DDR5 memory tuned for gaming profiles.',
    highlights: ['2x16GB', 'DDR5', '6000MHz'],
    specs: {
      ramType: 'DDR5',
      totalCapacityGB: 32,
      modules: 2,
      speedMHz: 6000,
      casLatency: 38,
      voltage: 1.35,
    },
    aiCompatibility: {
      ramType: 'DDR5',
      preferredSlots: 2,
    },
  },
  {
    category: 'ram',
    name: 'Corsair Dominator Platinum 64GB DDR5-6200',
    brand: 'Corsair',
    price: 7990000,
    power: 10,
    stock: 8,
    description: 'Premium high-capacity DDR5 kit for creators and heavy multitasking.',
    highlights: ['2x32GB', 'DDR5', '6200MHz'],
    specs: {
      ramType: 'DDR5',
      totalCapacityGB: 64,
      modules: 2,
      speedMHz: 6200,
      casLatency: 36,
      voltage: 1.4,
    },
    aiCompatibility: {
      ramType: 'DDR5',
      preferredSlots: 2,
    },
  },

  {
    category: 'storage',
    name: 'Samsung 980 PRO 1TB',
    brand: 'Samsung',
    price: 2390000,
    power: 6,
    stock: 20,
    description: 'High-performance Gen4 SSD for OS, gaming, and productivity apps.',
    highlights: ['NVMe PCIe 4.0', '1TB', 'Up to 7000MB/s read'],
    specs: {
      storageType: 'SSD',
      interface: 'NVMe PCIe 4.0 x4',
      capacityGB: 1000,
      formFactor: 'M.2 2280',
      sequentialReadMBps: 7000,
      sequentialWriteMBps: 5000,
    },
    aiCompatibility: {
      interface: 'M.2 NVMe',
      m2Length: '2280',
    },
  },
  {
    category: 'storage',
    name: 'WD Black SN850X 2TB',
    brand: 'Western Digital',
    price: 4690000,
    power: 7,
    stock: 14,
    description: 'Top-tier Gen4 gaming SSD with high sustained throughput.',
    highlights: ['NVMe PCIe 4.0', '2TB', 'Gaming mode support'],
    specs: {
      storageType: 'SSD',
      interface: 'NVMe PCIe 4.0 x4',
      capacityGB: 2000,
      formFactor: 'M.2 2280',
      sequentialReadMBps: 7300,
      sequentialWriteMBps: 6600,
    },
    aiCompatibility: {
      interface: 'M.2 NVMe',
      m2Length: '2280',
    },
  },
  {
    category: 'storage',
    name: 'Crucial P3 Plus 1TB',
    brand: 'Crucial',
    price: 1890000,
    power: 5,
    stock: 19,
    description: 'Budget Gen4 SSD with great value for mainstream builds.',
    highlights: ['NVMe PCIe 4.0', '1TB', 'Affordable performance'],
    specs: {
      storageType: 'SSD',
      interface: 'NVMe PCIe 4.0 x4',
      capacityGB: 1000,
      formFactor: 'M.2 2280',
      sequentialReadMBps: 5000,
      sequentialWriteMBps: 4200,
    },
    aiCompatibility: {
      interface: 'M.2 NVMe',
      m2Length: '2280',
    },
  },
  {
    category: 'storage',
    name: 'Seagate Barracuda 2TB 7200RPM',
    brand: 'Seagate',
    price: 1390000,
    power: 8,
    stock: 26,
    description: 'Large capacity HDD ideal for archive and media storage.',
    highlights: ['SATA 6Gb/s', '2TB', '7200RPM'],
    specs: {
      storageType: 'HDD',
      interface: 'SATA 6Gb/s',
      capacityGB: 2000,
      formFactor: '3.5-inch',
      spindleRpm: 7200,
      cacheMB: 256,
    },
    aiCompatibility: {
      interface: 'SATA',
      bayRequirement: '3.5-inch',
    },
  },
  {
    category: 'storage',
    name: 'Kingston KC3000 2TB',
    brand: 'Kingston',
    price: 3990000,
    power: 7,
    stock: 12,
    description: 'Fast and durable PCIe 4.0 SSD for advanced users.',
    highlights: ['NVMe PCIe 4.0', '2TB', 'High endurance'],
    specs: {
      storageType: 'SSD',
      interface: 'NVMe PCIe 4.0 x4',
      capacityGB: 2000,
      formFactor: 'M.2 2280',
      sequentialReadMBps: 7000,
      sequentialWriteMBps: 7000,
    },
    aiCompatibility: {
      interface: 'M.2 NVMe',
      m2Length: '2280',
    },
  },

  {
    category: 'psu',
    name: 'Corsair RM650e',
    brand: 'Corsair',
    price: 2290000,
    power: 650,
    stock: 16,
    description: 'Quiet and efficient modular PSU for mainstream GPUs.',
    highlights: ['650W', '80 Plus Gold', 'Fully modular'],
    specs: {
      wattage: 650,
      efficiency: '80 Plus Gold',
      modularity: 'Fully modular',
      pcie8PinConnectors: 3,
      fanSizeMm: 120,
      atxStandard: 'ATX 3.0',
    },
    aiCompatibility: {
      maxSuggestedGpuPowerW: 250,
      tier: 'Mainstream',
    },
  },
  {
    category: 'psu',
    name: 'Corsair RM750x',
    brand: 'Corsair',
    price: 2890000,
    power: 750,
    stock: 14,
    description: 'Popular quality PSU for upper mid-range and high-end builds.',
    highlights: ['750W', '80 Plus Gold', 'Low ripple'],
    specs: {
      wattage: 750,
      efficiency: '80 Plus Gold',
      modularity: 'Fully modular',
      pcie8PinConnectors: 4,
      fanSizeMm: 135,
      atxStandard: 'ATX 2.52',
    },
    aiCompatibility: {
      maxSuggestedGpuPowerW: 320,
      tier: 'Upper-mid',
    },
  },
  {
    category: 'psu',
    name: 'Seasonic Focus GX-850',
    brand: 'Seasonic',
    price: 3690000,
    power: 850,
    stock: 10,
    description: 'High reliability PSU for enthusiast gaming rigs.',
    highlights: ['850W', '80 Plus Gold', '10-year warranty'],
    specs: {
      wattage: 850,
      efficiency: '80 Plus Gold',
      modularity: 'Fully modular',
      pcie8PinConnectors: 6,
      fanSizeMm: 135,
      atxStandard: 'ATX 2.4',
    },
    aiCompatibility: {
      maxSuggestedGpuPowerW: 420,
      tier: 'High-end',
    },
  },
  {
    category: 'psu',
    name: 'Cooler Master MWE Gold 550 V2',
    brand: 'Cooler Master',
    price: 1790000,
    power: 550,
    stock: 19,
    description: 'Budget-friendly Gold PSU for efficient low-mid systems.',
    highlights: ['550W', '80 Plus Gold', 'Compact'],
    specs: {
      wattage: 550,
      efficiency: '80 Plus Gold',
      modularity: 'Semi modular',
      pcie8PinConnectors: 2,
      fanSizeMm: 120,
      atxStandard: 'ATX 2.52',
    },
    aiCompatibility: {
      maxSuggestedGpuPowerW: 180,
      tier: 'Entry',
    },
  },
  {
    category: 'psu',
    name: 'MSI MPG A1000G',
    brand: 'MSI',
    price: 4990000,
    power: 1000,
    stock: 7,
    description: 'ATX 3.0 1000W PSU prepared for flagship GPU power spikes.',
    highlights: ['1000W', '80 Plus Gold', 'ATX 3.0'],
    specs: {
      wattage: 1000,
      efficiency: '80 Plus Gold',
      modularity: 'Fully modular',
      pcie8PinConnectors: 8,
      fanSizeMm: 135,
      atxStandard: 'ATX 3.0',
    },
    aiCompatibility: {
      maxSuggestedGpuPowerW: 500,
      tier: 'Extreme',
    },
  },

  {
    category: 'case',
    name: 'Corsair 4000D Airflow',
    brand: 'Corsair',
    price: 2190000,
    power: 0,
    stock: 14,
    description: 'Popular airflow-focused ATX case with clean cable management.',
    highlights: ['ATX Mid Tower', 'Mesh front', 'Tempered glass'],
    specs: {
      caseType: 'Mid Tower',
      formFactorSupport: ['ATX', 'mATX', 'Mini-ITX'],
      maxGpuLengthMm: 360,
      maxCpuCoolerHeightMm: 170,
      radiatorSupportMm: [240, 280, 360],
      includedFans: 2,
    },
    aiCompatibility: {
      supportedMotherboardFormFactors: ['ATX', 'mATX', 'Mini-ITX'],
      maxGpuLengthMm: 360,
    },
  },
  {
    category: 'case',
    name: 'NZXT H5 Flow',
    brand: 'NZXT',
    price: 2490000,
    power: 0,
    stock: 10,
    description: 'Minimalist case with excellent directed airflow.',
    highlights: ['ATX Mid Tower', 'Bottom intake', 'Easy cable channels'],
    specs: {
      caseType: 'Mid Tower',
      formFactorSupport: ['ATX', 'mATX', 'Mini-ITX'],
      maxGpuLengthMm: 365,
      maxCpuCoolerHeightMm: 165,
      radiatorSupportMm: [240, 280],
      includedFans: 2,
    },
    aiCompatibility: {
      supportedMotherboardFormFactors: ['ATX', 'mATX', 'Mini-ITX'],
      maxGpuLengthMm: 365,
    },
  },
  {
    category: 'case',
    name: 'Lian Li Lancool 216',
    brand: 'Lian Li',
    price: 2890000,
    power: 0,
    stock: 9,
    description: 'Airflow monster with oversized front fans for cool operation.',
    highlights: ['ATX Mid Tower', '160mm front fans', 'High airflow design'],
    specs: {
      caseType: 'Mid Tower',
      formFactorSupport: ['ATX', 'mATX', 'Mini-ITX', 'E-ATX'],
      maxGpuLengthMm: 392,
      maxCpuCoolerHeightMm: 180,
      radiatorSupportMm: [240, 280, 360],
      includedFans: 3,
    },
    aiCompatibility: {
      supportedMotherboardFormFactors: ['ATX', 'mATX', 'Mini-ITX', 'E-ATX'],
      maxGpuLengthMm: 392,
    },
  },
  {
    category: 'case',
    name: 'Fractal Design Meshify C',
    brand: 'Fractal Design',
    price: 2790000,
    power: 0,
    stock: 8,
    description: 'Compact high-airflow case with premium internal layout.',
    highlights: ['ATX Mid Tower', 'Angular mesh front', 'Compact footprint'],
    specs: {
      caseType: 'Mid Tower',
      formFactorSupport: ['ATX', 'mATX', 'Mini-ITX'],
      maxGpuLengthMm: 315,
      maxCpuCoolerHeightMm: 172,
      radiatorSupportMm: [240, 280, 360],
      includedFans: 2,
    },
    aiCompatibility: {
      supportedMotherboardFormFactors: ['ATX', 'mATX', 'Mini-ITX'],
      maxGpuLengthMm: 315,
    },
  },
  {
    category: 'case',
    name: 'DeepCool CH560',
    brand: 'DeepCool',
    price: 2390000,
    power: 0,
    stock: 12,
    description: 'Feature-rich case with broad cooling support and RGB fans.',
    highlights: ['ATX Mid Tower', '3x140mm front fans', 'ARGB hub'],
    specs: {
      caseType: 'Mid Tower',
      formFactorSupport: ['ATX', 'mATX', 'Mini-ITX'],
      maxGpuLengthMm: 380,
      maxCpuCoolerHeightMm: 175,
      radiatorSupportMm: [240, 280, 360],
      includedFans: 4,
    },
    aiCompatibility: {
      supportedMotherboardFormFactors: ['ATX', 'mATX', 'Mini-ITX'],
      maxGpuLengthMm: 380,
    },
  },

  {
    category: 'cooler',
    name: 'DeepCool AK400',
    brand: 'DeepCool',
    price: 799000,
    power: 5,
    stock: 21,
    description: 'Budget tower cooler with excellent thermal efficiency.',
    highlights: ['Single tower', '120mm PWM fan', '220W TDP class'],
    specs: {
      coolerType: 'Air',
      supportedSockets: ['LGA1700', 'LGA1200', 'AM4', 'AM5'],
      fanSizeMm: 120,
      heightMm: 155,
      maxTdpW: 220,
    },
    aiCompatibility: {
      supportedSockets: ['LGA1700', 'AM4', 'AM5'],
      maxTdpW: 220,
      heightMm: 155,
    },
  },
  {
    category: 'cooler',
    name: 'Noctua NH-D15',
    brand: 'Noctua',
    price: 2790000,
    power: 6,
    stock: 9,
    description: 'Premium dual-tower air cooler known for low noise and top performance.',
    highlights: ['Dual tower', '2x140mm fans', 'Whisper quiet'],
    specs: {
      coolerType: 'Air',
      supportedSockets: ['LGA1700', 'LGA1200', 'AM4', 'AM5'],
      fanSizeMm: 140,
      heightMm: 165,
      maxTdpW: 250,
    },
    aiCompatibility: {
      supportedSockets: ['LGA1700', 'AM4', 'AM5'],
      maxTdpW: 250,
      heightMm: 165,
    },
  },
  {
    category: 'cooler',
    name: 'Thermalright Peerless Assassin 120 SE',
    brand: 'Thermalright',
    price: 1290000,
    power: 6,
    stock: 17,
    description: 'High-value dual-tower cooler with excellent price/performance ratio.',
    highlights: ['Dual tower', '2x120mm fans', 'Great value'],
    specs: {
      coolerType: 'Air',
      supportedSockets: ['LGA1700', 'LGA1200', 'AM4', 'AM5'],
      fanSizeMm: 120,
      heightMm: 157,
      maxTdpW: 245,
    },
    aiCompatibility: {
      supportedSockets: ['LGA1700', 'AM4', 'AM5'],
      maxTdpW: 245,
      heightMm: 157,
    },
  },
  {
    category: 'cooler',
    name: 'Corsair H100i Elite Capellix',
    brand: 'Corsair',
    price: 3690000,
    power: 15,
    stock: 8,
    description: '240mm AIO liquid cooler for compact high-performance systems.',
    highlights: ['AIO liquid', '240mm radiator', 'RGB pump head'],
    specs: {
      coolerType: 'AIO',
      supportedSockets: ['LGA1700', 'LGA1200', 'AM4', 'AM5'],
      radiatorSizeMm: 240,
      fanSizeMm: 120,
      tubeLengthMm: 400,
      maxTdpW: 260,
    },
    aiCompatibility: {
      supportedSockets: ['LGA1700', 'AM4', 'AM5'],
      radiatorSizeMm: 240,
      maxTdpW: 260,
    },
  },
  {
    category: 'cooler',
    name: 'Lian Li Galahad II Trinity 360',
    brand: 'Lian Li',
    price: 4990000,
    power: 22,
    stock: 6,
    description: '360mm AIO cooler for flagship CPUs under sustained load.',
    highlights: ['AIO liquid', '360mm radiator', 'High cooling ceiling'],
    specs: {
      coolerType: 'AIO',
      supportedSockets: ['LGA1700', 'AM4', 'AM5'],
      radiatorSizeMm: 360,
      fanSizeMm: 120,
      tubeLengthMm: 385,
      maxTdpW: 320,
    },
    aiCompatibility: {
      supportedSockets: ['LGA1700', 'AM4', 'AM5'],
      radiatorSizeMm: 360,
      maxTdpW: 320,
    },
  },

  {
    category: 'fan',
    name: 'Noctua NF-A12x25 PWM',
    brand: 'Noctua',
    price: 799000,
    power: 2,
    stock: 24,
    description: 'Premium 120mm PWM fan with exceptional airflow/noise balance.',
    highlights: ['120mm', 'PWM', 'Low acoustic profile'],
    specs: {
      sizeMm: 120,
      maxRpm: 2000,
      airflowCfm: 60.1,
      staticPressureMmH2O: 2.34,
      noiseDbA: 22.6,
      connector: '4-pin PWM',
    },
    aiCompatibility: {
      fanSizeMm: 120,
      connector: '4-pin PWM',
    },
  },
  {
    category: 'fan',
    name: 'Arctic P12 PWM PST',
    brand: 'Arctic',
    price: 269000,
    power: 2,
    stock: 31,
    description: 'Affordable 120mm fan optimized for static pressure and radiator use.',
    highlights: ['120mm', 'PST daisy-chain', 'Great value'],
    specs: {
      sizeMm: 120,
      maxRpm: 1800,
      airflowCfm: 56.3,
      staticPressureMmH2O: 2.2,
      noiseDbA: 24.5,
      connector: '4-pin PWM',
    },
    aiCompatibility: {
      fanSizeMm: 120,
      connector: '4-pin PWM',
    },
  },
  {
    category: 'fan',
    name: 'Corsair AF120 RGB Elite',
    brand: 'Corsair',
    price: 649000,
    power: 3,
    stock: 19,
    description: 'RGB 120mm fan with balanced airflow for showcase builds.',
    highlights: ['120mm', 'ARGB', 'Hydraulic bearing'],
    specs: {
      sizeMm: 120,
      maxRpm: 1850,
      airflowCfm: 65.57,
      staticPressureMmH2O: 2.68,
      noiseDbA: 31.5,
      connector: '4-pin PWM + RGB',
    },
    aiCompatibility: {
      fanSizeMm: 120,
      connector: '4-pin PWM',
      rgbHeaderNeeded: true,
    },
  },
  {
    category: 'fan',
    name: 'DeepCool FK120',
    brand: 'DeepCool',
    price: 329000,
    power: 2,
    stock: 28,
    description: 'Balanced fan for quiet airflow and straightforward installation.',
    highlights: ['120mm', 'Fluid dynamic bearing', 'Silent profile'],
    specs: {
      sizeMm: 120,
      maxRpm: 1850,
      airflowCfm: 68.99,
      staticPressureMmH2O: 2.19,
      noiseDbA: 28,
      connector: '4-pin PWM',
    },
    aiCompatibility: {
      fanSizeMm: 120,
      connector: '4-pin PWM',
    },
  },
  {
    category: 'fan',
    name: 'Lian Li UNI FAN SL120 V2',
    brand: 'Lian Li',
    price: 899000,
    power: 3,
    stock: 16,
    description: 'Interlocking RGB fan with clean cable management for premium builds.',
    highlights: ['120mm', 'Interlocking design', 'ARGB dual zone'],
    specs: {
      sizeMm: 120,
      maxRpm: 2000,
      airflowCfm: 64.5,
      staticPressureMmH2O: 2.59,
      noiseDbA: 29.2,
      connector: 'Controller + 4-pin PWM',
    },
    aiCompatibility: {
      fanSizeMm: 120,
      connector: 'Controller + PWM',
      rgbHeaderNeeded: true,
    },
  },
].map(component => ({
  ...component,
  imageUrl: component.imageUrl || DEFAULT_COMPONENT_IMAGE_URL,
}));

function groupDefaultsByCategory(components) {
  return components.reduce((map, item) => {
    if (!map.has(item.category)) {
      map.set(item.category, []);
    }

    map.get(item.category).push(item);
    return map;
  }, new Map());
}

function buildComponentKey(component) {
  return `${component.category}::${component.name}`;
}

async function backfillMissingImageUrl(ComponentModel) {
  const result = await ComponentModel.updateMany(
    {
      $or: [{ imageUrl: { $exists: false } }, { imageUrl: null }, { imageUrl: '' }],
    },
    {
      $set: { imageUrl: DEFAULT_COMPONENT_IMAGE_URL },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`✓ Backfilled imageUrl for ${result.modifiedCount} component(s)`);
  }
}

export async function seedComponentsIfNeeded(ComponentModel) {
  const existingComponents = await ComponentModel.find({}, { category: 1, name: 1 }).lean();
  const existingKeys = new Set(existingComponents.map(buildComponentKey));

  const currentCountByCategory = existingComponents.reduce((map, item) => {
    map.set(item.category, (map.get(item.category) || 0) + 1);
    return map;
  }, new Map());

  const defaultsByCategory = groupDefaultsByCategory(DEFAULT_COMPONENTS);
  const toInsert = [];

  for (const category of COMPONENT_CATEGORIES) {
    let currentCount = currentCountByCategory.get(category) || 0;
    if (currentCount >= MIN_ITEMS_PER_CATEGORY) {
      continue;
    }

    const defaults = defaultsByCategory.get(category) || [];
    for (const item of defaults) {
      if (currentCount >= MIN_ITEMS_PER_CATEGORY) {
        break;
      }

      const key = buildComponentKey(item);
      if (existingKeys.has(key)) {
        continue;
      }

      toInsert.push(item);
      existingKeys.add(key);
      currentCount += 1;
    }
  }

  if (!toInsert.length) {
    await backfillMissingImageUrl(ComponentModel);
    console.log('✓ Components already satisfy minimum category coverage');
    return;
  }

  await ComponentModel.insertMany(toInsert, { ordered: false });
  await backfillMissingImageUrl(ComponentModel);
  console.log(`✓ Seeded ${toInsert.length} components to satisfy minimum category coverage`);
}
