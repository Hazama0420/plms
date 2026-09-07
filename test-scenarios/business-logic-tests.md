# Business Logic Testing - Property Wizard

## AI AUTO-FILL FUNCTIONALITY TESTING

### TEST 1: StepCategory AI Auto-Fill
**Input Test Case**:
`
Input: "Rumah 2 lantai di Jakarta Selatan, 3 kamar tidur 2 kamar mandi, luas tanah 120m2, harga 2 milyar"
Expected Output:
- property_type: "rumah" (detected from "rumah")
- listing_type: "jual" (default)
- property_status: should be detected if status mentioned
- bedroom: "3" (detected from "3 kamar tidur")
- bathroom: "2" (detected from "2 kamar mandi")
- land_area: "120" (detected from "120m2")
- land_unit: "m²" (detected from "m2")
- location_candidate: "Jakarta Selatan" (AI candidate for location)
- selling_price: "2000000000" (2 milyar parsed to number)
`

**Testing Steps**:
1. Open StepCategory
2. Paste raw text in description field
3. Click "Wand2" AI Auto-Fill button
4. Verify each field populates correctly
5. Verify toast notifications
6. Test with different property types

### TEST 2: StepLocation Region Intelligence
**Location Flow Testing**:
1. AI generates location candidate from description
2. User sees suggestion: "Jakarta Selatan [AI Candidate]"
3. Click candidate ? transforms to official region selection
4. Province/City/District/Village populate automatically
5. location_candidate clears after official selection

**Test Cases**:
- "Rumah di Bandung" ? Bandung city/region
- "Villa di Bogor" ? Bogor area
- "Apartemen di Surabaya" ? Surabaya region
- "Tanah di Bali" ? Bali province/region

### TEST 3: StepPriceDescription AI Enhancement
**Price Prediction Testing**:
`
Input Scenarios:
- "Rumah Jakarta 3x5 meter" ? Should predict reasonable price
- "Villa seminyak 4 kamar" ? Should predict based on location + specs
- "Apartemen Jakarta Pusat 2br" ? Should predict based on area type
`

**Description Enhancement**:
- Raw description preservation (no auto-rewrite)
- AI enhancement suggestions appear as optional
- User can accept or reject AI suggestions
- Original text format preserved

## DRAFT SYSTEM TESTING

### TEST 4: Intelligent Draft Detection
**Draft Validity Criteria** (from line 137-142 in CreatePropertyWizard.tsx):
`javascript
if (parsed && typeof parsed === "object" && 
    (parsed.title || parsed.property_type || parsed.region_id || 
     parsed.selling_price || parsed.address)) {
  // Valid draft that warrants restoration banner
}
`

**Test Scenarios**:
1. **Valid Draft**: title exists ? Restoration banner shows
2. **Valid Draft**: property_type exists ? Restoration banner shows  
3. **Valid Draft**: region_id exists ? Restoration banner shows
4. **Valid Draft**: selling_price exists ? Restoration banner shows
5. **Invalid Draft**: empty object ? No banner
6. **Invalid Draft**: only timestamp ? No banner

### TEST 5: Draft Recovery & Cleanup
**Recovery Testing**:
1. Draft restoration merges with existing form data
2. Form updates with: setFormData(prev => ({...prev, ...savedDraft}))
3. Toast success: "Draf properti berhasil dipulihkan!"
4. Banner clears after restoration

**Discard Testing**:
1. localStorage.removeItem("inland_property_draft")
2. Banner disappears immediately
3. Toast info: "Draf sebelumnya telah dibuang."

### TEST 6: Draft Storage Structure
**Storage Key**: inland_property_draft
**Format**: JSON object matching formData structure
**Content Check**: Any of the key fields mentioned above trigger restoration

## AUTHORIZATION & ROLE TESTING

### TEST 7: Create Mode Authorization
**Role Blocking Logic** (lines 36-41 in create/page.tsx):
`javascript
if (role === "viewer" || role === "reviewer") {
  toast.error("Akses Ditolak: Akun Viewer hanya memiliki izin melihat data (Read-Only).");
  router.replace("/properties");
}
`

**Expected Blocks**:
- [ ] Viewer role ? Redirect to /properties
- [ ] Reviewer role ? Redirect to /properties  
- [ ] Agent role ? Access allowed
- [ ] Admin/Super Admin ? Access allowed

### TEST 8: Edit Mode Authorization
**Permission Logic** (lines 57-64 in edit/page.tsx):
`	ypescript
const isAdmin = userRole === "super_admin" || userRole === "admin" || userRole === "superadmin";
const isOwner = userRole === "agent" && (data.created_by === user.id);

if (userRole === "reviewer" || (!isAdmin && !isOwner)) {
  toast.error("Anda tidak memiliki izin untuk mengedit listingan ini.");
  // Redirect logic
}
`

**Expected Results**:
- [ ] Super Admin ? Edit any property
- [ ] Admin ? Edit any property  
- [ ] Superadmin ? Edit any property
- [ ] Agent (Owner) ? Can edit own properties
- [ ] Agent (Non-owner) ? Cannot edit others' properties
- [ ] Reviewer ? Cannot edit any property

## DATA TRANSFORMATION TESTING

### TEST 9: Edit Mode Data Mapping
**Complex Data Transformation** (lines 83-292 in edit/page.tsx):

**Photo Handling**:
`	ypescript
// Multiple photo sources supported:
- data.media (array of media objects)
- data.images (array or JSON string)
- data.image_url (single image)
`

**Address Transformation**:
`	ypescript
// Handles multiple address formats:
- JSON object from address/property_address
- Arrays (takes first element)
- Nested objects with province/city/district names
`

**Specification Mapping**:
`	ypescript
// Supports flat and nested formats:
- data.specifications?.bedroom ? bedroom field
- data.bedroom (flat format)
`

### TEST 10: Form Validation Logic
**Step Validation** (based on score calculation):
- Property type: +10 points
- Listing type: +5 points  
- Property status: +5 points
- Price (selling or rental): +10 points
- Region (hasRegion function): +10 points
- Photos (3+): +20 points, (1-2): +10 points
- Description (50+ chars): +15 points, (20+ chars): +8 points
- Facilities (1+): +10 points
- Owner name: +5 points
- Bedroom + Bath: +5 points
- Area (land or building): +5 points

**Minimum Completion for Create**:
- Should be able to proceed with any data but score reflects quality
- Final publish button enables all the time (user choice)

## RAW DESCRIPTION PRESERVATION

### TEST 11: No Auto-Rewrite Behavior
**Expected**:
- [ ] User inputs raw description text
- [ ] AI enhancement offers suggestions but doesn't replace
- [ ] Original user text preserved exactly
- [ ] AI suggestions are additive/optional enhancement
- [ ] User can manually edit or accept partial suggestions
- [ ] No automatic reformatting of user input

## ERROR HANDLING & UX

### TEST 12: Graceful Degradation
**Expected Error Handling**:
- [ ] Network failure during save ? Retry mechanism
- [ ] Upload failure ? Progress indication + retry
- [ ] AI service unavailable ? Graceful fallback
- [ ] Permission errors ? Clear messaging + redirect
- [ ] Invalid data ? Field-specific validation messages

### TEST 13: Loading States
**Expected Loading Indicators**:
- [ ] Initial page load with auth check
- [ ] AI Auto-Fill processing
- [ ] Draft saving in progress
- [ ] Property data loading in edit mode
- [ ] Image upload/processing progress
- [ ] Final property creation/update
