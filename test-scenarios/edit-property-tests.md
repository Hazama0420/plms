# Edit Property - Comprehensive Test Scenarios

## TEST 1: Edit Page Loading & Authorization
**URL Pattern**: /properties/{id}/edit
**Expected**: 
- [ ] Page loads successfully with valid property ID
- [ ] 404 error for invalid property ID
- [ ] Auth check redirects to login if not authenticated
- [ ] Role check allows: super_admin, admin, agent (owner), blocks: reviewer, other agents
- [ ] Proper error message for unauthorized access
- [ ] CreatePropertyWizard renders in edit mode
- [ ] Property data loads into form correctly

## TEST 2: Data Transformation & Loading
**Expected**:
- [ ] Existing property data maps correctly to wizard form
- [ ] Photo gallery displays existing images properly
- [ ] Media preservation works (no accidental deletion)
- [ ] Location data loads and displays correctly
- [ ] Price information displays formatted
- [ ] Contact owner data loads
- [ ] Specification fields populate
- [ ] Facilities checkbox states correct

## TEST 3: Edit Mode Specific Features
**Expected**:
- [ ] Title shows "Edit Data Properti" instead of "Tambah Properti Baru"
- [ ] StepReview shows "Update Properti" button instead of "Publikasikan"
- [ ] Success message shows "Property berhasil diupdate!" on completion
- [ ] After success, redirects to /properties (not create)
- [ ] No draft restoration banner (edit mode ignores drafts)

## TEST 4: Media Management (Edit Mode)
**Testing**:
1. Existing images display correctly
2. Add new images alongside existing ones
3. Delete some existing images
4. Verify new images don't replace existing ones
5. Test image replacement workflow

**Expected**:
- [ ] Existing images labeled as "existing"
- [ ] New uploads properly distinguished
- [ ] Delete functionality works for existing images
- [ ] No data loss on save
- [ ] Image count updated correctly

## TEST 5: Permission Testing
**Test Cases**:
1. **Admin/Super Admin**: Can edit any property
2. **Property Owner (Agent)**: Can edit their own properties
3. **Viewer Account**: Should be blocked with appropriate message
4. **Reviewer Account**: Should be blocked with appropriate message  
5. **Other Agent**: Should be blocked from editing properties owned by different agent

**Expected Results**:
- [ ] Proper role checking occurs server-side
- [ ] Appropriate error messages display
- [ ] Redirects to property details if unauthorized
- [ ] No sensitive data exposure in unauthorized attempts

## TEST 6: Data Integrity Testing
**Testing**:
1. Load existing property with full data
2. Modify data in various steps
3. Verify changes persist on save
4. Test partial updates (edit only some fields)
5. Verify unchanged data remains intact

**Expected**:
- [ ] Only modified fields update
- [ ] Unchanged data preserved
- [ ] No data corruption occurs
- [ ] Complex nested objects handle correctly
- [ ] Array data (facilities, photos) update properly

## TEST 7: Location Intelligence (Edit Mode)
**Expected**:
- [ ] Existing location data displays in location fields
- [ ] Region ID and names load correctly
- [ ] Location search still functional for updates
- [ ] Can change location completely
- [ ] AI candidate system works for location changes
- [ ] Location validation still enforced

## TEST 8: Rollback & Error Handling
**Testing**:
1. Make changes and save
2. Verify save success
3. Test save failure scenarios
4. Verify rollback on error
5. Test network interruption handling

**Expected**:
- [ ] Changes persist on successful save
- [ ] Proper error handling for save failures
- [ ] No data loss on rollback
- [ ] User feedback for success/failure
- [ ] Retry mechanisms work if applicable

## TEST 9: Performance Testing
**Expected**:
- [ ] Page load time acceptable (<4 seconds for properties with many images)
- [ ] Edit form responsiveness maintained
- [ ] Image loading optimized
- [ ] No memory leaks with large property data
- [ ] Step navigation remains smooth

## TEST 10: Cross-Feature Testing
**Testing**:
1. Edit property then create new property
2. Verify no cross-contamination of data
3. Test draft system doesn't interfere with edit mode
4. Verify authorization changes affect both modes properly
5. Test concurrent editing scenarios

**Expected**:
- [ ] No data mixing between create/edit modes
- [ ] Draft system isolated to create mode
- [ ] Authorization consistent across features
- [ ] Proper session management
