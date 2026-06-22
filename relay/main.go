package main

import (
	"context"
	"log"
	"net/http"

	"github.com/fiatjaf/eventstore/sqlite3"
	"github.com/fiatjaf/khatru"
	"github.com/nbd-wtf/go-nostr"
)

func main() {
	relay := khatru.NewRelay()

	relay.Info.Name = "Local TutorHub Relay"
	relay.Info.Description = "SQLite relay for local development. Accepts all custom kinds."
	relay.Info.PubKey = "19c939a1873ba8c482af5040ef20c842ff52a319f09e1a3dcb0769353095de15"
	relay.Info.Contact = "dev@tutorhub.local"
	relay.Info.AddSupportedNIPs([]int{1, 9, 11, 12, 15, 16, 20, 22, 40})

	db := &sqlite3.SQLite3Backend{DatabaseURL: "tutorhub.db"}
	if err := db.Init(); err != nil {
		panic(err)
	}

	relay.StoreEvent = append(relay.StoreEvent, db.SaveEvent)
	relay.QueryEvents = append(relay.QueryEvents, db.QueryEvents)
	relay.DeleteEvent = append(relay.DeleteEvent, db.DeleteEvent)
	relay.ReplaceEvent = append(relay.ReplaceEvent, db.ReplaceEvent)

	// Log all saved events
	relay.OnEventSaved = append(relay.OnEventSaved, func(ctx context.Context, event *nostr.Event) {
		preview := event.Content
		if len(preview) > 80 {
			preview = preview[:80] + "..."
		}
		log.Printf("[STORE] kind=%-5d id=%s pubkey=%s content=%q",
			event.Kind, event.ID[:12], event.PubKey[:12], preview)
	})

	// Log all queries
	relay.QueryEvents = append(relay.QueryEvents, func(ctx context.Context, filter nostr.Filter) (chan *nostr.Event, error) {
		log.Printf("[QUERY] %+v", filter)
		return db.QueryEvents(ctx, filter)
	})

	log.Println("Khatru relay starting on :5555...")
	if err := http.ListenAndServe(":5555", relay); err != nil {
		log.Fatal(err)
	}
}
