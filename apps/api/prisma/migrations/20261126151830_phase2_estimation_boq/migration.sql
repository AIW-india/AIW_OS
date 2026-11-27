-- CreateTable
CREATE TABLE "material_categories" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "category_id" UUID,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "standard_rate" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "vendor_rate" DECIMAL(18,2),
    "preferred_vendor" TEXT,
    "hsn_code" TEXT,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_rate_history" (
    "id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "vendor_rate" DECIMAL(18,2),
    "changed_by_user_id" UUID,
    "reason" TEXT,
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_rate_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_categories" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "labour_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_rates" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "category_id" UUID,
    "work_description" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "standard_rate" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "labour_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_rate_history" (
    "id" UUID NOT NULL,
    "labour_rate_id" UUID NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "changed_by_user_id" UUID,
    "reason" TEXT,
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labour_rate_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_templates" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "project_category" TEXT NOT NULL,
    "description" TEXT,
    "template_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "boq_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimates" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "estimate_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "project_category" TEXT NOT NULL,
    "project_location" TEXT,
    "lead_id" UUID,
    "customer_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "revision_number" INTEGER NOT NULL DEFAULT 1,
    "parent_estimate_id" UUID,
    "total_material_cost" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "total_labour_cost" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "total_other_charges" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "subtotal_cost" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "wastage_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "wastage_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "overhead_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "overhead_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "profit_margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "profit_margin_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_sections" (
    "id" UUID NOT NULL,
    "estimate_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "boq_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_items" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "material_id" UUID,
    "material_qty" DECIMAL(18,4) NOT NULL DEFAULT 0.00,
    "material_unit" TEXT,
    "material_rate" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "material_total" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "labour_rate_id" UUID,
    "labour_qty" DECIMAL(18,4) NOT NULL DEFAULT 0.00,
    "labour_unit" TEXT,
    "labour_rate" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "labour_total" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "other_charges" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "item_total" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "boq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "quotation_number" TEXT NOT NULL,
    "revision_number" INTEGER NOT NULL DEFAULT 1,
    "estimate_id" UUID NOT NULL,
    "customer_id" UUID,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "valid_until" TIMESTAMPTZ(6),
    "terms_and_conditions" TEXT,
    "payment_schedule" JSONB,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dispatched_at" TIMESTAMPTZ(6),
    "dispatched_to" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_approvals" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "approver_user_id" UUID,
    "decision" TEXT NOT NULL,
    "comments" TEXT,
    "decided_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_categories_organisation_id_idx" ON "material_categories"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_categories_organisation_id_name_parent_id_key" ON "material_categories"("organisation_id", "name", "parent_id");

-- CreateIndex
CREATE INDEX "materials_organisation_id_status_idx" ON "materials"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "materials_organisation_id_name_idx" ON "materials"("organisation_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "materials_organisation_id_sku_key" ON "materials"("organisation_id", "sku");

-- CreateIndex
CREATE INDEX "material_rate_history_material_id_effective_from_idx" ON "material_rate_history"("material_id", "effective_from");

-- CreateIndex
CREATE INDEX "labour_categories_organisation_id_idx" ON "labour_categories"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "labour_categories_organisation_id_name_key" ON "labour_categories"("organisation_id", "name");

-- CreateIndex
CREATE INDEX "labour_rates_organisation_id_status_idx" ON "labour_rates"("organisation_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "labour_rates_organisation_id_code_key" ON "labour_rates"("organisation_id", "code");

-- CreateIndex
CREATE INDEX "labour_rate_history_labour_rate_id_effective_from_idx" ON "labour_rate_history"("labour_rate_id", "effective_from");

-- CreateIndex
CREATE INDEX "boq_templates_organisation_id_project_category_idx" ON "boq_templates"("organisation_id", "project_category");

-- CreateIndex
CREATE INDEX "estimates_organisation_id_status_idx" ON "estimates"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "estimates_lead_id_idx" ON "estimates"("lead_id");

-- CreateIndex
CREATE INDEX "estimates_customer_id_idx" ON "estimates"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "estimates_organisation_id_estimate_number_revision_number_key" ON "estimates"("organisation_id", "estimate_number", "revision_number");

-- CreateIndex
CREATE INDEX "boq_sections_estimate_id_order_index_idx" ON "boq_sections"("estimate_id", "order_index");

-- CreateIndex
CREATE INDEX "boq_items_section_id_order_index_idx" ON "boq_items"("section_id", "order_index");

-- CreateIndex
CREATE INDEX "quotations_organisation_id_status_idx" ON "quotations"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "quotations_estimate_id_idx" ON "quotations"("estimate_id");

-- CreateIndex
CREATE INDEX "quotations_customer_id_idx" ON "quotations"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_organisation_id_quotation_number_revision_number_key" ON "quotations"("organisation_id", "quotation_number", "revision_number");

-- CreateIndex
CREATE INDEX "quotation_approvals_quotation_id_decided_at_idx" ON "quotation_approvals"("quotation_id", "decided_at");

-- AddForeignKey
ALTER TABLE "material_categories" ADD CONSTRAINT "material_categories_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_categories" ADD CONSTRAINT "material_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "material_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "material_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_rate_history" ADD CONSTRAINT "material_rate_history_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_categories" ADD CONSTRAINT "labour_categories_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_rates" ADD CONSTRAINT "labour_rates_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_rates" ADD CONSTRAINT "labour_rates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "labour_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_rate_history" ADD CONSTRAINT "labour_rate_history_labour_rate_id_fkey" FOREIGN KEY ("labour_rate_id") REFERENCES "labour_rates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_templates" ADD CONSTRAINT "boq_templates_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_parent_estimate_id_fkey" FOREIGN KEY ("parent_estimate_id") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_sections" ADD CONSTRAINT "boq_sections_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "boq_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_labour_rate_id_fkey" FOREIGN KEY ("labour_rate_id") REFERENCES "labour_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
