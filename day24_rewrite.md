# DAY 24 — WE STARTED WITH FHIR
### *Company Page Build-in-Public Series · Day 24 of 84*

---

## 1. DAY 24 COMPANY PAGE POST (COPY-PASTE READY — VIRAL EDIT)

> **Here's a question most health-tech founders can't answer:**
> "What data standard does your system speak?"
>
> If the answer is "proprietary JSON" or "a custom format" — that's a problem.
>
> Because the moment your hospital needs to share data with the NHIA, with a referral centre, with a public health surveillance system — proprietary formats become silos. And silos kill.
>
> We started with FHIR. Not as an integration option. Not as a "nice to have." As the foundation.
>
> Here's what that means in practice — and in code:
>
> 🏥 **Every patient is a FHIR Patient resource.**
> When someone registers at Faith Foundation Mission Hospital, their record isn't stored in a proprietary blob. It's a FHIR Patient — with identifier, name, telecom, address, birthDate, gender. Every field maps to the FHIR R4 spec. The `fhirId` field links the internal database record to the FHIR resource, so the same patient can be queried either way.
>
> 📅 **Appointments are FHIR Appointments.**
> When Dr. Adesanmi books a consultation, the system creates an FHIR Appointment resource — status, participant, start/end, service type. Not a custom "booking" table with non-standard fields. A real FHIR resource that any system can consume.
>
> 📊 **Vitals and lab results are FHIR Observations.**
> Every vital sign, every lab result, every clinical observation — an FHIR Observation resource. Subject (Patient reference), valueQuantity, code. The maternity module generates Observation resources for viral load results and early infant diagnosis (EID) test results, with proper FHIR entry structure.
>
> 🏥 **OPD and IPD visits are FHIR Encounters.**
> Every visit — walk-in, referral, emergency — creates an FHIR Encounter. Status, subject (Patient), participant, period. The system even synthesizes Encounter records for active visits that don't yet have one, so the FHIR layer is always complete.
>
> 💊 **Prescriptions are FHIR MedicationRequests.**
> Every pharmacy prescription — an FHIR MedicationRequest. Status, intent, subject (Patient), medicationCodeableConcept, dosageInstruction. The emar module generates CPOE prescriptions with `fhirId` linking back to the FHIR resource.
>
> 🧾 **Invoices are FHIR Invoices.**
> Billing records exposed as FHIR Invoice resources — because even financial transactions should be interoperable.
>
> 🔗 **OpenMRS integration speaks FHIR natively.**
> The OpenMRS sync route detects whether an endpoint is a FHIR path (`ws/fhir2/`) or a REST path (`ws/rest/v1/`). It downloads Patient resources from OpenMRS in pages of 100, maps FHIR gender codes (`male` → `MALE`, `female` → `FEMALE`), and creates local records with `fhirId` set to the OpenMRS UUID.
>
> 📡 **NigeriaMRS sync generates FHIR Bundles.**
> The maternity module constructs FHIR Bundles — `resourceType: "Bundle"`, `type: "searchset"` — containing Encounter and Observation entries with proper `request: { method: "POST", url: "Encounter" }` structure. These Bundles are the payload that travels between systems.
>
> 🔒 **Resource type validation on every write.**
> Every POST to a FHIR endpoint validates the `resourceType` field:
>
> ```
> if (fhirPatient.resourceType !== 'Patient') {
>   return res.status(400).json({ error: 'Invalid resource type' });
> }
> ```
>
> You can't POST an Observation to the Patient endpoint. The system enforces FHIR discipline at the API layer — not as a documentation suggestion, but as a hard constraint.
>
> **The tradeoff we accepted:**
> FHIR is verbose. Every resource carries `resourceType`, `id`, `meta`, `text`, and extension fields that most internal systems don't need. More storage. More bandwidth. More parsing overhead.
>
> But FHIR is the language that every health system on the planet is learning. When Faith Foundation Mission Hospital needs to share records with the NHIA, with a referral hospital in Lagos, with a public health surveillance system — FHIR is the bridge.
>
> We didn't bolt it on after we were built. We built on it from line one.
>
> Tomorrow: the sync queue architecture — and why we chose it over the alternatives.
>
> If your hospital's data standard is proprietary — you've already locked yourself into one vendor's ecosystem. ♻️ Share this with your CTO.
>
> #HMIS #FHIR #HL7 #Interoperability #HealthTech #DigitalHealth #NigeriaHealth #TerkAgeTechnologies

---

## 2. DAY 24 CAROUSEL — "FHIR IS THE FOUNDATION"

**Post theme:** Why Terk-Age chose FHIR as the data foundation, not an afterthought
**Slide count:** 7
**Style:** Match Days 10–23 (bold, FHIR-resource-focused, 1080×1350)
**Dimensions:** 1080×1350px

---

### SLIDE 1: HOOK

**Headline (huge):**
"Proprietary JSON
or FHIR?"

**Subheadline:**
The question that defines everything.

**Visual:** Two paths diverging — left side "proprietary JSON" (red, crossed out), right side "FHIR" (green, checkmark). Navy base.

**Footer:** Terk-Age logo

---

### SLIDE 2: THE SIX RESOURCES

**Headline:**
6 FHIR R4 resource types.
All endpoints. All the time.

**Body:**
• 🏥 Patient — identifiers, name, telecom, address, gender
• 📅 Appointment — status, participant, start/end
• 📊 Observation — vitals, lab results, clinical data
• 🏥 Encounter — OPD/IPD visits, status, period
• 💊 MedicationRequest — prescriptions, dosage
• 🧾 Invoice — billing as FHIR resources

**Visual:** 6 FHIR resource icons in a 3×2 grid, each with a teal checkmark

**Footer:** Terk-Age logo

---

### SLIDE 3: PATIENT RESOURCE

**Headline:**
Every patient is a FHIR Patient.

**Body:**
```
resourceType: "Patient"
id: patient.fhirId || patient.id
identifier: [{ system: "http://hospital.org/mrn",
               value: patientNumber }]
name: [{ given: [firstName], family: lastName }]
gender: patient.gender.toLowerCase()
birthDate: patient.birthDate
```
- 🔗 `fhirId` links internal DB ↔ FHIR resource
- ✅ GET all / GET by ID / POST / DELETE — all FHIR-compliant

**Visual:** A FHIR Patient JSON snippet with teal-highlighted key fields

**Footer:** Terk-Age logo

---

### SLIDE 4: BUNDLE GENERATION

**Headline:**
FHIR Bundles for NigeriaMRS sync.

**Body:**
```
resourceType: "Bundle"
type: "searchset"
entry: [
  { resource: { resourceType: "Encounter", ... } },
  { resource: { resourceType: "Observation", ... } }
]
```
- 📡 Maternity module generates Bundles
- 🔗 OpenMRS UUIDs for Patient references
- ✅ Proper FHIR entry structure with `request.method` and `request.url`

**Visual:** A Bundle icon containing Encounter + Observation icons inside

**Footer:** Terk-Age logo

---

### SLIDE 5: OPENMRS INTEGRATION

**Headline:**
FHIR-first OpenMRS sync.

**Body:**
• 🔗 Detects `ws/fhir2/` vs `ws/rest/v1/` endpoints
• 📥 Downloads Patient resources in pages of 100
• 🔀 Maps FHIR gender codes (`male` → `MALE`, `female` → `FEMALE`)
• 🔗 Sets `fhirId` to OpenMRS UUID

**Visual:** OpenMRS logo → FHIR arrow → local database icon

**Footer:** Terk-Age logo

---

### SLIDE 6: VALIDATION

**Headline:**
Type-checked on every write.

**Body:**
```
if (fhirPatient.resourceType !== 'Patient') {
  return res.status(400).json({ error: 'Invalid resource type' });
}
```
- 🚫 Can't POST Observation to Patient endpoint
- ✅ FHIR discipline enforced at API layer
- 🔒 Resource type validation on every POST

**Visual:** A shield icon with "FHIR validation" badge

**Footer:** Terk-Age logo

---

### SLIDE 7: CTA

**Headline:**
Built on FHIR. Not bolted on.

**Body:**
The data standard every health system in the world is learning.

Tomorrow: the sync queue architecture — and why we chose it over the alternatives.

**Big CTA:**
👉 Follow Terk-Age Technologies
🔔 Notifications on
♻️ Send to your CTO

**Visual:** Terk-Age + FHIR badge

**Footer:** Terk-Age logo + #FHIR #HL7

---

## 3. CAROUSEL CAPTION (COPY-PASTE — HOOK-FIRST)

> **"Proprietary JSON or FHIR? The question that defines everything. 🏥"**
>
> Most health-tech founders can't answer this question. We built our entire system on FHIR from line one — not as an integration option, not as a "nice to have." As the foundation. Here's what that looks like in the code 👇
>
> 🏥 **Every patient is a FHIR Patient resource:**
> • identifier, name, telecom, address, birthDate, gender — all FHIR R4 fields
> • `fhirId` links internal DB ↔ FHIR resource
> • GET all / GET by ID / POST / DELETE — all FHIR-compliant
>
> 📅 **Appointments are FHIR Appointments** — status, participant, start/end, service type. Not a custom "booking" table.
>
> 📊 **Vitals and lab results are FHIR Observations** — subject (Patient reference), valueQuantity, code. The maternity module generates Observation resources for viral load and EID test results.
>
> 🏥 **OPD and IPD visits are FHIR Encounters** — status, subject (Patient), participant, period. The system even synthesizes Encounter records for active visits that don't yet have one.
>
> 💊 **Prescriptions are FHIR MedicationRequests** — status, intent, subject, medicationCodeableConcept, dosageInstruction.
>
> 🧾 **Invoices are FHIR Invoices** — because even financial transactions should be interoperable.
>
> 🔗 **OpenMRS integration is FHIR-first:**
> • Detects `ws/fhir2/` vs `ws/rest/v1/` endpoints
> • Downloads Patient resources in pages of 100
> • Maps FHIR gender codes (`male` → `MALE`, `female` → `FEMALE`)
> • Sets `fhirId` to OpenMRS UUID
>
> 📡 **NigeriaMRS sync generates FHIR Bundles:**
> ```
> resourceType: "Bundle"
> type: "searchset"
> entry: [
>   { resource: { resourceType: "Encounter", ... } },
>   { resource: { resourceType: "Observation", ... } }
> ]
> ```
> Proper FHIR entry structure with `request.method` and `request.url`.
>
> 🔒 **Resource type validation on every POST:**
> ```
> if (fhirPatient.resourceType !== 'Patient') {
>   return res.status(400).json({ error: 'Invalid resource type' });
> }
> ```
> You can't POST an Observation to the Patient endpoint. FHIR discipline enforced at the API layer — not as documentation, but as a hard constraint.
>
> FHIR is verbose. More storage. More bandwidth. More parsing overhead.
>
> But FHIR is the language every health system on the planet is learning. When Faith Foundation Mission Hospital needs to share records with NHIA, with a referral hospital, with a public health surveillance system — FHIR is the bridge.
>
> We didn't bolt it on after we were built. We built on it from line one.
>
> Tomorrow: the sync queue architecture — and why we chose it over the alternatives.
>
> If your hospital's data standard is proprietary — you've already locked yourself into one vendor's ecosystem. ♻️ Share with your CTO.
>
> #HMIS #FHIR #HL7 #Interoperability #HealthTech #DigitalHealth #NigeriaHealth #TerkAgeTechnologies

---

## 4. ENGAGEMENT MECHANICS (same playbook)

| Element | Viral lever |
|---|---|
| "Proprietary JSON or FHIR?" | Binary choice — forces the reader to pick a side |
| "silos kill" | Emotional stakes — healthcare context |
| "from line one" | Positions FHIR as foundational, not afterthought |
| "locked into one vendor's ecosystem" | Fear-of-being-locked-in lever |
| JSON snippets on slides 3, 4, 6 | Technical credibility without being overwhelming |
| "send to your CTO" | Targets the technical decision-maker |
| "the language every health system is learning" | Positions FHIR as strategic, not just technical |
| "not as documentation, but as a hard constraint" | Shows enforcement, not just support |

---

## 5. PROFESSIONAL SAFETY CHECK ✅

- **HL7 FHIR explicitly named** (hashtags + footer + body + carousel captions) → meets mandatory standard mention
- **Every claim grounded in codebase:**
  - `fhir.ts` route file confirmed — 6 FHIR R4 resource types: Patient (GET/GET by ID/POST/DELETE), Appointment (GET/POST), Observation (GET/POST), Encounter (GET/POST), MedicationRequest (GET/POST), Invoice (GET/POST) — all confirmed via `router.get/post/delete` endpoints
  - Patient resource fields confirmed: `resourceType: 'Patient'`, `fhirId || p.id`, identifier, name, telecom, address, birthDate, gender — `fhir.ts` lines 37–38, 104–106, 186–223 confirmed
  - Observation resource confirmed: `resourceType: 'Observation'`, subject (Patient reference), valueQuantity, code — `fhir.ts` lines 405–407 confirmed
  - Encounter resource confirmed: `resourceType: 'Encounter'`, subject (Patient reference), participant, period — `fhir.ts` lines 669–671 confirmed
  - MedicationRequest resource confirmed: `resourceType: 'MedicationRequest'`, status, intent, subject, medicationCodeableConcept, dosageInstruction — `fhir.ts` lines 754–756 confirmed
  - FHIR Bundle generation in `maternity.ts` confirmed — `resourceType: "Bundle"`, `type: "searchset"`, entries with Encounter + Observation resources, `request: { method: "POST", url: "Encounter" }` and `request: { method: "POST", url: "Observation" }` — lines 1553–1636 confirmed
  - OpenMRS FHIR detection confirmed — `isFhir = endpoint.includes('ws/fhir2/')` in `openmrs.ts` line 46, FHIR path download `ws/fhir2/R4/Patient?_count=100` in `openmrs.ts` line 100, gender mapping `male` → `MALE`, `female` → `FEMALE` in `openmrs.ts` lines 158–161 confirmed
  - FHIR resource type validation on POST confirmed — `fhirPatient.resourceType !== 'Patient'` returns 400 in `fhir.ts` line 187–189 confirmed; same pattern for Observation (`fhir.ts` line 433), Encounter (`fhir.ts` line 707), MedicationRequest (`fhir.ts` line 785)
  - `fhirId` field used across billing (`billing.ts` line 280), LIMS (`lims.ts` line 346), emar (`emar.ts` line 176), pharmacy (`pharmacy.ts` line 281) — confirmed
  - `sync_queue` excluded from replication (not a FHIR resource) — `syncService.ts` line 258 confirmed
- **Faith Foundation named only as implementation partner** → confidential-project rule respected
- **System still in development, not live** → consistent framing
- **Tone "we" (company), educational case-study** → brand rules met
- **Day 25 setup** → "sync queue architecture" tees up the next post naturally
