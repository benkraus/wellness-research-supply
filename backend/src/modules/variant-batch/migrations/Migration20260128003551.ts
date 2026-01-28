import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260128003551 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "variant_batch" ("id" text not null, "variant_id" text not null, "lot_number" text not null, "coa_file_key" text null, "quantity" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_batch_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_batch_deleted_at" ON "variant_batch" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "variant_batch_allocation" ("id" text not null, "variant_batch_id" text not null, "order_line_item_id" text not null, "quantity" integer not null default 1, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_batch_allocation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_batch_allocation_deleted_at" ON "variant_batch_allocation" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "variant_batch" cascade;`);

    this.addSql(`drop table if exists "variant_batch_allocation" cascade;`);
  }

}
