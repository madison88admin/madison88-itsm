-- Fix SLA Performance View to handle NULL values correctly
-- This migration updates the SLA_PERFORMANCE_SUMMARY view to use COALESCE
-- for handling NULL sla_breached values

CREATE OR REPLACE VIEW SLA_PERFORMANCE_SUMMARY AS
    SELECT
        T.PRIORITY,
        COUNT(*)                                                       AS TOTAL_TICKETS,
        SUM(
            CASE
                WHEN COALESCE(T.SLA_BREACHED, FALSE) = FALSE THEN
                    1
                ELSE
                    0
            END)                                                       AS SLA_MET,
        SUM(
            CASE
                WHEN COALESCE(T.SLA_BREACHED, FALSE) = TRUE THEN
                    1
                ELSE
                    0
            END)                                                       AS SLA_BREACHED,
        ROUND(100.0 * SUM(
            CASE
                WHEN COALESCE(T.SLA_BREACHED, FALSE) = FALSE THEN
                    1
                ELSE
                    0
            END) / NULLIF(COUNT(*), 0), 2)                            AS SLA_COMPLIANCE_PERCENT,
        AVG(EXTRACT(EPOCH FROM (T.RESOLVED_AT - T.CREATED_AT)) / 3600) AS AVG_RESOLUTION_HOURS
    FROM
        TICKETS T
    WHERE
        T.STATUS IN ('Resolved', 'Closed')
    GROUP BY
        T.PRIORITY
    ORDER BY
        CASE
            WHEN T.PRIORITY = 'P1' THEN
                1
            WHEN T.PRIORITY = 'P2' THEN
                2
            WHEN T.PRIORITY = 'P3' THEN
                3
            ELSE
                4
        END;

