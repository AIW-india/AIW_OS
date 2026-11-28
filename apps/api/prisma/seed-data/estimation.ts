import { prisma } from '../../src/database/prisma.js';
import { calculateBoqItem, calculateEstimateSummary } from '../../src/modules/estimation/estimation-calculator.js';
import type { SeedOrgContext } from './organisation.js';
import type { SeedCrmResult } from './crm.js';

export interface SeedEstimationResult {
  estimatesByCode: Record<string, string>;
  materialIds: string[];
  labourIds: string[];
}

const DEMO_MATERIALS = [
  { skuCode: 'MAT-CEM-001', category: 'Cement & Concrete', subcategory: 'OPC 53 Grade', name: 'UltraTech OPC 53 Grade Cement (50kg)', unit: 'BAG', standardRate: 410 },
  { skuCode: 'MAT-CEM-002', category: 'Cement & Concrete', subcategory: 'PPC', name: 'ACC Suraksha PPC Cement (50kg)', unit: 'BAG', standardRate: 390 },
  { skuCode: 'MAT-STL-001', category: 'Steel & Reinforcement', subcategory: 'TMT Bars', name: 'JSW Neosteel Fe550D TMT Bar 12mm', unit: 'KG', standardRate: 72 },
  { skuCode: 'MAT-STL-002', category: 'Steel & Reinforcement', subcategory: 'TMT Bars', name: 'Tata Tiscon Fe550D TMT Bar 16mm', unit: 'KG', standardRate: 74 },
  { skuCode: 'MAT-SND-001', category: 'Aggregates & Sand', subcategory: 'M-Sand', name: 'Washed M-Sand (Plastering Grade)', unit: 'CFT', standardRate: 62 },
  { skuCode: 'MAT-AGG-001', category: 'Aggregates & Sand', subcategory: 'Jelly', name: '20mm Crushed Stone Aggregate', unit: 'CFT', standardRate: 48 },
  { skuCode: 'MAT-PLY-001', category: 'Wood & Plywood', subcategory: 'BWP Marine Ply', name: 'CenturyPly Sainik 710 BWP 19mm', unit: 'SQFT', standardRate: 135 },
  { skuCode: 'MAT-PLY-002', category: 'Wood & Plywood', subcategory: 'MR Commercial Ply', name: 'Greenply Ecotec MR Grade 12mm', unit: 'SQFT', standardRate: 88 },
  { skuCode: 'MAT-LAM-001', category: 'Laminates & Veneers', subcategory: '1mm Laminate', name: 'Merino Matte Finish Laminate (8x4)', unit: 'SHEET', standardRate: 1850 },
  { skuCode: 'MAT-LAM-002', category: 'Laminates & Veneers', subcategory: 'Acrylic', name: 'High Gloss Acrylic Sheet 1.5mm', unit: 'SHEET', standardRate: 4200 },
  { skuCode: 'MAT-TIL-001', category: 'Tiles & Flooring', subcategory: 'Vitrified', name: 'Kajaria Double Charge Vitrified Tile 800x800', unit: 'SQFT', standardRate: 95 },
  { skuCode: 'MAT-TIL-002', category: 'Tiles & Flooring', subcategory: 'Wooden Flooring', name: 'Pergo Laminated Wooden Flooring 8mm', unit: 'SQFT', standardRate: 185 },
  { skuCode: 'MAT-ELC-001', category: 'Electrical', subcategory: 'Cables & Wires', name: 'Finolex FR-LSH Copper Wire 2.5 sqmm (90m)', unit: 'COIL', standardRate: 2450 },
  { skuCode: 'MAT-ELC-002', category: 'Electrical', subcategory: 'Switches', name: 'Schneider Livia Modular Switch & Socket Set', unit: 'NOS', standardRate: 380 },
  { skuCode: 'MAT-PLM-001', category: 'Plumbing', subcategory: 'CPVC Pipes', name: 'Ashirvad CPVC Pipe 1 Inch (3m)', unit: 'NOS', standardRate: 520 },
  { skuCode: 'MAT-PLM-002', category: 'Plumbing', subcategory: 'Sanitaryware', name: 'Kohler Wall-Hung WC with Concealed Cistern', unit: 'SET', standardRate: 22500 },
  { skuCode: 'MAT-PNT-001', category: 'Paints & Finishes', subcategory: 'Interior Emulsion', name: 'Asian Paints Royale Luxury Emulsion (20L)', unit: 'BUCKET', standardRate: 11800 },
  { skuCode: 'MAT-PNT-002', category: 'Paints & Finishes', subcategory: 'Putty', name: 'Birla White WallCare Putty (40kg)', unit: 'BAG', standardRate: 890 },
  { skuCode: 'MAT-FCG-001', category: 'False Ceiling', subcategory: 'Gypsum Board', name: 'Saint-Gobain Gyproc 12.5mm Gypsum Board', unit: 'SHEET', standardRate: 560 },
  { skuCode: 'MAT-HRD-001', category: 'Hardware & Fittings', subcategory: 'Hinges & Channels', name: 'Hettich Soft-Close Telescopic Channel 20"', unit: 'PAIR', standardRate: 1150 },
];

const DEMO_LABOUR = [
  { category: 'Masonry & Civil', workDescription: 'Brickwork & Plastering Mason Team', unit: 'SQFT', standardRate: 65 },
  { category: 'Carpentry & Joinery', workDescription: 'Modular Wardrobe & Kitchen Fabrication', unit: 'SQFT', standardRate: 320 },
  { category: 'Electrical Works', workDescription: 'Concealed Conduit & Wiring Installation', unit: 'POINT', standardRate: 450 },
  { category: 'Plumbing & Sanitary', workDescription: 'Bathroom CPVC & Sanitary Fixture Fitting', unit: 'POINT', standardRate: 1200 },
  { category: 'Painting & Polishing', workDescription: '2-Coat Putty, Primer & Emulsion Finish', unit: 'SQFT', standardRate: 28 },
  { category: 'False Ceiling', workDescription: 'GI Framing & Gypsum Board Installation', unit: 'SQFT', standardRate: 95 },
  { category: 'Tile & Stone Laying', workDescription: 'Floor & Wall Tile Laying with Epoxy Grout', unit: 'SQFT', standardRate: 75 },
  { category: 'Steel Bar Bending', workDescription: 'RCC Reinforcement Cutting & Binding', unit: 'KG', standardRate: 14 },
  { category: 'Fabrication & Glass', workDescription: 'Aluminium Partition & Toughened Glass Work', unit: 'SQFT', standardRate: 160 },
  { category: 'Deep Cleaning & Handover', workDescription: 'Post-Execution Site Deep Cleaning', unit: 'SQFT', standardRate: 18 },
];

const DEMO_BOQ_TEMPLATES = [
  { name: '3BHK Luxury Interior Standard', projectCategory: 'RESIDENTIAL_INTERIOR' as const, description: 'Standard modular kitchen, wardrobes, false ceiling & painting package' },
  { name: 'Commercial Office Fitout (5000 sqft)', projectCategory: 'COMMERCIAL_INTERIOR' as const, description: 'Workstations, glass partitions, HVAC & acoustic ceiling' },
  { name: 'G+2 Residential Villa Construction', projectCategory: 'RESIDENTIAL_CONSTRUCTION' as const, description: 'RCC frame, masonry, waterproofing, flooring & MEP' },
  { name: 'Apartment Full Renovation', projectCategory: 'RENOVATION' as const, description: 'Demolition, re-tiling, kitchen remodel & electrical upgrade' },
  { name: 'Turnkey Villa End-to-End', projectCategory: 'TURNKEY' as const, description: 'Complete civil construction + luxury interior execution' },
];

export async function seedEstimationData(
  ctx: SeedOrgContext,
  crm: SeedCrmResult,
): Promise<SeedEstimationResult> {
  const orgId = ctx.organisationId;
  const materialIds: string[] = [];
  const labourIds: string[] = [];

  // 1. Materials (20) + Rate History
  const matMap: Record<string, { id: string; rate: number; unit: string; name: string }> = {};
  for (const m of DEMO_MATERIALS) {
    let cat = await prisma.materialCategory.findFirst({
      where: { organisationId: orgId, name: m.category },
    });
    if (!cat) {
      cat = await prisma.materialCategory.create({
        data: { organisationId: orgId, name: m.category },
      });
    }

    let mat = await prisma.material.findFirst({
      where: { organisationId: orgId, sku: m.skuCode },
    });
    if (!mat) {
      mat = await prisma.material.create({
        data: {
          organisationId: orgId,
          sku: m.skuCode,
          categoryId: cat.id,
          name: m.name,
          unit: m.unit,
          standardRate: m.standardRate,
          status: 'ACTIVE',
        },
      });
      await prisma.materialRateHistory.create({
        data: {
          materialId: mat.id,
          rate: m.standardRate,
          changedByUserId: ctx.superAdminUserId,
        },
      });
    }
    materialIds.push(mat.id);
    matMap[m.skuCode] = { id: mat.id, rate: Number(mat.standardRate), unit: mat.unit, name: mat.name };
  }

  // 2. Labour Rates (10)
  const labMap: Record<string, { id: string; rate: number; unit: string; name: string }> = {};
  for (let idx = 0; idx < DEMO_LABOUR.length; idx++) {
    const l = DEMO_LABOUR[idx];
    let labCat = await prisma.labourCategory.findFirst({
      where: { organisationId: orgId, name: l.category },
    });
    if (!labCat) {
      labCat = await prisma.labourCategory.create({
        data: { organisationId: orgId, name: l.category },
      });
    }

    const labCode = `LAB-DEMO-${String(idx + 1).padStart(2, '0')}`;
    let lab = await prisma.labourRate.findFirst({
      where: { organisationId: orgId, code: labCode },
    });
    if (!lab) {
      lab = await prisma.labourRate.create({
        data: {
          organisationId: orgId,
          categoryId: labCat.id,
          code: labCode,
          workDescription: l.workDescription,
          unit: l.unit,
          standardRate: l.standardRate,
          status: 'ACTIVE',
        },
      });
    }
    labourIds.push(lab.id);
    labMap[l.category] = { id: lab.id, rate: Number(lab.standardRate), unit: lab.unit, name: l.workDescription };
  }

  // 3. BOQ Templates (5)
  for (const tmpl of DEMO_BOQ_TEMPLATES) {
    const existing = await prisma.boqTemplate.findFirst({
      where: { organisationId: orgId, name: tmpl.name },
    });
    if (!existing) {
      await prisma.boqTemplate.create({
        data: {
          organisationId: orgId,
          name: tmpl.name,
          projectCategory: tmpl.projectCategory,
          description: tmpl.description,
          templateData: {
            sections: [
              { title: 'Civil & Flooring', items: ['MAT-TIL-001', 'MAT-CEM-001'] },
              { title: 'Woodwork & Joinery', items: ['MAT-PLY-001', 'MAT-LAM-001', 'MAT-HRD-001'] },
              { title: 'Finishing & MEP', items: ['MAT-PNT-001', 'MAT-ELC-001', 'MAT-FCG-001'] },
            ],
          },
          createdByUserId: undefined,
        },
      });
    }
  }

  // 4. Estimates (6)
  const estimateSpecs = [
    {
      estimateNumber: 'EST-DEMO-001',
      title: 'Whitefield Luxury Villa Interior BOQ',
      customerCode: 'CUST-DEMO-001',
      leadCode: 'LD-DEMO-001',
      projectCategory: 'RESIDENTIAL_INTERIOR' as const,
      projectLocation: 'Whitefield, Bengaluru',
      status: 'QUOTED' as const,
      items: [
        { section: 'Woodwork & Modular Joinery', name: 'Master Wardrobe & Kitchen Carcass (BWP Ply)', matKey: 'MAT-PLY-001', labKey: 'Carpentry & Joinery', matQty: 1400, labQty: 1400, wastage: 5 },
        { section: 'Woodwork & Modular Joinery', name: 'Merino Matte Laminate Finish', matKey: 'MAT-LAM-001', labKey: 'Carpentry & Joinery', matQty: 45, labQty: 200, wastage: 5 },
        { section: 'False Ceiling & Painting', name: 'Gyproc False Ceiling & Royale Emulsion', matKey: 'MAT-FCG-001', labKey: 'False Ceiling', matQty: 120, labQty: 1800, wastage: 5 },
      ],
    },
    {
      estimateNumber: 'EST-DEMO-002',
      title: 'Indiranagar Commercial Office Fitout BOQ',
      customerCode: 'CUST-DEMO-002',
      leadCode: 'LD-DEMO-002',
      projectCategory: 'COMMERCIAL_INTERIOR' as const,
      projectLocation: 'Indiranagar, Bengaluru',
      status: 'QUOTED' as const,
      items: [
        { section: 'Flooring & Partitions', name: 'Vitrified Tile Flooring & Acoustic Ceiling', matKey: 'MAT-TIL-001', labKey: 'Tile & Stone Laying', matQty: 4500, labQty: 4500, wastage: 5 },
        { section: 'MEP & Lighting', name: 'Commercial Electrical Cabling & Modular Switches', matKey: 'MAT-ELC-001', labKey: 'Electrical Works', matQty: 30, labQty: 220, wastage: 3 },
      ],
    },
    {
      estimateNumber: 'EST-DEMO-003',
      title: 'Hebbal G+2 Residential Construction BOQ',
      customerCode: 'CUST-DEMO-003',
      leadCode: 'LD-DEMO-003',
      projectCategory: 'RESIDENTIAL_CONSTRUCTION' as const,
      projectLocation: 'Hebbal, Bengaluru',
      status: 'QUOTED' as const,
      items: [
        { section: 'Substructure & RCC', name: 'OPC 53 Grade Cement & Fe550D Steel', matKey: 'MAT-CEM-001', labKey: 'Masonry & Civil', matQty: 1800, labQty: 3200, wastage: 3 },
        { section: 'Substructure & RCC', name: 'TMT Steel Reinforcement 12mm', matKey: 'MAT-STL-001', labKey: 'Steel Bar Bending', matQty: 18500, labQty: 18500, wastage: 4 },
      ],
    },
    {
      estimateNumber: 'EST-DEMO-004',
      title: 'HSR Layout Apartment Renovation BOQ',
      customerCode: 'CUST-DEMO-004',
      leadCode: 'LD-DEMO-004',
      projectCategory: 'RENOVATION' as const,
      projectLocation: 'HSR Layout, Bengaluru',
      status: 'QUOTED' as const,
      items: [
        { section: 'Flooring & Bathroom Remodel', name: 'Wooden Flooring & Sanitaryware Upgrade', matKey: 'MAT-TIL-002', labKey: 'Tile & Stone Laying', matQty: 1100, labQty: 1100, wastage: 5 },
        { section: 'Painting & Finishing', name: 'Putty & Luxury Emulsion', matKey: 'MAT-PNT-001', labKey: 'Painting & Polishing', matQty: 12, labQty: 2400, wastage: 5 },
      ],
    },
    {
      estimateNumber: 'EST-DEMO-005',
      title: 'Sarjapur Road Corporate Renovation BOQ',
      customerCode: 'CUST-DEMO-005',
      leadCode: 'LD-DEMO-005',
      projectCategory: 'RENOVATION' as const,
      projectLocation: 'Sarjapur Road, Bengaluru',
      status: 'APPROVED' as const,
      items: [
        { section: 'Workstation & Ceiling', name: 'Gypsum False Ceiling & Painting', matKey: 'MAT-FCG-001', labKey: 'False Ceiling', matQty: 90, labQty: 2200, wastage: 5 },
      ],
    },
    {
      estimateNumber: 'EST-DEMO-006',
      title: 'Yelahanka Premium Villa Turnkey BOQ',
      customerCode: 'CUST-DEMO-006',
      leadCode: 'LD-DEMO-006',
      projectCategory: 'TURNKEY' as const,
      projectLocation: 'Yelahanka, Bengaluru',
      status: 'DRAFT' as const,
      items: [
        { section: 'Turnkey Civil & Interiors', name: 'Cement, Steel & Premium Interior Package', matKey: 'MAT-CEM-002', labKey: 'Masonry & Civil', matQty: 2200, labQty: 4500, wastage: 4 },
      ],
    },
  ];

  const estimatesByCode: Record<string, string> = {};

  for (const spec of estimateSpecs) {
    let est = await prisma.estimate.findFirst({
      where: { organisationId: orgId, estimateNumber: spec.estimateNumber },
    });

    if (!est) {
      const calcItems = spec.items.map((item) => {
        const mat = matMap[item.matKey];
        const lab = labMap[item.labKey];
        return calculateBoqItem({
          materialQuantity: item.matQty,
          materialRate: mat.rate,
          labourQuantity: item.labQty,
          labourRate: lab.rate,
          otherCharges: 5000,
          wastagePercent: item.wastage,
        });
      });

      const totals = calculateEstimateSummary({
        items: calcItems,
        overheadPercent: 10,
        marginPercent: 15,
        discountAmount: 25000,
        taxPercent: 18,
      });

      est = await prisma.estimate.create({
        data: {
          organisationId: orgId,
          estimateNumber: spec.estimateNumber,
          revisionNumber: 1,
          title: spec.title,
          projectCategory: spec.projectCategory,
          projectLocation: spec.projectLocation,
          customerId: crm.customersByCode[spec.customerCode],
          leadId: crm.leadsByCode[spec.leadCode],
          status: spec.status,
          overheadPercent: 10,
          profitMarginPercent: 15,
          discountAmount: 25000,
          taxPercent: 18,
          subtotalCost: totals.subtotalCost,
          overheadAmount: totals.overheadAmount,
          profitMarginAmount: totals.profitMarginAmount,
          taxAmount: totals.taxAmount,
          grandTotal: totals.grandTotal,
          createdByUserId: undefined,
        },
      });

      const section = await prisma.boqSection.create({
        data: {
          estimateId: est.id,
          title: spec.items[0].section,
          orderIndex: 1,
        },
      });

      for (let i = 0; i < spec.items.length; i++) {
        const item = spec.items[i];
        const mat = matMap[item.matKey];
        const lab = labMap[item.labKey];
        const itemCalc = calcItems[i];

        await prisma.boqItem.create({
          data: {
            sectionId: section.id,
            description: item.name,
            materialId: mat.id,
            materialQty: item.matQty,
            materialUnit: mat.unit,
            materialRate: mat.rate,
            materialTotal: itemCalc.materialTotal,
            labourRateId: lab.id,
            labourQty: item.labQty,
            labourUnit: lab.unit,
            labourRate: lab.rate,
            labourTotal: itemCalc.labourTotal,
            otherCharges: 5000,
            itemTotal: itemCalc.itemTotal,
            orderIndex: i + 1,
          },
        });
      }
    }

    estimatesByCode[spec.estimateNumber] = est.id;
  }

  return { estimatesByCode, materialIds, labourIds };
}
