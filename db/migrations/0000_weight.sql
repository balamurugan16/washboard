-- Databases using the original runner already have this schema.
DO $migration$
BEGIN
  IF to_regclass('washboard_migrations') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM washboard_migrations WHERE filename = '001_create_weight.sql') THEN
      IF to_regclass('weight') IS NULL THEN
        RAISE EXCEPTION 'The legacy weight migration is recorded, but the weight table is missing';
      END IF;
      RETURN;
    END IF;
  END IF;

  CREATE TABLE "weight" (
  	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "weight_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
  	"weight" numeric(7, 3) NOT NULL,
  	"units" text DEFAULT 'kg' NOT NULL,
  	CONSTRAINT "weight_weight_check" CHECK ("weight"."weight" > 0 AND "weight"."weight" <= 9999),
  	CONSTRAINT "weight_units_check" CHECK ("weight"."units" IN ('kg', 'lb'))
  );
  CREATE INDEX "weight_recorded_at_idx" ON "weight" USING btree ("recorded_at" DESC NULLS LAST,"id" DESC NULLS LAST);
END
$migration$;
