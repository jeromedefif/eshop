-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."products" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_priority" INTEGER NOT NULL DEFAULT 0,
    "min_order_qty" INTEGER NOT NULL DEFAULT 1,
    "allowed_volumes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "product_color" TEXT,
    "sweetness" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcements" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'info',
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(6),
    "target_category" TEXT,
    "target_product_id" BIGINT,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcement_products" (
    "announcement_id" UUID NOT NULL,
    "product_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_products_pkey" PRIMARY KEY ("announcement_id","product_id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    "customer_company" TEXT,
    "customer_company_id" TEXT,
    "customer_vat_id" TEXT,
    "billing_address" TEXT,
    "billing_city" TEXT,
    "billing_postal_code" TEXT,
    "billing_country" TEXT,
    "shipping_company" TEXT,
    "shipping_contact_name" TEXT,
    "shipping_address" TEXT,
    "shipping_city" TEXT,
    "shipping_postal_code" TEXT,
    "shipping_country" TEXT,
    "delivery_instructions" TEXT,
    "total_volume" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_internal_notes" (
    "order_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_internal_notes_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "public"."order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "volume" TEXT NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."profiles" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "company_id" TEXT,
    "vat_id" TEXT,
    "billing_address" TEXT,
    "billing_city" TEXT,
    "billing_postal_code" TEXT,
    "billing_country" TEXT DEFAULT 'Česká republika',
    "shipping_same_as_billing" BOOLEAN NOT NULL DEFAULT true,
    "shipping_company" TEXT,
    "shipping_contact_name" TEXT,
    "shipping_address" TEXT,
    "shipping_city" TEXT,
    "shipping_postal_code" TEXT,
    "shipping_country" TEXT DEFAULT 'Česká republika',
    "delivery_instructions" TEXT,
    "show_ordering_help" BOOLEAN NOT NULL DEFAULT true,
    "catalog_guide_version" INTEGER NOT NULL DEFAULT 0,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "admin_registration_notification_status" TEXT NOT NULL DEFAULT 'pending',
    "admin_registration_notification_attempts" INTEGER NOT NULL DEFAULT 0,
    "admin_registration_notification_claimed_at" TIMESTAMPTZ(6),
    "admin_registration_notified_at" TIMESTAMPTZ(6),
    "admin_registration_notification_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."favorite_products" (
    "user_id" UUID NOT NULL,
    "product_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_products_pkey" PRIMARY KEY ("user_id","product_id")
);

-- CreateTable
CREATE TABLE "public"."saved_order_templates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_order_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."saved_order_template_items" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" BIGINT NOT NULL,
    "volume" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_order_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_carts" (
    "user_id" UUID NOT NULL,
    "items" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_carts_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "event_name" TEXT NOT NULL,
    "actor_key" TEXT NOT NULL,
    "session_id" UUID NOT NULL,
    "journey_id" UUID NOT NULL,
    "device_type" TEXT NOT NULL DEFAULT 'unknown',
    "source" TEXT,
    "item_count" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."users" (
    "id" UUID NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_active_window_idx" ON "public"."announcements"("is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "announcement_products_product_id_idx" ON "public"."announcement_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "public"."profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "saved_order_templates_id_user_id_key" ON "public"."saved_order_templates"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_order_template_items_template_id_product_id_volume_key" ON "public"."saved_order_template_items"("template_id", "product_id", "volume");

-- CreateIndex
CREATE INDEX "analytics_events_created_at_idx" ON "public"."analytics_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_event_created_idx" ON "public"."analytics_events"("event_name", "created_at" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_actor_created_idx" ON "public"."analytics_events"("actor_key", "created_at" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_journey_created_idx" ON "public"."analytics_events"("journey_id", "created_at");

-- AddForeignKey
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_target_product_id_fkey" FOREIGN KEY ("target_product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcement_products" ADD CONSTRAINT "announcement_products_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcement_products" ADD CONSTRAINT "announcement_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_internal_notes" ADD CONSTRAINT "order_internal_notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorite_products" ADD CONSTRAINT "favorite_products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorite_products" ADD CONSTRAINT "favorite_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_order_templates" ADD CONSTRAINT "saved_order_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_order_template_items" ADD CONSTRAINT "saved_order_template_items_template_id_user_id_fkey" FOREIGN KEY ("template_id", "user_id") REFERENCES "public"."saved_order_templates"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_order_template_items" ADD CONSTRAINT "saved_order_template_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_order_template_items" ADD CONSTRAINT "saved_order_template_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_carts" ADD CONSTRAINT "customer_carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

