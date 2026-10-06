// Command payouts lists pending promo-code commissions per owner and marks
// them as paid out once you have paid them manually.
//
// Step 1 - list what is owed (prints a cutoff timestamp at the top):
//
//	go run ./cmd/payouts
//
// Step 2 - after paying, mark exactly what you saw as paid, using the cutoff
// that was printed (redemptions created after it are left untouched):
//
//	go run ./cmd/payouts -mark -before 2026-10-05T12:00:00Z
//
// Optionally limit either step to one promo code:
//
//	go run ./cmd/payouts -code ABC1234
//	go run ./cmd/payouts -mark -before 2026-10-05T12:00:00Z -code ABC1234
package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/deshawn/uniready-api/internal/config"
	"github.com/deshawn/uniready-api/internal/database"
)

type owed struct {
	code  string
	name  string
	phone string
	email string
	count int64
	kobo  int64
}

func naira(kobo int64) string {
	return fmt.Sprintf("NGN %d.%02d", kobo/100, kobo%100)
}

func orDash(s string) string {
	if s == "" {
		return "-"
	}
	return s
}

func main() {
	before := flag.String("before", "", "cutoff timestamp, RFC3339 UTC (required with -mark; defaults to now when listing)")
	code := flag.String("code", "", "limit to a single promo code")
	mark := flag.Bool("mark", false, "mark the matching commissions as paid out")
	flag.Parse()

	var cutoff time.Time
	if *before == "" {
		if *mark {
			log.Fatal("-mark requires -before <cutoff> (copy it from the list output)")
		}
		cutoff = time.Now().UTC().Truncate(time.Second)
	} else {
		t, err := time.Parse(time.RFC3339, *before)
		if err != nil {
			log.Fatalf("invalid -before value (use e.g. 2026-10-05T12:00:00Z): %v", err)
		}
		cutoff = t.UTC()
	}
	filter := strings.ToUpper(strings.TrimSpace(*code))

	cfg := config.Load()
	ctx := context.Background()

	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	rows, err := db.Query(ctx, `
		SELECT pc.code,
		       COALESCE(u.full_name, ''),
		       COALESCE(u.phone_number, ''),
		       COALESCE(u.email, ''),
		       COUNT(*),
		       SUM(r.commission_amount_kobo)::bigint
		FROM promo_redemptions r
		JOIN promo_codes pc ON pc.id = r.promo_code_id
		JOIN users u ON u.id = pc.owner_id
		WHERE r.paid_out_at IS NULL
		  AND r.created_at <= $1
		  AND ($2::text = '' OR pc.code = $2::text)
		GROUP BY pc.code, u.full_name, u.phone_number, u.email
		ORDER BY SUM(r.commission_amount_kobo) DESC
	`, cutoff, filter)
	if err != nil {
		log.Fatalf("query failed: %v", err)
	}

	var list []owed
	for rows.Next() {
		var o owed
		if err := rows.Scan(&o.code, &o.name, &o.phone, &o.email, &o.count, &o.kobo); err != nil {
			rows.Close()
			log.Fatalf("scan failed: %v", err)
		}
		list = append(list, o)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		log.Fatalf("read failed: %v", err)
	}

	fmt.Printf("Pending commissions up to %s\n", cutoff.Format(time.RFC3339))
	if filter != "" {
		fmt.Printf("Filtered to code: %s\n", filter)
	}
	fmt.Println(strings.Repeat("-", 72))

	if len(list) == 0 {
		fmt.Println("Nothing pending.")
		return
	}

	var totalKobo, totalCount int64
	for _, o := range list {
		fmt.Printf("%-8s %-24s %s\n", o.code, orDash(o.name), naira(o.kobo))
		fmt.Printf("         phone: %s  email: %s  (%d paid uses)\n", orDash(o.phone), orDash(o.email), o.count)
		totalKobo += o.kobo
		totalCount += o.count
	}
	fmt.Println(strings.Repeat("-", 72))
	fmt.Printf("TOTAL: %s across %d redemptions, %d owners\n", naira(totalKobo), totalCount, len(list))

	if !*mark {
		fmt.Printf("\nAfter paying, mark these as paid with:\n  go run ./cmd/payouts -mark -before %s", cutoff.Format(time.RFC3339))
		if filter != "" {
			fmt.Printf(" -code %s", filter)
		}
		fmt.Println()
		return
	}

	fmt.Print("\nType PAID to mark the above as paid out (anything else cancels): ")
	answer, _ := bufio.NewReader(os.Stdin).ReadString('\n')
	if strings.TrimSpace(answer) != "PAID" {
		fmt.Println("Cancelled. Nothing was changed.")
		return
	}

	tag, err := db.Exec(ctx, `
		UPDATE promo_redemptions
		SET paid_out_at = now()
		WHERE paid_out_at IS NULL
		  AND created_at <= $1
		  AND ($2::text = '' OR promo_code_id IN (SELECT id FROM promo_codes WHERE code = $2::text))
	`, cutoff, filter)
	if err != nil {
		log.Fatalf("failed to mark payouts: %v", err)
	}

	fmt.Printf("Marked %d redemptions as paid out.\n", tag.RowsAffected())
	if tag.RowsAffected() != totalCount {
		fmt.Printf("Note: expected %d - something changed between listing and marking; re-run the list to check.\n", totalCount)
	}
}