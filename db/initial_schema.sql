-- Run this in Supabase SQL Editor

-- 1. THE STUDENT PROFILE
create table students (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  full_name text not null,
  email text unique not null,
  country_code text,
  instructor_strategy text, -- The "Context Box"
  tags text[] default '{}',
  last_contacted_at timestamp with time zone,
  status text check (status in ('new', 'active', 'archived')) default 'new'
);

-- 2. THE CHAT MESSAGES
create table messages (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id) on delete cascade,
  sender_role text check (sender_role in ('student', 'instructor')),
  body_text text not null,
  created_at timestamp with time zone default now()
);

-- 3. INSERT MOCK DATA (So your UI isn't empty)
insert into students (full_name, email, country_code, instructor_strategy, tags, last_contacted_at, status)
values 
('Robert Alconcel', 'robert@email.com', 'US', 'Sensitive about rhythm. Focus on positive reinforcement.', ARRAY['Adult Learner', 'Jazz'], now() - interval '6 days', 'active'),
('Alina Hanson', 'alina@email.com', 'US', 'Mom with two kids. Logistics are key.', ARRAY['Parent', 'Beginner'], now() - interval '4 weeks', 'active');
