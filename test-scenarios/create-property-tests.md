# Create Property - Comprehensive Test Scenarios

## TEST 1: Page Loading & Authorization
**URL**: /properties/create
**Expected**: 
- [ ] Page loads successfully (no 404/500 errors)
- [ ] Auth check redirects to login if not authenticated
- [ ] Role check blocks viewer/reviewer roles with appropriate message
- [ ] CreatePropertyWizard component renders
- [ ] Progress bar shows (Step 1/7)
- [ ] Mobile step indicator displays correctly

**Critical Visual Check**:
- Reduced container padding visible
- Mobile typography scaling works
- Responsive spacing improved

## TEST 2: Step Navigation & Progress
**Testing Order**: Navigate through all 7 steps
**Expected**:
- [ ] Next button works in each step
- [ ] Previous button works (except on step 1)
- [ ] Step indicator updates correctly
- [ ] Desktop sidebar stepper functions
- [ ] Progress bar percentage updates
- [ ] URL doesn't change (single-page app)

**Step Sequence**:
1. Category & Photos ? 2. Specification ? 3. Location ? 4. Facilities ? 5. Price & Description ? 6. Contact ? 7. Review

## TEST 3: AI Auto-Fill Functionality
**Component**: StepCategory & StepPriceDescription
**Expected**:
- [ ] AI Auto-Fill button appears in category selection
- [ ] Magic wand icon functional  
- [ ] Auto-Fill parses raw text input correctly
- [ ] Fills property type, location candidates, description
- [ ] Toast notifications display success
- [ ] No interference with manual data entry

## TEST 4: Draft System Testing
**Test Flow**:
1. Fill partial data in steps 1-3
2. Click Save Draft
3. Refresh page
4. Verify draft restoration banner appears
5. Test Pulihkan Draf functionality
6. Test Buang functionality
7. Verify localStorage key: inland_property_draft

**Expected**:
- [ ] Save draft button disables during save
- [ ] Success toast displays
- [ ] Draft restoration banner shows on refresh
- [ ] Data correctly restored on Pulihkan Draf
- [ ] Draft cleared on Buang

## TEST 5: Region Intelligence Testing  
**Component**: StepLocation
**Expected**:
- [ ] Location search input functional
- [ ] AI candidate suggestions appear
- [ ] Click on candidate transforms to official selection
- [ ] Province/City/District/Village auto-populated
- [ ] Region ID stored correctly
- [ ] Location candidate cleared after official selection

## TEST 6: Full Create Flow
**Complete Test**:
1. Navigate through all 7 steps
2. Fill minimum required data in each step:
   - Step 1: Property type + photos
   - Step 2: Basic specs (bedroom, bathroom)
   - Step 3: Location selected
   - Step 4: At least 1 facility
   - Step 5: Price + description
   - Step 6: Owner contact info
   - Step 7: Review & Publish
3. Submit and verify success

**Expected**:
- [ ] All validation passes
- [ ] Data submits successfully
- [ ] Success redirect occurs
- [ ] No JavaScript errors in console
- [ ] Property count updates

## TEST 7: Mobile Responsive Testing
**Viewport**: 375px width
**Expected**:
- [ ] Stack layout on mobile
- [ ] Touch-optimized button sizes (44px+ height)
- [ ] Readable typography (no text overflow)
- [ ] Sticky action buttons work
- [ ] Mobile step progress bar displays
- [ ] Next/Previous buttons accessible
- [ ] No horizontal scrolling required

## TEST 8: File Upload & Image Processing
**Component**: StepCategory
**Expected**:
- [ ] Multiple photo upload functional
- [ ] Drag & drop works
- [ ] Image compression applied
- [ ] Watermark applied to images
- [ ] Image preview displays correctly
- [ ] Remove/delete images works
- [ ] File size limits enforced

## TEST 9: Form Validation
**Manual Testing Required**:
- [ ] Required field validation per step
- [ ] Email format validation
- [ ] Phone number format validation
- [ ] Price format validation
- [ ] File type validation for uploads
- [ ] File size validation
- [ ] Error messages display correctly

## TEST 10: Performance & UX
**Expected**:
- [ ] Page loads in <3 seconds
- [ ] Step transitions smooth (<300ms)
- [ ] No memory leaks during navigation
- [ ] Accessibility compliance (keyboard nav)
- [ ] ARIA labels present
- [ ] Focus management works
