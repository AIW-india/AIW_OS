import { Decimal } from 'decimal.js';

export interface BoqItemCalculationInput {
  materialQty?: number | string | Decimal | null;
  materialRate?: number | string | Decimal | null;
  labourQty?: number | string | Decimal | null;
  labourRate?: number | string | Decimal | null;
  otherCharges?: number | string | Decimal | null;
}

export interface BoqItemCalculationResult {
  materialQty: Decimal;
  materialRate: Decimal;
  materialTotal: Decimal;
  labourQty: Decimal;
  labourRate: Decimal;
  labourTotal: Decimal;
  otherCharges: Decimal;
  itemTotal: Decimal;
}

export interface EstimateSummaryCalculationInput {
  items: BoqItemCalculationResult[];
  wastagePercent?: number | string | Decimal | null;
  overheadPercent?: number | string | Decimal | null;
  profitMarginPercent?: number | string | Decimal | null;
  discountPercent?: number | string | Decimal | null;
  taxPercent?: number | string | Decimal | null;
}

export interface EstimateSummaryCalculationResult {
  totalMaterialCost: Decimal;
  totalLabourCost: Decimal;
  totalOtherCharges: Decimal;
  subtotalCost: Decimal;
  wastagePercent: Decimal;
  wastageAmount: Decimal;
  overheadPercent: Decimal;
  overheadAmount: Decimal;
  profitMarginPercent: Decimal;
  profitMarginAmount: Decimal;
  discountPercent: Decimal;
  discountAmount: Decimal;
  taxPercent: Decimal;
  taxAmount: Decimal;
  grandTotal: Decimal;
}

/**
 * Calculates line-level material, labour, and composite totals using exact decimal arithmetic.
 */
export function calculateBoqItem(input: BoqItemCalculationInput): BoqItemCalculationResult {
  const mQty = new Decimal(input.materialQty ?? 0);
  const mRate = new Decimal(input.materialRate ?? 0);
  const mTotal = mQty.mul(mRate).toDecimalPlaces(2);

  const lQty = new Decimal(input.labourQty ?? 0);
  const lRate = new Decimal(input.labourRate ?? 0);
  const lTotal = lQty.mul(lRate).toDecimalPlaces(2);

  const other = new Decimal(input.otherCharges ?? 0).toDecimalPlaces(2);
  const itemTotal = mTotal.plus(lTotal).plus(other).toDecimalPlaces(2);

  return {
    materialQty: mQty,
    materialRate: mRate,
    materialTotal: mTotal,
    labourQty: lQty,
    labourRate: lRate,
    labourTotal: lTotal,
    otherCharges: other,
    itemTotal,
  };
}

/**
 * Computes the aggregate estimate summary:
 * 1. Sum of material, labour, other = subtotalCost
 * 2. Wastage = wastagePercent% of totalMaterialCost
 * 3. Base cost with wastage = subtotalCost + wastageAmount
 * 4. Overhead = overheadPercent% of (subtotalCost + wastageAmount)
 * 5. Profit Margin = profitMarginPercent% of (base cost + overhead)
 * 6. Net before discount = base cost + overhead + profit
 * 7. Discount = discountPercent% of net
 * 8. Taxable Amount = net - discount
 * 9. Tax = taxPercent% of Taxable Amount
 * 10. Grand Total = Taxable Amount + Tax
 */
export function calculateEstimateSummary(
  input: EstimateSummaryCalculationInput,
): EstimateSummaryCalculationResult {
  let totalMaterial = new Decimal(0);
  let totalLabour = new Decimal(0);
  let totalOther = new Decimal(0);

  for (const item of input.items) {
    totalMaterial = totalMaterial.plus(item.materialTotal);
    totalLabour = totalLabour.plus(item.labourTotal);
    totalOther = totalOther.plus(item.otherCharges);
  }

  totalMaterial = totalMaterial.toDecimalPlaces(2);
  totalLabour = totalLabour.toDecimalPlaces(2);
  totalOther = totalOther.toDecimalPlaces(2);
  const subtotalCost = totalMaterial.plus(totalLabour).plus(totalOther).toDecimalPlaces(2);

  const wastagePct = new Decimal(input.wastagePercent ?? 0);
  const wastageAmount = totalMaterial.mul(wastagePct.div(100)).toDecimalPlaces(2);

  const costWithWastage = subtotalCost.plus(wastageAmount);

  const overheadPct = new Decimal(input.overheadPercent ?? 0);
  const overheadAmount = costWithWastage.mul(overheadPct.div(100)).toDecimalPlaces(2);

  const costWithOverhead = costWithWastage.plus(overheadAmount);

  const profitPct = new Decimal(input.profitMarginPercent ?? 0);
  const profitMarginAmount = costWithOverhead.mul(profitPct.div(100)).toDecimalPlaces(2);

  const netBeforeDiscount = costWithOverhead.plus(profitMarginAmount);

  const discountPct = new Decimal(input.discountPercent ?? 0);
  const discountAmount = netBeforeDiscount.mul(discountPct.div(100)).toDecimalPlaces(2);

  const netAfterDiscount = netBeforeDiscount.minus(discountAmount);
  const taxableAmount = (netAfterDiscount.isNegative() ? new Decimal(0) : netAfterDiscount).toDecimalPlaces(2);

  const taxPct = new Decimal(input.taxPercent ?? 18);
  const taxAmount = taxableAmount.mul(taxPct.div(100)).toDecimalPlaces(2);

  const grandTotal = taxableAmount.plus(taxAmount).toDecimalPlaces(2);

  return {
    totalMaterialCost: totalMaterial,
    totalLabourCost: totalLabour,
    totalOtherCharges: totalOther,
    subtotalCost,
    wastagePercent: wastagePct,
    wastageAmount,
    overheadPercent: overheadPct,
    overheadAmount,
    profitMarginPercent: profitPct,
    profitMarginAmount,
    discountPercent: discountPct,
    discountAmount,
    taxPercent: taxPct,
    taxAmount,
    grandTotal,
  };
}

export const calculateBoqSummary = (
  sectionsOrItems: any,
  options: Omit<EstimateSummaryCalculationInput, 'items'>,
): EstimateSummaryCalculationResult => {
  let itemsList: BoqItemCalculationResult[] = [];
  if (Array.isArray(sectionsOrItems)) {
    if (sectionsOrItems.length > 0 && 'items' in sectionsOrItems[0]) {
      for (const sec of sectionsOrItems) {
        if (Array.isArray(sec.items)) {
          for (const item of sec.items) {
            itemsList.push(
              calculateBoqItem({
                materialQty: item.materialQuantity ?? item.materialQty,
                materialRate: item.materialRate,
                labourQty: item.labourQuantity ?? item.labourQty,
                labourRate: item.labourRate,
                otherCharges: item.otherRate ?? item.otherCharges,
              }),
            );
          }
        }
      }
    } else {
      itemsList = sectionsOrItems.map((i) =>
        calculateBoqItem({
          materialQty: i.materialQuantity ?? i.materialQty,
          materialRate: i.materialRate,
          labourQty: i.labourQuantity ?? i.labourQty,
          labourRate: i.labourRate,
          otherCharges: i.otherRate ?? i.otherCharges,
        }),
      );
    }
  }

  return calculateEstimateSummary({
    items: itemsList,
    ...options,
  });
};
