# Seasonal ideas and confirmed events

This model keeps YMG Events’ venue-partnership ideas separate from public event listings. The six format cards on the home page are proposals to develop with a partner; they do not represent booked events. The site has no public event inventory today.

## Content types

| Type | What it means | Public content and call to action |
| --- | --- | --- |
| `seasonal_concept` | A proposed format or seasonal angle that YMG and a venue could explore. No event has been agreed. | Publish only after Dante approves the idea and its English and Italian copy. Label it as an idea. Link to the existing enquiry form. Do not show a date, booked venue, price, availability, ticket link, or countdown. |
| `scheduled_event` | A specific event that has been confirmed with the responsible organizer and venue. | Publish only after every displayed fact and the booking destination have been checked against current primary sources. Link ticket buyers to the organizer’s or ticket provider’s page. |

Do not render an Upcoming Events heading or an empty event block when there are no publishable `scheduled_event` records. Do not add a calendar database, ticketing service, automatic feed, or countdown for this model.

## Approval and status

### Seasonal concepts

`draft → approved → published → expired` (or `withdrawn`).

- Drafts and private planning notes stay outside this public repository.
- Dante David is the editorial owner and final approver. Approval confirms that the idea is suitable to present, not that a venue or event is booked.
- Each published concept needs `reviewed_on` and `expires_on`. Set an expiry when it is published; review it before that date and either refresh it with a new expiry or remove it.
- On expiry or withdrawal, remove the idea from public pages and language variants. Do not leave stale content live or imply that it rolled into a real booking.
- An enquiry is only an enquiry. It does not change the concept’s status or create an event listing.

### Scheduled events

`draft → hold → confirmed → published → completed` (or `cancelled`).

- `draft` and `hold` are private and must never appear as public listings.
- Move an event to `confirmed` only after the organizer/venue commitment, date, time, public venue details, and commercial terms needed for publication have been verified. Record the verification date and source.
- Before publication, check every visible claim and test the exact external booking link. Include a price only when the amount, currency, and inclusions are confirmed; label a free event only when the organizer confirms it is free.
- Do not copy changing ticket availability onto the Events site. The linked organizer or ticket provider remains the source of truth for sales and availability.
- Recheck details before each material update. If cancelled, unpublish promptly and replace the listing with an accurate cancellation notice only when the owner approves one. Remove completed listings after the event; keep them out of future-event views.
- A date, venue, price, or booking URL may not be inferred from an idea, enquiry, draft, or tentative hold.

The blank [record template](RECORD-TEMPLATE.md) defines the fields to collect. Do not commit completed drafts, negotiation details, personal information, or unapproved venue/client names to this public repository.

## Calendar and links

Reuse the existing [Porto Aperto Genova calendar](https://portoaperto.ymgconsultingservices.com/genova) only when a real public event fits that community calendar’s scope and Dante chooses to submit or link it there. Recheck the destination before use because the calendar project tracks its canonical URL separately (Private-community-calendar issue #36). It is a community event-discovery calendar, not YMG Events’ ticket inventory; do not imply that every YMG Events event appears there.

Do not build a second calendar or automatically sync Events content. For a confirmed event that does not belong in the Porto Aperto calendar, link to the verified organizer or ticket provider. The linked primary page owns current ticket availability and booking terms.

## Locale behavior

- Keep one record identity and maintain equivalent English (`en`) and Italian (`it`) public copy.
- Publish a record in a language only when that language’s copy is approved. Hide it from the language whose copy is missing; do not machine-translate at render time or silently show the other language as if localized.
- Keep the same verified event facts in both languages. Display dates and times in the `Europe/Rome` time zone, with the zone stated where needed to avoid ambiguity. Preserve the organizer’s exact currency and terms.
- Point each language’s call to action to the corresponding localized page when the primary provider offers one; otherwise, the external link may lead to its source-language page.

## Owner’s publication checklist

Before publishing, confirm the content type and status, owner approval, English/Italian copy, public source links, and review/expiry dates. For a scheduled event, additionally verify the commitment and every displayed logistical or commercial fact. If any required fact or destination cannot be verified, keep the event private and publish no ticket or availability claim.
