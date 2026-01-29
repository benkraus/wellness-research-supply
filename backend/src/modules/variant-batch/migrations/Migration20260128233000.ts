import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260128233000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "variant_batch" add column if not exists "supplier_cost_per_vial" numeric null;`
    );
    this.addSql(`alter table "variant_batch" add column if not exists "testing_cost" numeric null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "variant_batch" drop column if exists "supplier_cost_per_vial";`);
    this.addSql(`alter table "variant_batch" drop column if exists "testing_cost";`);
  }
}
