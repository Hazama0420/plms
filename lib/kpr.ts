// lib/kpr.ts
//
// Canonical KPR (Kredit Pemilikan Rumah) Calculation Engine
// Inland Property / PLMS
//
// Shared by /kpr-calculator and Property Detail page (/properties/[id])

export interface KprInputParams {
  propertyPrice: number;
  dpPercentage?: number; // e.g. 10 (%)
  dpNominalCustom?: number | null; // manual custom DP if user inputs nominal directly
  tenureYears?: number; // e.g. 15 (years)
  fixedRate?: number; // e.g. 6.5 (% per year)
  fixedYears?: number; // e.g. 3 (years)
  floatingRate?: number; // e.g. 11.5 (% per year)
  includeBphtb?: boolean; // default true
}

export interface KprYearlyAmortization {
  year: number;
  isFixed: boolean;
  yearlyPrincipal: number;
  yearlyInterest: number;
  remainingBalance: number;
}

export interface KprEstimatedFees {
  provisiFee: number;
  adminFee: number;
  appraisalFee: number;
  notaryFee: number;
  insuranceFee: number;
  bphtbTax: number;
  totalBiayaAkad: number;
}

export interface KprCalculationResult {
  propertyPrice: number;
  dpNominal: number;
  dpPercentageCalculated: number;
  loanPrincipal: number;
  tenureYears: number;
  totalMonths: number;
  fixedRate: number;
  fixedYears: number;
  floatingRate: number;
  installmentFixed: number;
  installmentFloating: number;
  requiredIncomeFixed: number;
  fees: KprEstimatedFees;
  totalUangAwal: number; // DP + totalBiayaAkad
  amortizationSchedule: KprYearlyAmortization[];
}

export const DEFAULT_KPR_CONFIG = {
  dpPercentage: 10,
  tenureYears: 15,
  fixedRate: 6.5,
  fixedYears: 3,
  floatingRate: 11.5,
  includeBphtb: true,
  adminFeeNominal: 1500000,
  appraisalFeeNominal: 1250000,
};

export const KPR_TENURE_OPTIONS = [5, 10, 15, 20, 25, 30];

/**
 * Menghitung simulasi KPR lengkap (anuitas bunga fixed + floating, estimasi biaya, amortisasi tahunan)
 */
export function calculateKprSimulation(params: KprInputParams): KprCalculationResult {
  const propertyPrice = Math.max(0, params.propertyPrice || 0);
  const dpPercentage = params.dpPercentage ?? DEFAULT_KPR_CONFIG.dpPercentage;
  const tenureYears = params.tenureYears ?? DEFAULT_KPR_CONFIG.tenureYears;
  const fixedRate = params.fixedRate ?? DEFAULT_KPR_CONFIG.fixedRate;
  const fixedYears = params.fixedYears ?? DEFAULT_KPR_CONFIG.fixedYears;
  const floatingRate = params.floatingRate ?? DEFAULT_KPR_CONFIG.floatingRate;
  const includeBphtb = params.includeBphtb ?? DEFAULT_KPR_CONFIG.includeBphtb;

  // Tentukan nominal DP
  let dpNominal = 0;
  let dpPercentageCalculated = dpPercentage;

  if (typeof params.dpNominalCustom === "number" && params.dpNominalCustom >= 0) {
    dpNominal = Math.min(propertyPrice, params.dpNominalCustom);
    dpPercentageCalculated = propertyPrice > 0 ? Number(((dpNominal / propertyPrice) * 100).toFixed(1)) : 0;
  } else {
    dpNominal = Math.round((propertyPrice * dpPercentage) / 100);
  }

  const loanPrincipal = Math.max(0, propertyPrice - dpNominal);
  const monthlyRateFixed = fixedRate / 100 / 12;
  const totalMonths = tenureYears * 12;

  // 1. Cicilan Periode Fixed (Anuitas)
  let installmentFixed = 0;
  if (monthlyRateFixed > 0 && totalMonths > 0 && loanPrincipal > 0) {
    const factorFixed = Math.pow(1 + monthlyRateFixed, totalMonths);
    installmentFixed = Math.round(loanPrincipal * ((monthlyRateFixed * factorFixed) / (factorFixed - 1)));
  }

  // 2. Simulasi Sisa Pokok Setelah Periode Fixed
  const fixedMonths = Math.min(fixedYears * 12, totalMonths);
  const remainingMonthsFloating = Math.max(0, totalMonths - fixedMonths);

  let balanceAfterFixed = loanPrincipal;
  for (let m = 1; m <= fixedMonths; m++) {
    const interestPayment = balanceAfterFixed * monthlyRateFixed;
    const principalPayment = installmentFixed - interestPayment;
    balanceAfterFixed -= principalPayment;
  }

  // 3. Cicilan Periode Floating
  const monthlyRateFloating = floatingRate / 100 / 12;
  let installmentFloating = installmentFixed;

  if (remainingMonthsFloating > 0 && monthlyRateFloating > 0 && balanceAfterFixed > 0) {
    const factorFloating = Math.pow(1 + monthlyRateFloating, remainingMonthsFloating);
    installmentFloating = Math.round(
      balanceAfterFixed * ((monthlyRateFloating * factorFloating) / (factorFloating - 1))
    );
  }

  // 4. Rekomendasi Penghasilan Minimal (Debt Service Ratio 35%)
  const requiredIncomeFixed = installmentFixed > 0 ? Math.round(installmentFixed / 0.35) : 0;

  // 5. Estimasi Biaya Akad & Legalitas
  const provisiFee = Math.round(loanPrincipal * 0.01);
  const adminFee = DEFAULT_KPR_CONFIG.adminFeeNominal;
  const appraisalFee = DEFAULT_KPR_CONFIG.appraisalFeeNominal;
  const notaryFee = Math.round(propertyPrice * 0.01);
  const insuranceFee = Math.round(loanPrincipal * 0.012);
  const bphtbTax = includeBphtb ? Math.max(0, Math.round((propertyPrice - 60000000) * 0.05)) : 0;

  const totalBiayaAkad = provisiFee + adminFee + appraisalFee + notaryFee + insuranceFee + bphtbTax;
  const totalUangAwal = dpNominal + totalBiayaAkad;

  // 6. Jadwal Amortisasi Tahunan
  const amortizationSchedule: KprYearlyAmortization[] = [];
  let curBalance = loanPrincipal;

  for (let yr = 1; yr <= tenureYears; yr++) {
    let yrInterest = 0;
    let yrPrincipal = 0;
    const isFixedYear = yr <= fixedYears;
    const currentRate = isFixedYear ? monthlyRateFixed : monthlyRateFloating;
    const currentInstallment = isFixedYear ? installmentFixed : installmentFloating;

    for (let m = 1; m <= 12; m++) {
      const interestM = curBalance * currentRate;
      const principalM = currentInstallment - interestM;
      yrInterest += interestM;
      yrPrincipal += principalM;
      curBalance -= principalM;
    }

    amortizationSchedule.push({
      year: yr,
      isFixed: isFixedYear,
      yearlyPrincipal: Math.round(yrPrincipal),
      yearlyInterest: Math.round(yrInterest),
      remainingBalance: Math.max(0, Math.round(curBalance)),
    });
  }

  return {
    propertyPrice,
    dpNominal,
    dpPercentageCalculated,
    loanPrincipal,
    tenureYears,
    totalMonths,
    fixedRate,
    fixedYears,
    floatingRate,
    installmentFixed,
    installmentFloating,
    requiredIncomeFixed,
    fees: {
      provisiFee,
      adminFee,
      appraisalFee,
      notaryFee,
      insuranceFee,
      bphtbTax,
      totalBiayaAkad,
    },
    totalUangAwal,
    amortizationSchedule,
  };
}

/**
 * Format nominal Rupiah terstandarisasi
 */
export function formatKprCurrency(value?: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "Rp 0";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format angka singkat dalam jutaan / milyaran (mis. Rp 1,5 Milyar)
 */
export function formatKprShort(value?: number | null): string {
  if (!value || value <= 0) return "Rp 0";
  if (value >= 1000000000) {
    const m = value / 1000000000;
    return `Rp ${m % 1 === 0 ? m : m.toFixed(2)} Milyar`;
  }
  if (value >= 1000000) {
    const jt = value / 1000000;
    return `Rp ${jt % 1 === 0 ? jt : jt.toFixed(1)} Juta`;
  }
  return formatKprCurrency(value);
}
