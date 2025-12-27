-- 1. Get the IDs (We assume the names match what you created)
do $$
declare
  robert_id uuid;
  alina_id uuid;
  sander_id uuid;
  daksh_id uuid;
begin
  select id into robert_id from students where full_name like 'Robert%';
  select id into alina_id from students where full_name like 'Alina%';
  select id into sander_id from students where full_name like 'Sander%';
  select id into daksh_id from students where full_name like 'Daksh%';

  -- 2. Insert the "Original Messages" (The Form Submissions)
  -- Robert
  if robert_id is not null then
    insert into messages (student_id, sender_role, body_text, created_at)
    values (robert_id, 'student', 'I grew up playing as a kid, stopped for 23 years... I just played at my first recital and totally bombed it trying to play your "Still Dre" song. Left hand issues. When can I get a lesson?', now() - interval '6 days');
  end if;

  -- Alina
  if alina_id is not null then
    insert into messages (student_id, sender_role, body_text, created_at)
    values (alina_id, 'student', 'I''ve played music most of my life... My two boys (9 and 6) are inspired to start. Prior music experience includes Tin Whistle.', now() - interval '4 weeks');
  end if;

  -- Sander
  if sander_id is not null then
    insert into messages (student_id, sender_role, body_text, created_at)
    values (sander_id, 'student', 'Hi lionel! ive been playing piano for the last 2 years... I only get 15 min lesson per week. I want to learn theory!', now() - interval '3 weeks');
  end if;

  -- Daksh
  if daksh_id is not null then
    insert into messages (student_id, sender_role, body_text, created_at)
    values (daksh_id, 'student', 'Hello, 10 years going on 11 soon. I live in Dubai... will soon be giving the grade 3 Trinity exam.', now() - interval '1 week');
  end if;

end $$;
