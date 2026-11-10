# Editorial record template

Use this blank outline in private planning notes. Do not fill it in with unannounced event details or commit a completed draft to the public website repository.

## Seasonal concept

```yaml
type: seasonal_concept
id: ""
status: draft
owner: Dante David
season: ""
created_on: ""
reviewed_on: ""
expires_on: ""
locales:
  en:
    title: ""
    description: ""
    call_to_action: "Discuss this idea"
  it:
    title: ""
    description: ""
    call_to_action: "Parliamo di questa idea"
```

This record is an idea, so it deliberately has no event date, confirmed venue, price, availability, or ticket URL.

## Scheduled event

```yaml
type: scheduled_event
id: ""
status: draft
owner: Dante David
verified_on: ""
verification_sources: []
starts_at: "" # ISO 8601 with offset; display in Europe/Rome
ends_at: "" # optional if not confirmed or not needed publicly
venue:
  public_name: ""
  public_address: ""
price:
  amount: "" # omit unless verified
  currency: "" # ISO 4217; omit unless verified
  inclusions: "" # omit unless verified
booking_url: "" # exact, tested organizer or ticket-provider URL
reviewed_on: ""
expires_on: "" # normally after the event ends
locales:
  en:
    title: ""
    description: ""
  it:
    title: ""
    description: ""
```

Do not populate `booking_url` or price fields before verification. Do not store ticket availability here; readers should get current availability from the linked primary booking page.
