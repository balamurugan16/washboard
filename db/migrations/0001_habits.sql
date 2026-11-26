CREATE TABLE "habit_check_in" (
	"period_id" integer NOT NULL,
	"date" date NOT NULL,
	"habit_index" integer NOT NULL,
	"completed" boolean NOT NULL,
	CONSTRAINT "habit_check_in_period_id_date_habit_index_pk" PRIMARY KEY("period_id","date","habit_index"),
	CONSTRAINT "habit_check_in_index_check" CHECK ("habit_check_in"."habit_index" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "habit_period" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "habit_period_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"habits" text[] NOT NULL,
	CONSTRAINT "habit_period_dates_check" CHECK ("habit_period"."start_date" <= "habit_period"."end_date"),
	CONSTRAINT "habit_period_habit_count_check" CHECK (cardinality("habit_period"."habits") BETWEEN 1 AND 10)
);
--> statement-breakpoint
ALTER TABLE "habit_check_in" ADD CONSTRAINT "habit_check_in_period_id_habit_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."habit_period"("id") ON DELETE no action ON UPDATE no action;