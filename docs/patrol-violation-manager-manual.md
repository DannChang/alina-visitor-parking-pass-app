# Patrol and Violation Manual for Building Managers

## Purpose

This document explains how a building manager should use patrol mode to:

- look up vehicles in visitor parking
- interpret patrol scan results
- decide when to issue a manual violation
- understand which violations the system may auto-log

It is written for day-to-day operations, not for development work.

## Who this is for

This guide is intended for users with manager-level access to buildings assigned to them.

Managers can:

- open patrol mode
- scan or manually enter a plate
- review recent pass and violation history
- log violations

## What patrol mode does

Patrol mode is the building-side enforcement workflow for checking whether a vehicle is allowed to be parked in visitor parking.

At a high level:

1. Open patrol mode.
2. Scan a plate with the camera or enter it manually.
3. Review the returned vehicle status.
4. Decide whether the result requires action.
5. If needed, log a violation and attach notes or photos.

## How to open patrol mode

1. Sign in with your manager account.
2. Open the dashboard.
3. Navigate to Patrol Mode / Scan Plates.
4. Use the camera scanner or the keyboard icon for manual plate entry.

## How to scan a vehicle

### Camera scan

1. Point the camera at the license plate.
2. Capture the image.
3. Wait for OCR and lookup to finish.
4. Review the result card before taking action.

### Manual lookup

Use manual lookup when:

- the plate is dirty, damaged, or partially obstructed
- lighting makes OCR unreliable
- the camera scan returns the wrong plate

Steps:

1. Tap the keyboard icon.
2. Enter the plate exactly as seen.
3. Submit the lookup.
4. Review the result card.

## How to interpret patrol results

Patrol mode returns one of these statuses.

### `VALID`

Meaning:

- the vehicle has an active pass

Expected action:

- normally no violation

### `EXPIRING_SOON`

Meaning:

- the pass is still valid but close to expiry

Expected action:

- usually no violation
- monitor only if needed

### `IN_GRACE_PERIOD`

Meaning:

- the pass has expired, but the building grace period has not fully elapsed

Expected action:

- do not issue a violation yet unless another separate violation exists

### `EXPIRED`

Meaning:

- the pass expired and the grace period has ended

Expected action:

- enforcement is usually appropriate
- the system may auto-log an expired-pass violation

### `UNREGISTERED`

Meaning:

- the vehicle exists in the system but has no active pass

Expected action:

- enforcement is usually appropriate
- the system may auto-log an unregistered-vehicle violation

### `NOT_FOUND`

Meaning:

- no vehicle record exists for that plate

Expected action:

- verify the plate carefully
- if the plate is correct and the vehicle should be cited, use the manual violation flow

Important:

- a `NOT_FOUND` result does not automatically create a vehicle or a violation

### `BLACKLISTED`

Meaning:

- the vehicle has been flagged internally and should be treated as high risk

Expected action:

- review the blacklist reason immediately
- issue a violation if the current parking situation warrants it
- escalate internally if your building process requires it

### `RESIDENT_IN_VISITOR`

Meaning:

- the vehicle is marked as a resident vehicle but is being checked through visitor enforcement flow

Expected action:

- review the context carefully
- issue a violation only if resident parking rules were actually violated

## Auto-logged violations

The system can create some violations automatically during patrol lookup or scheduled scans.

Current automated cases include:

- `EXPIRED_PASS`
- `UNREGISTERED`
- `OVERSTAY`

Operational notes:

- automated logging only applies when the system already has a real vehicle and pass context
- a lookup miss does not auto-create enforcement records
- duplicate auto-logging is suppressed within a recent time window to reduce repeat citations for the same issue

## How to recognize an auto-logged violation

If the system auto-logs a violation, the patrol result card shows a `Violation Auto-Logged` banner.

When this appears:

- review the violation type and severity shown in the banner
- review recent violations before adding another one
- use `Log Additional Violation` only if a separate issue also exists

Examples:

- expired pass plus blocking a driveway
- unregistered vehicle plus handicap violation

## When to issue a manual violation

Use the manual violation dialog when:

- the system did not auto-log, but a violation is still warranted
- the violation is unrelated to pass status
- the plate was not found but you still need to record an enforcement event
- you need to add location details, notes, or supporting photos

## Manual violation types available

Managers can manually log these violation types:

- `UNREGISTERED`
- `EXPIRED_PASS`
- `OVERSTAY`
- `IMPROPER_PARKING`
- `BLOCKING`
- `RESERVED_SPOT`
- `FRAUDULENT_REGISTRATION`
- `EMERGENCY_LANE_VIOLATION`
- `HANDICAP_VIOLATION`
- `OTHER`

## How to issue a manual violation

1. From the patrol result card, select `Issue Violation`.
2. Confirm the plate shown in the dialog.
3. Choose the correct violation type.
4. Choose the severity.
5. Add location details if helpful.
6. Add a description when the situation needs more context.
7. Keep the scan photo if it supports the record.
8. Add extra photos if needed.
9. Submit the violation.

After success:

- the system stores the violation against the vehicle
- the vehicle risk score and violation count are increased
- the event is added to recent violation history

## How to choose severity

Use severity consistently.

### `LOW`

Use for:

- minor first-time issues
- low-impact pass or registration issues

### `MEDIUM`

Use for:

- standard enforcement events
- unregistered or expired-pass cases without aggravating factors

### `HIGH`

Use for:

- repeated noncompliance
- major access or safety disruption
- significant overstay or improper parking

### `CRITICAL`

Use for:

- severe safety risk
- emergency lane obstruction
- extreme repeat behavior
- cases that require urgent escalation

## Recommended manager workflow

1. Confirm the plate before acting.
2. Read the patrol status, not just the plate match.
3. Review recent violations and risk history.
4. Check whether an auto-logged violation already exists.
5. Add a manual violation only when there is a distinct reason.
6. Record precise location details for anything that may be disputed later.
7. Capture photos whenever visibility, obstruction, or misuse is part of the case.

## Common mistakes to avoid

- issuing a second violation for the exact same condition when one was just auto-logged
- citing a vehicle that is still in grace period
- relying on a bad OCR read without manual confirmation
- using `OTHER` when a specific violation type already fits
- leaving location and description blank for cases that may need review later

## Suggested operating rules

For consistent enforcement across buildings:

- verify every `NOT_FOUND` result with a second look or manual entry
- treat `BLACKLISTED` results as priority reviews
- use manual violations for behavior-based issues such as blocking or improper parking
- document anything involving accessible spaces, emergency lanes, or resident misuse with photos

## Related system behavior

Patrol lookups also show:

- active pass details
- recent passes
- recent violations
- vehicle risk indicators such as prior violation count or elevated risk score

This information should be used to support better enforcement decisions, not to replace confirmation of the current situation in the lot.
