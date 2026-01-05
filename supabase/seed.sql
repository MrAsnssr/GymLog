-- Seed data for common exercises

-- Strength exercises - Upper body
INSERT INTO exercises (name, category, muscle_groups, description) VALUES
('Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], 'Flat bench press targeting chest, triceps, and anterior deltoids'),
('Incline Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], 'Inclined bench press targeting upper chest'),
('Decline Bench Press', 'strength', ARRAY['chest', 'triceps'], 'Declined bench press targeting lower chest'),
('Overhead Press', 'strength', ARRAY['shoulders', 'triceps'], 'Standing or seated overhead press'),
('Barbell Row', 'strength', ARRAY['back', 'biceps'], 'Bent-over barbell row targeting lats and rhomboids'),
('Pull-ups', 'strength', ARRAY['back', 'biceps'], 'Bodyweight pull-ups targeting lats and biceps'),
('Chin-ups', 'strength', ARRAY['back', 'biceps'], 'Underhand grip pull-ups'),
('Lat Pulldown', 'strength', ARRAY['back', 'biceps'], 'Machine lat pulldown'),
('Cable Row', 'strength', ARRAY['back', 'biceps'], 'Seated cable row'),
('Dumbbell Flyes', 'strength', ARRAY['chest'], 'Dumbbell flyes for chest isolation'),
('Dumbbell Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], 'Dumbbell bench press'),
('Lateral Raises', 'strength', ARRAY['shoulders'], 'Dumbbell lateral raises for side deltoids'),
('Front Raises', 'strength', ARRAY['shoulders'], 'Dumbbell front raises'),
('Rear Delt Flyes', 'strength', ARRAY['shoulders'], 'Rear deltoid flyes'),
('Bicep Curls', 'strength', ARRAY['biceps'], 'Dumbbell or barbell bicep curls'),
('Hammer Curls', 'strength', ARRAY['biceps', 'forearms'], 'Hammer grip curls'),
('Tricep Dips', 'strength', ARRAY['triceps'], 'Bodyweight or weighted tricep dips'),
('Tricep Pushdowns', 'strength', ARRAY['triceps'], 'Cable tricep pushdowns'),
('Close Grip Bench Press', 'strength', ARRAY['triceps', 'chest'], 'Close grip bench press for triceps'),
('Skull Crushers', 'strength', ARRAY['triceps'], 'Lying tricep extensions');

-- Strength exercises - Lower body
INSERT INTO exercises (name, category, muscle_groups, description) VALUES
('Squats', 'strength', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'Barbell back squats'),
('Front Squats', 'strength', ARRAY['quadriceps', 'glutes', 'core'], 'Front-loaded barbell squats'),
('Leg Press', 'strength', ARRAY['quadriceps', 'glutes'], 'Machine leg press'),
('Romanian Deadlift', 'strength', ARRAY['hamstrings', 'glutes'], 'RDL targeting hamstrings and glutes'),
('Deadlift', 'strength', ARRAY['hamstrings', 'glutes', 'back'], 'Conventional deadlift'),
('Sumo Deadlift', 'strength', ARRAY['hamstrings', 'glutes', 'inner thighs'], 'Wide-stance deadlift'),
('Leg Curls', 'strength', ARRAY['hamstrings'], 'Machine leg curls'),
('Leg Extensions', 'strength', ARRAY['quadriceps'], 'Machine leg extensions'),
('Lunges', 'strength', ARRAY['quadriceps', 'glutes'], 'Walking or stationary lunges'),
('Bulgarian Split Squats', 'strength', ARRAY['quadriceps', 'glutes'], 'Single-leg split squats'),
('Calf Raises', 'strength', ARRAY['calves'], 'Standing or seated calf raises'),
('Hip Thrusts', 'strength', ARRAY['glutes'], 'Barbell or bodyweight hip thrusts'),
('Good Mornings', 'strength', ARRAY['hamstrings', 'glutes', 'back'], 'Barbell good mornings');

-- Strength exercises - Core
INSERT INTO exercises (name, category, muscle_groups, description) VALUES
('Plank', 'strength', ARRAY['core'], 'Static plank hold'),
('Crunches', 'strength', ARRAY['core'], 'Abdominal crunches'),
('Russian Twists', 'strength', ARRAY['core'], 'Rotational core exercise'),
('Leg Raises', 'strength', ARRAY['core'], 'Hanging or lying leg raises'),
('Dead Bug', 'strength', ARRAY['core'], 'Dead bug exercise for core stability'),
('Mountain Climbers', 'strength', ARRAY['core', 'cardio'], 'Dynamic core and cardio exercise'),
('Ab Wheel Rollout', 'strength', ARRAY['core'], 'Ab wheel rollouts'),
('Cable Crunches', 'strength', ARRAY['core'], 'Cable machine crunches');

-- Cardio exercises
INSERT INTO exercises (name, category, muscle_groups, description) VALUES
('Running', 'cardio', ARRAY['legs', 'cardio'], 'Outdoor or treadmill running'),
('Cycling', 'cardio', ARRAY['legs', 'cardio'], 'Stationary or outdoor cycling'),
('Rowing', 'cardio', ARRAY['full body', 'cardio'], 'Rowing machine'),
('Elliptical', 'cardio', ARRAY['full body', 'cardio'], 'Elliptical machine'),
('Stair Climber', 'cardio', ARRAY['legs', 'cardio'], 'Stair climbing machine'),
('Jump Rope', 'cardio', ARRAY['legs', 'cardio'], 'Jump rope exercise'),
('Burpees', 'cardio', ARRAY['full body', 'cardio'], 'Full body burpees'),
('High Intensity Interval Training', 'cardio', ARRAY['full body', 'cardio'], 'HIIT workout');

-- Flexibility exercises
INSERT INTO exercises (name, category, muscle_groups, description) VALUES
('Yoga', 'flexibility', ARRAY['full body'], 'Yoga practice'),
('Stretching', 'flexibility', ARRAY['full body'], 'General stretching routine'),
('Foam Rolling', 'flexibility', ARRAY['full body'], 'Self-myofascial release'),
('Dynamic Warm-up', 'flexibility', ARRAY['full body'], 'Dynamic stretching warm-up'),
('Static Stretching', 'flexibility', ARRAY['full body'], 'Static stretching routine');

-- Other exercises
INSERT INTO exercises (name, category, muscle_groups, description) VALUES
('Farmers Walk', 'other', ARRAY['forearms', 'core', 'traps'], 'Loaded carry exercise'),
('Kettlebell Swings', 'other', ARRAY['glutes', 'hamstrings', 'core'], 'Kettlebell swing exercise'),
('Turkish Get-up', 'other', ARRAY['full body'], 'Complex full-body movement'),
('Battle Ropes', 'other', ARRAY['shoulders', 'core', 'cardio'], 'Battle rope training');


