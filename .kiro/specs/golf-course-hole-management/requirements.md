# Requirements Document

## Introduction

This feature covers the full lifecycle management of golf holes within a golf course in the Pondokcabe golf tournament platform. A golf course (`golf_courses`) contains between 9 and 18 holes (`golf_holes`), each with its own par value, handicap stroke index, tee distances (by colour), and optional metadata. The feature enables administrators to add, edit, and delete individual holes, and automatically derives aggregate course statistics — total par, total yardage per tee colour, and slope rating — from the hole data. The system is built on a React + Convex stack with role-based access control.

## Glossary

- **Course**: A `golf_courses` document representing a golf facility with a defined number of holes (9 or 18).
- **Hole**: A `golf_holes` document representing a single hole within a course, identified by its `holeNumber` (1–18).
- **Par**: The expected number of strokes for a scratch golfer to complete a hole or the entire course. Valid hole par values are 3, 4, or 5.
- **Stroke Index (SI)**: The handicap difficulty ranking of a hole within a course, expressed as an integer from 1 (hardest) to 18 (easiest). Each hole in a course must have a unique stroke index.
- **Tee**: A coloured starting position on a hole. Supported tee colours are Black, Blue, White, Yellow, and Red.
- **Tee Distance**: The distance in metres from a specific tee to the hole's green.
- **Total Yardage**: The sum of tee distances across all holes for a given tee colour on a course.
- **Course Par**: The sum of par values across all holes in a course.
- **Course Rating**: A decimal number representing the expected score for a scratch golfer on the course under normal conditions.
- **Slope Rating**: An integer (55–155) representing the relative difficulty of a course for a bogey golfer compared to a scratch golfer. Calculated from Course Rating and Bogey Rating.
- **Bogey Rating**: The expected score for a bogey golfer (handicap ~20 for men, ~24 for women) on the course.
- **Hole_Manager**: The system component responsible for creating, updating, and deleting hole records.
- **Course_Aggregator**: The system component responsible for computing and persisting derived course statistics (Course Par, Total Yardage, Slope Rating) from hole data.
- **Admin**: A user with role `super_admin`, `club_admin`, or `tournament_admin` who is authorised to manage holes for a course.

---

## Requirements

### Requirement 1: Add a Hole

**User Story:** As an Admin, I want to add a new hole to a course, so that the course's hole roster is complete and accurate.

#### Acceptance Criteria

1. WHEN an Admin submits a valid add-hole request for a course, THE Hole_Manager SHALL create a new `golf_holes` document with the provided `holeNumber`, `par`, and `strokeIndex` values and return the new document's ID.
2. WHEN an Admin submits an add-hole request, THE Hole_Manager SHALL reject the request if the referenced `courseId` does not correspond to an existing `golf_courses` document, and SHALL return an error message indicating the reason for rejection.
3. WHEN an Admin submits an add-hole request, THE Hole_Manager SHALL reject the request if a hole with the same `holeNumber` already exists in the same course, and SHALL return an error message indicating the reason for rejection.
4. WHEN an Admin submits an add-hole request, THE Hole_Manager SHALL reject the request if `par` is not one of the values 3, 4, or 5, and SHALL return an error message indicating the reason for rejection.
5. WHEN an Admin submits an add-hole request, THE Hole_Manager SHALL reject the request if `strokeIndex` is not an integer between 1 and 18 inclusive, and SHALL return an error message indicating the reason for rejection.
6. WHEN an Admin submits an add-hole request, THE Hole_Manager SHALL reject the request if `strokeIndex` is already assigned to another hole in the same course, and SHALL return an error message indicating the reason for rejection.
7. WHEN an Admin submits an add-hole request, THE Hole_Manager SHALL reject the request if `holeNumber` is not an integer between 1 and the course's `totalHoles` value inclusive, and SHALL return an error message indicating the reason for rejection.
8. IF tee distance fields (distanceBlack, distanceBlue, distanceWhite, distanceYellow, distanceRed) are provided, THEN THE Hole_Manager SHALL reject the request if any provided distance is not a positive integer between 1 and 999 inclusive, and SHALL return an error message indicating the reason for rejection.
9. WHEN a hole is successfully created, THE Course_Aggregator SHALL recalculate and update the course's `par` field to reflect the new total.
10. IF the Course_Aggregator fails to update the course's `par` field after a successful hole creation, THEN THE Hole_Manager SHALL return an error to the caller and the hole creation SHALL be rolled back so no partial state is persisted.

---

### Requirement 2: Edit a Hole

**User Story:** As an Admin, I want to edit an existing hole's data, so that I can correct mistakes or update course information.

#### Acceptance Criteria

1. WHEN an Admin submits a valid update for an existing hole, THE Hole_Manager SHALL apply the changes to the `golf_holes` document — limited to `par`, `strokeIndex`, and tee distance fields — and persist them atomically, rejecting the entire update if any field fails validation.
2. IF an Admin submits an update referencing a `holeId` that does not correspond to an existing `golf_holes` document, THEN THE Hole_Manager SHALL reject the update and SHALL return an error message indicating the hole was not found.
3. WHEN an Admin submits an update that changes `par`, THE Hole_Manager SHALL reject the update if the new `par` value is not one of 3, 4, or 5, and SHALL return an error message indicating the reason for rejection.
4. WHEN an Admin submits an update that changes `strokeIndex`, THE Hole_Manager SHALL reject the update if the new value is not an integer between 1 and 18 inclusive, and SHALL return an error message indicating the reason for rejection.
5. WHEN an Admin submits an update that changes `strokeIndex`, THE Hole_Manager SHALL reject the update if the new value is already assigned to a different hole in the same course, and SHALL return an error message indicating the reason for rejection.
6. IF a tee distance field is updated, THEN THE Hole_Manager SHALL reject the update if the new distance value is not a positive integer between 1 and 999 inclusive, and SHALL return an error message indicating the reason for rejection.
7. IF a tee distance field is set to null or removed, THEN THE Hole_Manager SHALL clear that distance value from the hole record.
8. WHEN a hole's `par` is successfully updated, THE Course_Aggregator SHALL recalculate and update the course's `par` field.
9. WHEN a hole update succeeds in full, THE Course_Aggregator SHALL recalculate the total distance in metres for any affected tee colour and persist the updated value.
10. IF the update is rejected due to any validation failure, THEN THE Course_Aggregator SHALL NOT recalculate yardage and the hole record SHALL remain unchanged.

---

### Requirement 3: Delete a Hole

**User Story:** As an Admin, I want to delete a hole from a course, so that I can remove incorrectly created records.

#### Acceptance Criteria

1. WHEN an Admin requests deletion of a hole, THE Hole_Manager SHALL permanently remove the `golf_holes` document from the database.
2. IF an Admin requests deletion of a `holeId` that does not correspond to an existing `golf_holes` document, THEN THE Hole_Manager SHALL reject the request and SHALL return an error message indicating the hole was not found.
3. IF a hole is referenced by one or more `scorecard_holes` documents, THEN THE Hole_Manager SHALL reject the deletion, SHALL leave the hole record and all `scorecard_holes` references unchanged, and SHALL return an error message indicating the hole is in use.
4. WHEN a hole is successfully deleted, THE Course_Aggregator SHALL recalculate and update the course's `par` field by computing the sum of the `par` values of all remaining `golf_holes` documents for that course.
5. WHEN a hole is successfully deleted, THE Hole_Manager SHALL NOT delete or modify any other holes in the same course.
6. WHEN a hole is successfully deleted, THE Hole_Manager SHALL NOT re-sequence the `holeNumber` or `strokeIndex` values of the remaining holes in the course.

---

### Requirement 4: Tee Distance Management

**User Story:** As an Admin, I want to record and update distances for each tee colour on a hole, so that players and tournament organisers have accurate yardage information.

#### Acceptance Criteria

1. THE Hole_Manager SHALL support recording distances for up to five tee colours per hole: Black, Blue, White, Yellow, and Red.
2. WHEN an Admin provides a tee distance, THE Hole_Manager SHALL store the value in metres as a positive integer between 1 and 999 inclusive.
3. WHEN an Admin omits a tee colour distance, THE Hole_Manager SHALL store that tee colour's distance as absent (null/undefined) for the hole.
4. IF an Admin submits a tee distance value that is not a positive integer between 1 and 999 inclusive, THEN THE Hole_Manager SHALL reject the submission and SHALL return an error message indicating the reason for rejection.
5. WHEN all holes in a course have a distance recorded for a given tee colour, THE Course_Aggregator SHALL compute the total distance in metres for that tee colour as the sum of all hole distances for that colour.
6. WHEN at least one hole in a course is missing a distance for a given tee colour, THE Course_Aggregator SHALL treat the total distance for that tee colour as incomplete, SHALL display an incomplete marker for that tee colour in the course summary, and SHALL omit a numeric total for that tee colour.

---

### Requirement 5: Course Total Par Calculation

**User Story:** As an Admin, I want the course's total par to be automatically calculated from its holes, so that the course record is always consistent with the hole data.

#### Acceptance Criteria

1. WHEN any hole belonging to a course is added, updated, or deleted, THE Course_Aggregator SHALL recalculate the course's total par as the sum of the `par` values of all `golf_holes` documents with a matching `courseId`.
2. WHEN a course has no holes, THE Course_Aggregator SHALL set the course's `par` field to 0.
3. THE Course_Aggregator SHALL update the course's `par` field within the same database transaction as the hole mutation that triggered the recalculation.
4. IF any part of the transaction fails, THEN THE Course_Aggregator SHALL roll back both the hole mutation and the par update so no partial state is persisted.
5. WHEN the Course_Aggregator computes the course total par, it SHALL only sum `par` values from holes where `par` is a valid value (3, 4, or 5).
6. IF a `golf_holes` document contains a `par` value outside the range 3–5, THEN THE Course_Aggregator SHALL exclude that hole from the total par calculation and SHALL log a data integrity warning.
7. THE stored `par` field on a `golf_courses` document SHALL equal the sum of the `par` values of all valid `golf_holes` documents with a matching `courseId` (consistency invariant).

---

### Requirement 6: Slope Rating Calculation

**User Story:** As an Admin, I want the course's slope rating to be automatically calculated when I provide the bogey rating, so that handicap calculations for tournaments are accurate.

#### Acceptance Criteria

1. WHEN an Admin submits a course mutation with both `courseRating` and `bogeyRating` present, THE Course_Aggregator SHALL calculate `slopeRating` using the standard USGA formula: `slopeRating = round(5.381 * (bogeyRating - courseRating))`.
2. WHEN the calculated `slopeRating` is less than 55, THE Course_Aggregator SHALL set `slopeRating` to 55.
3. WHEN the calculated `slopeRating` is greater than 155, THE Course_Aggregator SHALL set `slopeRating` to 155.
4. IF `courseRating` is not present or `bogeyRating` is not present in the mutation, THEN THE Course_Aggregator SHALL leave `slopeRating` at its current persisted value, or absent if it has never been set, and SHALL not perform a calculation.
5. IF `bogeyRating` is less than or equal to `courseRating`, THEN THE Course_Aggregator SHALL reject the mutation and SHALL return an error message indicating that `bogeyRating` must be greater than `courseRating`.
6. WHEN `slopeRating` is successfully calculated, THE Course_Aggregator SHALL persist the value to the `golf_courses` document and the mutation SHALL return the persisted `slopeRating` value to the caller.
7. IF the database write for `slopeRating` fails, THEN THE Course_Aggregator SHALL log the persistence failure and the mutation SHALL return an error to the caller indicating the write failed.

---

### Requirement 7: Hole List Display

**User Story:** As an Admin, I want to view all holes for a course in a structured list, so that I can quickly assess the completeness and accuracy of hole data.

#### Acceptance Criteria

1. WHEN an Admin navigates to the holes management page for a course, THE system SHALL display all `golf_holes` documents for that course sorted by `holeNumber` in ascending order.
2. WHILE the holes management page is displayed, THE system SHALL show for each hole: `holeNumber`, `par`, `strokeIndex`, and all available tee distances ordered alphabetically by tee colour name (Black, Blue, Red, White, Yellow).
3. WHILE the holes management page is displayed, THE system SHALL show a summary bar containing: the total number of holes registered, the total course par, the count of holes with at least one tee distance recorded, and the count of holes with an image.
4. WHEN the number of registered holes is less than the course's `totalHoles`, THE system SHALL display a dismissible prompt offering to bulk-create the missing holes with a default par of 4; this prompt SHALL reappear on page reload while the condition persists.
5. IF a hole has at least one tee distance recorded, THEN THE system SHALL render a filled badge labeled "Complete" for that hole.
6. IF a hole has no tee distances recorded, THEN THE system SHALL render an outlined badge labeled "Incomplete" for that hole.

---

### Requirement 8: Bulk Hole Creation

**User Story:** As an Admin, I want to bulk-create all missing holes for a course with default values, so that I can quickly scaffold the hole roster before filling in details.

#### Acceptance Criteria

1. WHEN an Admin triggers bulk hole creation for a course, THE Hole_Manager SHALL create one `golf_holes` document for each hole number from 1 to the course's `totalHoles` value that does not already have a `golf_holes` document with a matching `courseId` and `holeNumber`.
2. WHEN bulk-creating holes, THE Hole_Manager SHALL assign a default `par` of 4 to each new hole.
3. WHEN bulk-creating holes, THE Hole_Manager SHALL assign a default `strokeIndex` equal to the hole's `holeNumber` to each new hole.
4. WHEN bulk hole creation completes, THE Course_Aggregator SHALL recalculate the course's `par` field as the sum of the `par` values of all `golf_holes` documents belonging to that course and persist the updated value.
5. IF any individual hole creation fails during bulk creation, THEN THE Hole_Manager SHALL continue creating the remaining holes and SHALL return a response identifying the `holeNumber` of each hole that failed to be created.
6. IF the course's `totalHoles` value is 0, THEN THE Hole_Manager SHALL complete the bulk creation operation without creating any documents and SHALL return a response indicating that no holes were created.

---

### Requirement 9: Access Control

**User Story:** As a system operator, I want hole management operations to be restricted to authorised users, so that course data integrity is maintained.

#### Acceptance Criteria

1. IF an authenticated user holds neither the `club_admin` nor the `super_admin` role and attempts to add, edit, or delete a hole, THEN THE Hole_Manager SHALL reject the request and SHALL return an authorisation error.
2. WHILE a user is authenticated with the `club_admin` role, THE Hole_Manager SHALL only permit that user to manage holes for courses associated with their `clubId`.
3. WHEN a `club_admin` attempts to add, edit, or delete a hole for a course whose `clubId` does not match the user's `clubId`, THE Hole_Manager SHALL reject the request and SHALL return an authorisation error.
4. WHILE a user is authenticated with the `super_admin` role, THE Hole_Manager SHALL permit that user to manage holes for any course.
5. IF an unauthenticated request is made to any hole mutation, THEN THE Hole_Manager SHALL reject the request with an authentication error.
