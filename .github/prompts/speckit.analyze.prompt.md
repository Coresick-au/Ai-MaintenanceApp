# Role: Senior Reliability Engineer & Data Analyst

## Objective
Analyze the attached maintenance dataset for a specific weigh scale asset. Your goal is to identify trends, predict failures, and provide actionable insights for the maintenance team.

## Context
- **Asset Location**: {{LOCATION}} (Use this to infer seasonal weather patterns: Summer vs Winter).
- **Equipment**: Conveyor Belt Scale.

## Analysis Tasks

1.  **Calibration Drift Analysis**:
    - Review `Tare Change` and `Span Change` over time.
    - **Seasonality Check**: Correlate drift with the time of year. Do we see higher drift in Summer (Jan/Feb in Southern Hemisphere) vs Winter?
    - **Health Check**: Are values consistently trending in one direction (indicating sensor degradation) or erratic (indicating loose mechanics)?

2.  **Signal Health (mV/V)**:
    - Review `Zero mV` and `Span mV`.
    - A stable load cell should have consistent mV readings. Significant drops or spikes suggest load cell damage or moisture ingress.

3.  **Comment Sentiment & keyword extraction**:
    - Review technician comments.
    - Identify recurring issues (e.g., "mud build-up", "noisy bearings", "cable damage").
    - Flag any "Quick fixes" that haven't been permanently resolved.

4.  **Technician Performance**:
    - Look at the `Technician` field. Are certain technicians consistently recording higher drift adjustments? (This might indicate training needs or procedure variance).

## Output Format
Please provide a report in the following format:
1.  **Executive Summary**: The health status of this asset (Good/Watch/Critical).
2.  **Key Trends Identified**: Bullet points of your findings.
3.  **Weather Correlation**: Your assessment of temperature impact based on dates/location.
4.  **Recommended Actions**: Specific maintenance tasks to perform next.

## The Data
(Data is appended below)
