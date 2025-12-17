# Analytics Dashboard Testing Guide

## Quick Start

**Dev Server**: Running on http://localhost:3001 (task ID: b9e9002)
**Test User**: sarah.chen@techcorp.com (auto-login in dev mode)

## Step 1: Hard Refresh Browser

The analytics page needs a hard refresh to load the new middleware code:

- **Mac**: Cmd + Shift + R
- **Windows/Linux**: Ctrl + Shift + R

Navigate to: http://localhost:3001/dashboard/analytics

## Step 2: Visual Verification

### Header Section
- [ ] Organization dropdown shows "TechCorp Solutions"
- [ ] Matrix filter dropdown visible (optional filter)

### KPI Cards (Top Row)
Expected values based on seed data:

- [ ] **Completion Rate**: 0% (all 8 tasks are NOT_STARTED)
- [ ] **Overdue Tasks**: 0
- [ ] **Total Matrices**: 2
- [ ] **Active Members**: 10

### Charts Section

#### Workload Distribution Chart (Bar Chart)
- [ ] Shows 10 member names on X-axis:
  - Sarah Chen, David Kim, Jessica Martinez, Alex Thompson, Priya Patel
  - James Wilson, Sophia Nguyen, Marcus Brown, Olivia Garcia, Ethan Lee
- [ ] Stacked bars with color coding:
  - **Blue** = Responsible
  - **Green** = Accountable
  - **Yellow** = Consulted
  - **Purple** = Informed
- [ ] Hover over bars shows tooltip with exact counts

#### Bottleneck Alerts
- [ ] Shows list of members with >80% workload threshold
- [ ] OR displays "No bottlenecks detected" message
- [ ] Each alert shows member name, total workload, and breakdown by role

#### Task Completion Pie Chart
- [ ] Single segment (100% NOT_STARTED in green)
- [ ] Percentage label shows "100%"
- [ ] Legend shows task status categories
- [ ] Hover shows task counts

#### Responsibility Heatmap
- [ ] Grid layout with:
  - **Rows**: 10 member names
  - **Columns**: 4 RACI roles (R, A, C, I)
- [ ] Cell colors show intensity (darker = more assignments)
- [ ] Hover shows exact count per cell

### Export Section
- [ ] "Download PDF" button visible
- [ ] "Download CSV" button visible

## Step 3: Test Export Functionality

### PDF Export
1. Click "Download PDF" button
2. Verify browser downloads file named similar to: `analytics-TechCorp-Solutions-2025-12-17.pdf`
3. Open PDF and verify:
   - [ ] Contains analytics summary
   - [ ] Includes data tables
   - [ ] Readable formatting

### CSV Export
1. Click "Download CSV" button
2. Verify browser downloads file named similar to: `analytics-TechCorp-Solutions-2025-12-17.csv`
3. Open CSV in Excel/Numbers and verify:
   - [ ] Contains member workload data
   - [ ] Proper column headers
   - [ ] Data matches dashboard charts

## Step 4: Interactive Features

### Organization Selector
1. Click organization dropdown
2. Verify "TechCorp Solutions" is selected
3. (If multiple orgs available) Switch organization and verify data updates

### Matrix Filter
1. Click matrix filter dropdown
2. Verify 2 matrices listed:
   - [ ] "Q1 Mobile App Sprint"
   - [ ] "API v2 Migration Tasks"
3. Select a matrix
4. Verify charts update to show filtered data
5. Clear filter
6. Verify charts show all data again

## Expected Data Summary

Based on seed data (from `scripts/check-analytics-data.ts`):

```
Organization: TechCorp Solutions
├── Members: 10 active
│   ├── Sarah Chen (VP of Engineering - ADMIN)
│   ├── David Kim (Senior Backend Engineer)
│   ├── Jessica Martinez (Frontend Lead)
│   ├── Alex Thompson (DevOps Engineer)
│   ├── Priya Patel (QA Lead)
│   ├── James Wilson (Product Manager)
│   ├── Sophia Nguyen (Product Designer)
│   ├── Marcus Brown (UX Researcher)
│   ├── Olivia Garcia (Operations Manager)
│   └── Ethan Lee (Project Coordinator)
│
├── Matrices: 2
│   ├── Q1 Mobile App Sprint
│   └── API v2 Migration Tasks
│
├── Tasks: 8 (all NOT_STARTED)
│
└── Assignments: 23 total
    ├── Responsible: 9
    ├── Accountable: 8
    ├── Consulted: 6
    └── Informed: 0
```

## Troubleshooting

### Page shows "Loading..." indefinitely
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors (F12 → Console tab)

### Error: "organizationId is required"
- This means hard refresh is needed to load new middleware
- Clear browser cache and try again

### Charts not rendering
- Check browser console for errors
- Verify dev server is still running (check terminal)

### No data showing
- Run verification script: `npx tsx scripts/check-analytics-data.ts`
- Should show 10 members, 2 matrices, 8 tasks, 23 assignments

### Server not responding
- Check if dev server is running: http://localhost:3001
- Restart if needed: `npm run dev`

## Server Logs

Monitor server logs in real-time:
```bash
tail -f /tmp/claude/tasks/b9e9002.output
```

Look for successful analytics queries:
```
GET /api/trpc/analytics.getOrganizationAnalytics,... 200 in XXms
```

## Success Criteria

Analytics dashboard is working correctly when:
- ✅ All KPI cards show correct values
- ✅ All 4 charts render without errors
- ✅ Hover interactions work
- ✅ PDF export downloads valid file
- ✅ CSV export downloads valid file
- ✅ No console errors
- ✅ Data matches expected seed data

## Next Steps After Verification

Once all tests pass:
1. Review `PHASE_3_VERIFICATION.md` for technical details
2. Confirm ready to proceed to Phase 4
3. Phase 4 will implement:
   - User Management (CRUD)
   - Team Member Invitation Flow
   - Organization Settings
   - Role & Permission Management
