# Mobile Responsive Testing - Property Wizard

## TEST VIEWPORT: 375px width (iPhone SE/standard mobile)

## VISUAL REFINEMENT VERIFICATION

### TEST 1: Container Padding Reduction
**Expected**:
- [ ] Outer container: px-3 sm:px-6 lg:px-8 (reduced from default)
- [ ] Card container: p-3 sm:p-6 lg:p-7 (reduced from larger padding)
- [ ] Top-level spacing: py-2 sm:py-4 space-y-3 sm:space-y-4 (reduced)
- [ ] Visual: Better space utilization on mobile
- [ ] Content not cramped despite reduced padding

### TEST 2: Typography Scaling
**Expected Mobile (375px)**:
- [ ] Main header: text-base sm:text-xl lg:text-2xl
- [ ] Subheader: text-[11px] sm:text-xs lg:text-sm
- [ ] No text overflow or wrapping issues
- [ ] Readable contrast maintained
- [ ] Font weights appropriate for hierarchy

**Verification Steps**:
1. Open property create page on mobile
2. Check header sizes at different breakpoints
3. Verify text remains readable in all steps
4. Test both create and edit modes

### TEST 3: Button Sizing & Hierarchy
**Expected Touch Targets**:
- [ ] Primary buttons: h-10 sm:h-9 (41px min touch target)
- [ ] Secondary buttons: h-10 sm:h-9 
- [ ] Icon buttons: h-9 w-9 (36px minimum)
- [ ] All buttons finger-friendly (not too small)
- [ ] Clear visual hierarchy between button types

**Button Hierarchy Verification**:
- [ ] Primary: bg-emerald-600 hover:bg-emerald-700 text-white
- [ ] Secondary: variant="outline" with proper border
- [ ] Ghost: variant="ghost" for subtle actions
- [ ] Disabled states clearly visible
- [ ] Loading states indicated properly

### TEST 4: Responsive Spacing
**Container Spacing**:
- [ ] Card padding scales: p-3 sm:p-6 lg:p-7
- [ ] Grid gap scales: gap-6 lg:gap-8
- [ ] Button spacing: gap-2 sm:gap-2.5
- [ ] Internal form spacing scales appropriately
- [ ] No double-spacing issues on mobile

### TEST 5: Sticky Action Buttons
**Mobile Sticky Behavior**:
- [ ] Action buttons sticky at bottom on mobile
- [ ] Background: bg-card/95 backdrop-blur
- [ ] Z-index: z-20 (above content)
- [ ] Full width buttons on mobile
- [ ] Scroll behavior smooth

**Expected Layout**:
`
+---------------------+
¦ Header              ¦
+---------------------¦
¦ Content Area        ¦
¦ (scrollable)        ¦
¦                     ¦
¦                     ¦
¦                     ¦
+---------------------¦ <- Sticky Footer
¦ [Previous] [Draft] ¦
¦       [Next]        ¦
+---------------------+
`

## FUNCTIONAL TESTING (Mobile)

### TEST 6: Step Navigation (Mobile)
**Mobile Step Navigation**:
- [ ] Next/Previous buttons accessible without scrolling
- [ ] Mobile step progress bar displays: 1/7, 2/7, etc.
- [ ] Current step label readable
- [ ] Progress bar percentage updates
- [ ] Next step preview text shows

### TEST 7: Form Input Usability
**Mobile Form Controls**:
- [ ] Input fields properly sized for touch
- [ ] Dropdowns/toggles easy to interact with
- [ ] Text areas scrollable if content long
- [ ] Select boxes work well with touch
- [ ] No horizontal scrolling needed

### TEST 8: Image Upload (Mobile)
**Mobile Photo Upload**:
- [ ] Camera integration works (if available)
- [ ] Gallery selection works
- [ ] Drag & drop still functional on touch devices
- [ ] Image preview displays properly
- [ ] Remove/manage images easy on mobile

### TEST 9: Desktop Compatibility Check
**Breakpoint Testing**:
- [ ] 1440px+ (XL): 3-column layout with sidebar
- [ ] 1024-1439px (LG): 2-column layout  
- [ ] 768-1023px (MD): Stacked with mobile stepper
- [ ] 320-767px (SM): Mobile layout as specified

### TEST 10: Accessibility (Mobile)
**Touch Accessibility**:
- [ ] Minimum 44px touch targets (iOS/Android guidelines)
- [ ] Proper focus indicators
- [ ] Screen reader compatibility
- [ ] Keyboard navigation on external keyboard
- [ ] Good color contrast ratios

## BROWSER COMPATIBILITY
**Test Requirements**:
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Chrome Desktop
- [ ] Firefox Desktop
- [ ] Edge Desktop (if supported)

## PERFORMANCE (Mobile)
**Expected Mobile Performance**:
- [ ] Page load < 5 seconds on 3G
- [ ] Smooth scrolling and animations
- [ ] No layout shift during loading
- [ ] Images load progressively
- [ ] JavaScript execution responsive
