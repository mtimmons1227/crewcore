-- The NFHS Rulebook/Case Book and Mechanics Manual are distributed by the chapter
-- (via the division rep), not the state body. Retag them so they show the DBOA pill.
UPDATE workflow_step
SET authority = 'chapter'
WHERE name IN ('Receive NFHS Rulebook & Case Book', 'Receive NFHS Mechanics Manual');
