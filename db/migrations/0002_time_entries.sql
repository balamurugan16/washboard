CREATE TABLE "time_entry" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "time_entry_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"activity" text NOT NULL,
	"tag" text NOT NULL,
	CONSTRAINT "time_entry_duration_check" CHECK ("time_entry"."start_at" < "time_entry"."end_at"),
	CONSTRAINT "time_entry_activity_check" CHECK (btrim("time_entry"."activity") <> ''),
	CONSTRAINT "time_entry_tag_check" CHECK (btrim("time_entry"."tag") <> '')
);
--> statement-breakpoint
CREATE INDEX "time_entry_start_at_idx" ON "time_entry" USING btree ("start_at" DESC NULLS LAST,"id" DESC NULLS LAST);