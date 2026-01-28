import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260128193000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "variant_batch" add column if not exists "received_at" timestamptz null;`);
    this.addSql(`alter table "variant_batch" add column if not exists "invoice_url" text null;`);
    this.addSql(`alter table "variant_batch" add column if not exists "lab_invoice_url" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "variant_batch" drop column if exists "received_at";`);
    this.addSql(`alter table "variant_batch" drop column if exists "invoice_url";`);
    this.addSql(`alter table "variant_batch" drop column if exists "lab_invoice_url";`);
  }
}
