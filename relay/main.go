package main

import (
	"context"
	"log"
	"net/http"

	"github.com/fiatjaf/eventstore/slicestore"
	"github.com/fiatjaf/khatru"
	"github.com/nbd-wtf/go-nostr"
)

func main() {
	relay := khatru.NewRelay()

	relay.Info.Name = "Local Tutorstr Relay"
	relay.Info.Description = "In-memory relay for local development. Accepts all custom kinds."
	relay.Info.PubKey = ""
	relay.Info.Contact = ""
	relay.Info.AddSupportedNIPs([]int{1, 9, 11, 12, 15, 16, 20, 22, 40})

	store := &slicestore.SliceStore{}

	relay.StoreEvent = append(relay.StoreEvent, store.SaveEvent)
	relay.QueryEvents = append(relay.QueryEvents, store.QueryEvents)
	relay.DeleteEvent = append(relay.DeleteEvent, store.DeleteEvent)
	relay.ReplaceEvent = append(relay.ReplaceEvent, store.ReplaceEvent)

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
		return store.QueryEvents(ctx, filter)
	})

	log.Println("Khatru relay starting on :5555...")
	if err := http.ListenAndServe(":5555", relay); err != nil {
		log.Fatal(err)
	}
}
